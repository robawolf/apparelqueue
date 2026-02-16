import {inngest} from '../client'
import {sanityWrite} from '@/lib/sanity-write'
import {sendDraftPostNotification} from '@/lib/telegram'
import {createJobLogger} from '@/lib/logger'
import {generateWithOpenRouter, parseJsonResponse} from '@/lib/ai'

const logger = createJobLogger('enhance-post')

// Get niche from environment for context-aware content
const niche = process.env.NICHE || 'travel gear'

// ============================================================================
// Type Definitions
// ============================================================================

interface PostBlock {
  _type: string
  _key: string
  style?: string
  listItem?: string
  level?: number
  children?: Array<{
    _type: string
    _key: string
    text: string
    marks?: string[]
  }>
  markDefs?: Array<unknown>
}

interface ProductImageBlock {
  _type: 'productImage'
  _key: string
  product: {
    _type: 'reference'
    _ref: string
  }
  size: 'small' | 'medium' | 'large'
  alignment: 'left' | 'center' | 'right'
  showLink: boolean
  variantIndex: number
}

type PortableTextBlock = PostBlock | ProductImageBlock

interface ScrapeData {
  _id: string
  scrapedAt?: string
  title?: string
  brand?: string
  features?: string[]
  specifications?: {
    items?: Array<{label?: string; value?: string}>
  }
  price?: {
    amount?: number
    currency?: string
  }
  rating?: {
    average?: number
    count?: number
  }
  rawData?: string
}

interface PostToEnhance {
  _id: string
  _rev: string
  title: string
  slug: {
    current: string
  }
  content: PostBlock[]
  product: {
    _id: string
    asin: string
    name: string
    brand?: string
    paApiVariantImageUrls?: string[]
  }
  author?: {
    _id: string
    firstName?: string
    lastName?: string
    preferredAiModel?: {
      modelId: string
      name?: string
    }
  }
  scrapes?: ScrapeData[]
}

// AI Response Types
interface AIContentSection {
  type: 'heading' | 'paragraph' | 'bulletList' | 'productImage'
  style?: 'h2'
  content?: string
  items?: string[]
}

interface AIContentResponse {
  sections: AIContentSection[]
}

// ============================================================================
// System Prompt
// ============================================================================

const SYSTEM_PROMPT = `You are an expert product reviewer writing for a ${niche} blog. Your reviews are helpful, honest, and feel genuinely human-written.

WRITING STYLE:
- Conversational but informative - like a knowledgeable friend giving advice
- Varied sentence lengths (mix short punchy sentences with longer explanatory ones)
- Use personal observations ("I found that...", "What stood out to me...", "In my experience...")
- Include practical use cases and real-world scenarios
- Be balanced - mention both strengths and limitations honestly
- Avoid marketing speak, buzzwords, and hyperbole
- Write with genuine enthusiasm where appropriate, but never fake it

STRUCTURE REQUIREMENTS:
Return valid JSON with this exact structure:
{
  "sections": [
    { "type": "paragraph", "content": "Engaging intro paragraph that hooks the reader..." },
    { "type": "productImage" },
    { "type": "heading", "style": "h2", "content": "What Makes It Stand Out" },
    { "type": "paragraph", "content": "Discussion of key features..." },
    { "type": "bulletList", "items": ["Key point 1", "Key point 2", "Key point 3"] },
    { "type": "productImage" },
    { "type": "heading", "style": "h2", "content": "The Verdict" },
    { "type": "paragraph", "content": "Final thoughts and recommendation..." }
  ]
}

IMAGE PLACEMENT RULES:
- Include 2-3 productImage blocks throughout the content
- First image: After the intro, before diving into details
- Second image: After discussing key features, in the middle section
- Third image (optional): Near the conclusion if content is long

SECTION TYPES:
- "heading": Use style "h2" only. Keep titles short and descriptive (3-6 words).
- "paragraph": 2-4 sentences each. Varied lengths. Include personal insights.
- "bulletList": 3-6 items maximum. Each item should be concise but informative.
- "productImage": Just include { "type": "productImage" } - no other fields needed.

CONTENT GUIDELINES:
- Aim for 8-15 total sections for comprehensive coverage
- Every paragraph should add value - no filler content
- Focus on what makes this product useful for the reader
- Address who this product is best for

CRITICAL:
- Return ONLY valid JSON, no markdown code blocks or explanations
- Do not wrap the response in \`\`\`json or any other formatting`

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique key for a Portable Text block
 */
