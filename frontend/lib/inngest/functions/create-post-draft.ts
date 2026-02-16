import {inngest} from '../client'
import {sanityWrite} from '@/lib/sanity-write'
import {createJobLogger} from '@/lib/logger'

const logger = createJobLogger('create-post-draft')

// Only create posts for scrapes within this many days
const MAX_SCRAPE_AGE_DAYS = 21

interface ProductWithScrape {
  _id: string
  name: string
  asin: string
  latestScrape: {
    _id: string
    scrapedAt: string
    rawData: string
    title?: string
    brand?: string
  }
}

/**
 * Convert a string to a URL-friendly slug
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/**
 * Create a draft post skeleton for approved products that have been scraped.
 * This is step 1 of the post creation pipeline - it creates a minimal draft
 * that will be enhanced by subsequent functions.
 *
 * HYBRID execution:
 * - If productId provided: Create draft for that specific product (targeted)
 * - If no productId: Find next approved product that needs a post (queue-based)
 *
 * Chain: scrape.completed → create-post-draft → (post.draft.created) → generate-post-content
 */
export const createPostDraft = inngest.createFunction(
  {
    id: 'create-post-draft',
    name: 'Create Post Draft',
    concurrency: {limit: 1},
    retries: 3,
  },
  [
    {cron: '0 */2 * * *'}, // Every 2 hours (fallback)
    {event: 'job/create-post-draft'},
    {event: 'scrape.completed'}, // Chained from scrape-product
  ],
  async ({event, step}) => {
    logger.info({event: event?.data}, 'Starting post draft creation job')

    // Step 1: Fetch product with scrape data
    const product = await step.run('fetch-product', async () => {
      const productId = event?.data?.productId
      const scrapeId = event?.data?.scrapeId

      if (productId && scrapeId) {
        // Targeted with specific scrape
        logger.info({productId, scrapeId}, 'Creating draft for specific product with scrapeId')

        const [productData, scrapeData] = await Promise.all([
          sanityWrite.fetch<{_id: string; name: string; asin: string} | null>(
            `*[_type == "product" && _id == $productId && approvalStatus == "approved"][0] {
              _id,
              name,
              asin
            }`,
            {productId},
          ),
          sanityWrite.fetch<ProductWithScrape['latestScrape'] | null>(
            `*[_type == "scrape" && _id == $scrapeId][0] {
              _id,
              scrapedAt,
              rawData,
              title,
              brand
            }`,
            {scrapeId},
          ),
        ])

        if (!productData) {
          logger.error({productId}, 'Product not found or not approved')
          return null
        }

        if (!scrapeData) {
          logger.warn({productId, scrapeId}, 'Scrape not found - may not be indexed yet')
          return null
        }

        return {
          ...productData,
          latestScrape: scrapeData,
        }
      }

      if (productId) {
        // Targeted without scrapeId: find latest scrape
        logger.info({productId}, 'Creating draft for specific product')

        return await sanityWrite.fetch<ProductWithScrape | null>(
          `
          *[_type == "product" && _id == $productId && approvalStatus == "approved"][0] {
            _id,
            name,
            asin,
            "latestScrape": *[_type == "scrape" && product._ref == ^._id] | order(scrapedAt desc)[0] {
              _id,
              scrapedAt,
              rawData,
              title,
              brand
            }
          }[defined(latestScrape)]
        `,
          {productId},
        )
      }

      // Queue-based: find product without post
      logger.info({}, 'Finding next product to create draft (queue-based)')

      return await sanityWrite.fetch<ProductWithScrape | null>(`
        *[_type == "product" && approvalStatus == "approved" && !(_id in *[_type == "post"].product._ref)] {
          _id,
          name,
          asin,
          "latestScrape": *[_type == "scrape" && product._ref == ^._id] | order(scrapedAt desc)[0] {
            _id,
            scrapedAt,
            rawData,
            title,
            brand
          }
        }[defined(latestScrape)] | order(latestScrape.scrapedAt asc)[0]
      `)
    })

    if (!product) {
      return {success: false, error: 'No products need posts'}
    }

    // Check scrape age
    const scrapeAge = Math.floor(
      (Date.now() - new Date(product.latestScrape.scrapedAt).getTime()) / (1000 * 60 * 60 * 24),
    )

    if (scrapeAge > MAX_SCRAPE_AGE_DAYS) {
      logger.info({productId: product._id, scrapeAge}, 'Scrape data is too old')
      return {success: false, productId: product._id, error: 'Scrape data too old'}
    }

    logger.info({productId: product._id, asin: product.asin, scrapeAge}, 'Creating draft for product')

    // Step 2: Create draft post skeleton
    const postDoc = await step.run('create-draft', async () => {
      const now = new Date()
      const postId = `drafts.post-${product.asin}-${Math.floor(now.getTime() / 1000)}`
      const placeholderTitle = `${product.name} Review`
      const placeholderSlug = slugify(placeholderTitle)

      return await sanityWrite.createOrReplace({
        _id: postId,
        _type: 'post',
        title: placeholderTitle,
        slug: {
          _type: 'slug',
          current: placeholderSlug,
        },
        excerpt: '',
        date: now.toISOString(),
        postType: 'productReview',
        featured: false,
        product: {
          _type: 'reference',
          _ref: product._id,
        },
        scrapes: [
          {
            _type: 'reference',
            _ref: product.latestScrape._id,
            _key: `key-${Math.floor(now.getTime() / 1000)}`,
          },
        ],
        content: [],
        affiliateDisclosure:
          'This post contains affiliate links. We may earn a commission if you make a purchase through these links, at no extra cost to you.',
      })
    })

    logger.info(
      {postId: postDoc._id, productId: product._id},
      'Draft post created, waiting for Sanity indexing',
    )

    // Step 3: Wait for Sanity to index the new document
    await step.sleep('wait-for-indexing', '10s')

    // Step 4: Trigger content generation
    await step.sendEvent('trigger-content-generation', {
      name: 'post.draft.created',
      data: {
        postId: postDoc._id,
        productId: product._id,
        scrapeId: product.latestScrape._id,
      },
    })

    return {
      success: true,
      productId: product._id,
      postId: postDoc._id,
      scrapeId: product.latestScrape._id,
    }
  },
)
