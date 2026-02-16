import {inngest} from '../client'
import {sanityWrite} from '@/lib/sanity-write'
import {scrapeAmazonProduct, transformScrapeData} from '@/lib/scrapingbee'
import {createJobLogger} from '@/lib/logger'

const logger = createJobLogger('scrape-product')

// Only re-scrape products that haven't been scraped in this many days
const SCRAPE_INTERVAL_DAYS = 7

interface ProductToScrape {
  _id: string
  asin: string
  name: string
  scrapeCount: number
  lastScraped: string | null
}

/**
 * Scrape product data for approved products.
 *
 * HYBRID execution:
 * - If productId provided: Scrape that specific product (targeted)
 * - If no productId: Find next approved product that needs scraping (queue-based)
 */
export const scrapeProduct = inngest.createFunction(
  {
    id: 'scrape-product',
    name: 'Scrape Product',
    concurrency: {limit: 1},
    retries: 2,
  },
  [
    {cron: '0 * * * *'}, // Every hour
    {event: 'job/scrape-product'},
  ],
  async ({event, step}) => {
    logger.info({event: event?.data}, 'Starting product scrape job')

    // Step 1: Find product to scrape
    const product = await step.run('find-product', async () => {
      const productId = event?.data?.productId

      if (productId) {
        // Targeted execution: scrape specific product
        logger.info({productId}, 'Scraping specific product')

        const result = await sanityWrite.fetch<ProductToScrape | null>(
          `
          *[_type == "product" && _id == $productId && approvalStatus == "approved"][0] {
            _id,
            asin,
            name,
            "scrapeCount": count(*[_type == "scrape" && product._ref == ^._id]),
            "lastScraped": *[_type == "scrape" && product._ref == ^._id] | order(scrapedAt desc)[0].scrapedAt
          }
        `,
          {productId},
        )

        if (!result) {
          logger.error({productId}, 'Product not found or not approved')
          return null
        }

        return result
      }

      // Queue-based execution: find oldest approved product
      logger.info({}, 'Finding next product to scrape (queue-based)')

      const result = await sanityWrite.fetch<ProductToScrape | null>(`
        *[_type == "product" && approvalStatus == "approved"] {
          _id,
          asin,
          name,
          "scrapeCount": count(*[_type == "scrape" && product._ref == ^._id]),
          "lastScraped": *[_type == "scrape" && product._ref == ^._id] | order(scrapedAt desc)[0].scrapedAt
        } | order(lastScraped asc)[0]
      `)

      return result
    })

    if (!product) {
      return {success: false, error: 'No approved products found'}
    }

    // Check if product needs scraping (skip interval check if targeted)
    const isTargeted = !!event?.data?.productId
    if (!isTargeted) {
      const daysSinceLastScrape = product.lastScraped
        ? Math.floor((Date.now() - new Date(product.lastScraped).getTime()) / (1000 * 60 * 60 * 24))
        : 999

      if (daysSinceLastScrape < SCRAPE_INTERVAL_DAYS) {
        logger.info({productId: product._id, daysSinceLastScrape}, 'Product was recently scraped')
        return {success: false, error: 'Product recently scraped', productId: product._id}
      }
    }

    logger.info({productId: product._id, asin: product.asin}, 'Scraping product')

    // Step 2: Scrape the product
    const scrapeDoc = await step.run('scrape-amazon', async () => {
      const rawData = await scrapeAmazonProduct(product.asin)
      const scrapeData = transformScrapeData(rawData)

      const doc = await sanityWrite.create({
        _type: 'scrape',
        product: {
          _type: 'reference',
          _ref: product._id,
        },
        scrapedAt: new Date().toISOString(),
        source: 'Amazon (ScrapingBee)',
        title: scrapeData.title,
        brand: scrapeData.brand,
        images: scrapeData.images,
        bestSellerBadge: scrapeData.bestSellerBadge,
        price: scrapeData.price,
        availability: scrapeData.availability,
        delivery: scrapeData.delivery,
        rating: scrapeData.rating,
        features: scrapeData.features,
        specifications: scrapeData.specifications,
        rawData: scrapeData.rawData,
      })

      logger.info({productId: product._id, scrapeId: doc._id}, 'Product scrape complete')

      return doc
    })

    // Step 3: Wait for Sanity indexing then trigger post creation
    await step.sleep('wait-for-indexing', '10s')

    // Step 4: Send event to trigger post creation
    await step.sendEvent('trigger-create-post', {
      name: 'scrape.completed',
      data: {
        productId: product._id,
        scrapeId: scrapeDoc._id,
        success: true,
      },
    })

    return {
      success: true,
      productId: product._id,
      scrapeId: scrapeDoc._id,
    }
  },
)