function generateKey(prefix: string, timestamp: number, index: number): string {
  return `${prefix}-${timestamp}-${index}`
}

/**
 * Create a heading block (h2)
 */
function createHeadingBlock(text: string, key: string): PostBlock {
  return {
    _type: 'block',
    _key: key,
    style: 'h2',
    children: [
      {
        _type: 'span',
        _key: `${key}-span`,
        text,
        marks: [],
      },
    ],
    markDefs: [],
  }
}

/**
 * Create a paragraph block
 */
function createParagraphBlock(text: string, key: string): PostBlock {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    children: [
      {
        _type: 'span',
        _key: `${key}-span`,
        text,
        marks: [],
      },
    ],
    markDefs: [],
  }
}

/**
 * Create a bullet list item block
 */
function createBulletBlock(text: string, key: string): PostBlock {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    listItem: 'bullet',
    level: 1,
    children: [
      {
        _type: 'span',
        _key: `${key}-span`,
        text,
        marks: [],
      },
    ],
    markDefs: [],
  }
}

/**
 * Create a product image block
 */
function createProductImageBlock(
  productId: string,
  key: string,
  size: 'small' | 'medium' | 'large' = 'large',
  variantIndex: number = 0,
): ProductImageBlock {
  return {
    _type: 'productImage',
    _key: key,
    product: {
      _type: 'reference',
      _ref: productId,
    },
    size,
    alignment: 'center',
    showLink: true,
    variantIndex,
  }
}

/**
 * Transform AI response sections into Portable Text blocks
 * @param sections - AI-generated content sections
 * @param productId - Product document ID for image references
 * @param variantCount - Number of variant images available (0 if none)
 */
function transformToPortableText(
  sections: AIContentSection[],
  productId: string,
  variantCount: number = 0,
): PortableTextBlock[] {
  const blocks: PortableTextBlock[] = []
  const timestamp = Date.now()
  let keyIndex = 0
  let imageIndex = 0

  // Image sizes: first large, subsequent medium
  const imageSizes: Array<'small' | 'medium' | 'large'> = ['large', 'medium', 'medium']

  // Total available images: primary (index 0) + variants (indices 1+)
  const totalImages = 1 + variantCount

  for (const section of sections) {
    switch (section.type) {
      case 'heading':
        if (section.content) {
          blocks.push(createHeadingBlock(section.content, generateKey('h', timestamp, keyIndex++)))
        }
        break

      case 'paragraph':
        if (section.content) {
          blocks.push(
            createParagraphBlock(section.content, generateKey('p', timestamp, keyIndex++)),
          )
        }
        break

      case 'bulletList':
        if (section.items && section.items.length > 0) {
          for (const item of section.items) {
            blocks.push(createBulletBlock(item, generateKey('li', timestamp, keyIndex++)))
          }
        }
        break

      case 'productImage':
        const size = imageSizes[imageIndex] || 'medium'
        // Distribute variant indices across image blocks (cycle through available images)
        const variantIndex = imageIndex % totalImages
        blocks.push(
          createProductImageBlock(
            productId,
            generateKey('img', timestamp, keyIndex++),
            size,
            variantIndex,
          ),
        )
        imageIndex++
        break
    }
  }

  return blocks
}

/**
 * Validate Portable Text structure
 */
