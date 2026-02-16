import {inngest} from '../client'
import {sanityWrite} from '@/lib/sanity-write'
import {generateWithDeepSeek, parseJsonResponse} from '@/lib/ai'
import {searchProductInfo} from '@/lib/brave-search'
import {createJobLogger} from '@/lib/logger'

const logger = createJobLogger('generate-post-content')

interface PostWithData {
  _id: string
  _rev: string
  title: string
  product: {
    _id: string
    name: string
    asin: string
  }
  scrapes: Array<{
    _id: string
    scrapedAt: string
    rawData: string
    brand?: string
  }>
}

interface GeneratedContent {
  title: string
  slug: string
  excerpt: string
  content: string
}

const SYSTEM_PROMPT = `You are a product review content generator. Your task is to analyze the provided product data and create a comprehensive blog post review.

Your response MUST be valid JSON with these exact fields:
1. title: An engaging, SEO-friendly title for the review post
2. slug: A URL-friendly slug (lowercase, hyphens, no special characters)
3. excerpt: A compelling 1-2 sentence summary (150-200 characters)
4. content: A detailed review in plain text format (500-1000 words) covering features, benefits, use cases, and value

Write in an informative, helpful tone. Focus on practical insights that help readers make informed decisions.

IMPORTANT: Return ONLY valid JSON, no markdown formatting or code blocks.`

/**
 * Generate content (title, excerpt, content) for a draft post using AI.
 * This is step 2 of the post creation pipeline.
 *
 * Chain: create-post-draft → (post.draft.created) → generate-post-content → (post.content.generated) → enhance-post
 */
export const generatePostContent = inngest.createFunction(
  {
    id: 'generate-post-content',
    name: 'Generate Post Content',
    concurrency: {limit: 1},
    retries: 3,
  },
  [
    {event: 'job/generate-post-content'},
    {event: 'post.draft.created'}, // Chained from create-post-draft
  ],
  async ({event, step}) => {
    const postId = event?.data?.postId

    if (!postId) {
      logger.error({}, 'No postId provided')
      return {success: false, error: 'postId is required'}
    }

    logger.info({postId}, 'Starting content generation job')

    // Step 1: Fetch post with product and scrape data
    const postData = await step.run('fetch-post-data', async () => {
      return await sanityWrite.fetch<PostWithData | null>(
        `*[_type == "post" && _id == $postId][0] {
          _id,
          _rev,
          title,
          product->{
            _id,
            name,
            asin
          },
          scrapes[]->{
            _id,
            scrapedAt,
            rawData,
            brand
          }
        }`,
        {postId},
      )
    })

    if (!postData || !postData.product) {
      logger.error({postId}, 'Post not found or missing product reference')
      return {success: false, postId, error: 'Post not found or missing product'}
    }

    const latestScrape = postData.scrapes?.[0]
    if (!latestScrape) {
      logger.error({postId}, 'Post has no associated scrape data')
      return {success: false, postId, error: 'No scrape data available'}
    }

    logger.info(
      {postId, productId: postData.product._id, asin: postData.product.asin},
      'Generating content for post',
    )

    // Step 2: Research product via Brave Search
    const research = await step.run('research-product', async () => {
      try {
        const results = await searchProductInfo(postData.product.name, latestScrape.brand)
        if (results.length > 0) {
          return results
            .slice(0, 5)
            .map((r) => `- ${r.title}: ${r.description}`)
            .join('\n')
        }
        return ''
      } catch (error) {
        logger.warn({error}, 'Failed to fetch research context')
        return ''
      }
    })

    // Step 3: Generate content with DeepSeek
    const generatedContent = await step.run('generate-content', async () => {
      const researchContext = research ? `\n\nAdditional Research:\n${research}` : ''

      const prompt = `Product Data:
Product Name: ${postData.product.name}
ASIN: ${postData.product.asin}

Raw Product Data:
${latestScrape.rawData}${researchContext}`

      const response = await generateWithDeepSeek(prompt, {
        systemPrompt: SYSTEM_PROMPT,
        maxTokens: 2000,
        temperature: 0.7,
      })

      return parseJsonResponse<GeneratedContent>(response)
    })

    // Validate required fields
    if (!generatedContent.title || !generatedContent.slug || !generatedContent.content) {
      logger.error({generatedContent}, 'Generated content missing required fields')
      return {success: false, postId, error: 'Generated content missing fields'}
    }

    // Step 4: Update post with generated content
    await step.run('update-post', async () => {
      const now = Date.now()

      await sanityWrite
        .patch(postId)
        .ifRevisionId(postData._rev)
        .set({
          title: generatedContent.title,
          slug: {
            _type: 'slug',
            current: generatedContent.slug,
          },
          excerpt: generatedContent.excerpt,
          content: [
            {
              _type: 'block',
              _key: `block-${now}`,
              style: 'normal',
              children: [
                {
                  _type: 'span',
                  text: generatedContent.content,
                  _key: `span-${now}`,
                },
              ],
              markDefs: [],
            },
          ],
        })
        .commit()

      logger.info({postId, title: generatedContent.title}, 'Post content updated successfully')
    })

    // Step 5: Wait for Sanity to index the updated document
    await step.sleep('wait-for-indexing', '10s')

    // Step 6: Trigger enhancement (image injection)
    await step.sendEvent('trigger-enhancement', {
      name: 'post.content.generated',
      data: {
        postId: postId,
        productId: postData.product._id,
      },
    })

    return {
      success: true,
      postId,
      productId: postData.product._id,
      title: generatedContent.title,
    }
  },
)