function validatePortableText(blocks: PortableTextBlock[]): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  const seenKeys = new Set<string>()

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]

    // Check _key
    if (!block._key) {
      errors.push(`Block ${i} missing _key`)
    } else if (seenKeys.has(block._key)) {
      errors.push(`Duplicate _key: ${block._key}`)
    } else {
      seenKeys.add(block._key)
    }

    // Check _type
    if (!block._type) {
      errors.push(`Block ${i} missing _type`)
    }

    // Type-specific validation
    if (block._type === 'block') {
      const textBlock = block as PostBlock
      if (!textBlock.children || textBlock.children.length === 0) {
        errors.push(`Block ${i} has no children`)
      } else {
        for (const child of textBlock.children) {
          if (!child._key) errors.push(`Block ${i} span missing _key`)
          if (!child._type) errors.push(`Block ${i} span missing _type`)
        }
      }
    }

    if (block._type === 'productImage') {
      const imgBlock = block as ProductImageBlock
      if (!imgBlock.product?._ref) {
        errors.push(`Block ${i} productImage missing product reference`)
      }
    }
  }

  // Content quality warnings
  const textBlocks = blocks.filter((b) => b._type === 'block')
  const imageBlocks = blocks.filter((b) => b._type === 'productImage')

  if (textBlocks.length < 5) {
    warnings.push(`Content seems short (only ${textBlocks.length} text blocks)`)
  }

  if (imageBlocks.length === 0) {
    warnings.push('No product images in content')
  } else if (imageBlocks.length > 5) {
    warnings.push(`Too many product images (${imageBlocks.length})`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Build context string from product and scrape data
 */
function buildProductContext(
  product: PostToEnhance['product'],
  scrapes?: ScrapeData[],
): string {
  const lines: string[] = []

  lines.push(`Product: ${product.name}`)
  lines.push(`ASIN: ${product.asin}`)
  if (product.brand) {
    lines.push(`Brand: ${product.brand}`)
  }

  // Get the most recent scrape with data
  const scrape = scrapes?.find((s) => s.features || s.specifications || s.rating)

  if (scrape) {
    if (scrape.brand && !product.brand) {
      lines.push(`Brand: ${scrape.brand}`)
    }

    if (scrape.price?.amount) {
      lines.push(`Price: ${scrape.price.currency || '$'}${scrape.price.amount}`)
    }

    if (scrape.rating) {
      lines.push(`Rating: ${scrape.rating.average}/5 (${scrape.rating.count} reviews)`)
    }

    if (scrape.features && scrape.features.length > 0) {
      lines.push('\nKey Features:')
      for (const feature of scrape.features.slice(0, 10)) {
        lines.push(`- ${feature}`)
      }
    }

    if (scrape.specifications?.items && scrape.specifications.items.length > 0) {
      lines.push('\nSpecifications:')
      for (const spec of scrape.specifications.items.slice(0, 10)) {
        if (spec.label && spec.value) {
          lines.push(`- ${spec.label}: ${spec.value}`)
        }
      }
    }
  }

  return lines.join('\n')
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Enhance posts by regenerating content with AI and adding product images.
 * Uses configurable AI model via OPENROUTER_MODEL environment variable.
 *
 * This is step 3 of the post creation pipeline.
 *
 * Chain: generate-post-content -> (post.content.generated) -> enhance-post
 */
export const enhancePost = inngest.createFunction(
  {
    id: 'enhance-post',
    name: 'Enhance Post',
    concurrency: {limit: 1},
    retries: 2,
  },
  [
    {event: 'job/enhance-post'},
    {event: 'post.content.generated'}, // Chained from generate-post-content
  ],
  async ({event, step}) => {
    const targetPostId = event?.data?.postId

    logger.info({targetPostId}, 'Starting post enhancement job')

    // Step 1: Find post to enhance with full product and scrape data
    const post = await step.run('find-post', async () => {
      if (targetPostId) {
        logger.info({postId: targetPostId}, 'Enhancing specific post')

        return await sanityWrite.fetch<PostToEnhance | null>(
          `*[_type == "post" && _id == $postId && postType == "productReview" && defined(product)][0] {
            _id,
            _rev,
            title,
            slug,
            content,
            product->{
              _id,
              asin,
              name,
              brand,
              paApiVariantImageUrls
            },
            author->{
              _id,
              firstName,
              lastName,
              "preferredAiModel": preferredAiModel->{
                modelId,
                name
              }
            },
            scrapes[]->{
              _id,
              scrapedAt,
              title,
              brand,
              features,
              specifications,
              price,
              rating,
              rawData
            }
          }`,
          {postId: targetPostId},
        )
      }

      // Queue mode: find next post that needs enhancement
      logger.info({}, 'Finding next post to enhance (queue-based)')

      return await sanityWrite.fetch<PostToEnhance | null>(`
        *[_type == "post" && postType == "productReview" && defined(product) && count(content[_type == "productImage"]) == 0] {
          _id,
          _rev,
          title,
          slug,
          content,
          product->{
            _id,
            asin,
            name,
            brand,
            paApiVariantImageUrls
          },
          author->{
            _id,
            firstName,
            lastName,
            "preferredAiModel": preferredAiModel->{
              modelId,
              name
            }
          },
          scrapes[]->{
            _id,
            scrapedAt,
            title,
            brand,
            features,
            specifications,
            price,
            rating,
            rawData
          }
        }[0]
      `)
    })

    if (!post || !post.product) {
      logger.info({}, 'No posts found that need enhancement')
      return {success: false, error: 'No posts need enhancement'}
    }

    // Step 2: Build context from product data
    const context = await step.run('build-context', async () => {
      return buildProductContext(post.product, post.scrapes)
    })

    logger.info({postId: post._id, contextLength: context.length}, 'Built product context')

    // Step 3: Generate structured content with AI
    const aiResponse = await step.run('generate-content', async () => {
      const userPrompt = `Write a comprehensive and engaging product review for the following product:

${context}

Remember:
- Write in a conversational, helpful tone
- Include personal observations and practical insights
- Be balanced - mention both pros and potential drawbacks
- Place 2-3 product images at natural break points
- Return valid JSON only, no markdown formatting`

      // Use author's preferred AI model if set, otherwise falls back to env var in ai.ts
      const authorModel = post.author?.preferredAiModel?.modelId
      const authorName = post.author?.firstName
        ? `${post.author.firstName} ${post.author.lastName || ''}`.trim()
        : undefined

      logger.info(
        {
          postId: post._id,
          authorModel: authorModel || 'default (env)',
          authorName,
        },
        'Generating content with AI',
      )

      const response = await generateWithOpenRouter(userPrompt, {
        model: authorModel, // Falls back to OPENROUTER_MODEL env var if undefined
        systemPrompt: SYSTEM_PROMPT,
        maxTokens: 4000,
        temperature: 0.7,
      })

      logger.info({postId: post._id, responseLength: response.length}, 'AI response received')

      return parseJsonResponse<AIContentResponse>(response)
    })

    // Step 4: Transform to Portable Text
    const portableText = await step.run('transform-content', async () => {
      logger.info(
        {postId: post._id, sectionCount: aiResponse.sections.length},
        'Transforming to Portable Text',
      )

      const variantCount = post.product.paApiVariantImageUrls?.length || 0
      return transformToPortableText(aiResponse.sections, post.product._id, variantCount)
    })

    // Step 5: Validate Portable Text
    const validation = await step.run('validate-content', async () => {
      const result = validatePortableText(portableText)

      if (result.warnings.length > 0) {
        logger.warn({warnings: result.warnings}, 'Validation warnings')
      }

      if (!result.isValid) {
        logger.error({errors: result.errors}, 'Validation failed')
        throw new Error(`Portable Text validation failed: ${result.errors.join(', ')}`)
      }

      return result
    })

    // Step 6: Save to Sanity
    await step.run('save-content', async () => {
      logger.info(
        {postId: post._id, blockCount: portableText.length},
        'Saving enhanced content to Sanity',
      )

      await sanityWrite.patch(post._id).ifRevisionId(post._rev).set({content: portableText}).commit()

      logger.info({postId: post._id}, 'Post enhanced successfully')
    })

    // Step 7: Send Telegram notification
    await step.run('notify-telegram', async () => {
      try {
        await sendDraftPostNotification({
          postTitle: post.title,
          postSlug: post.slug?.current || '',
          productName: post.product.name,
          asin: post.product.asin,
        })
        logger.info({postId: post._id}, 'Telegram notification sent')
      } catch (error) {
        logger.warn({error}, 'Failed to send Telegram notification')
        // Don't fail the job if notification fails
      }
    })

    return {
      success: true,
      postId: post._id,
      productId: post.product._id,
      blockCount: portableText.length,
      imageCount: portableText.filter((b) => b._type === 'productImage').length,
      warnings: validation.warnings,
    }
  },
)
