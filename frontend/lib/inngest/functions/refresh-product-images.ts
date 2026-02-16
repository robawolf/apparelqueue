import {inngest} from '../client'
import {sanityWrite} from '@/lib/sanity-write'
import {getProductsByAsins} from '@/lib/amazon-pa-api'
import {createJobLogger} from '@/lib/logger'

const logger = createJobLogger('refresh-product-images')

// Refresh images that are older than this many hours
const STALE_HOURS = 20

// Check if PA API is configured
function isPaApiConfigured(): boolean {
  return !!(
    process.env.AMAZON_PA_API_ACCESS_KEY &&
    process.env.AMAZON_PA_API_SECRET_KEY &&
    process.env.AMAZON_PA_API_PARTNER_TAG
  )
}

interface ProductToRefresh {
  _id: string
  asin: string
  name: string
  paApiImageUpdatedAt: string | null
}

/**
 * Refresh PA API primary image URLs for products.
 *
 * This job caches PA API image URLs (not the images themselves) to avoid
 * rate limits on listing pages. Amazon allows storing links for up to 24 hours.
 *
 * Two modes:
 * 1. Targeted: If productIds provided, refresh those specific products
 * 2. Scheduled: Refresh products that have posts and stale/missing images
 */
export const refreshProductImages = inngest.createFunction(
  {
    id: 'refresh-product-images',
    name: 'Refresh Product Images',
    concurrency: {limit: 1},
    retries: 2,
  },
  [
    {cron: '0 */12 * * *'}, // Every 12 hours
    {event: 'job/refresh-product-images'},
  ],
  async ({event, step}) => {
    const targetProductIds = event?.data?.productIds
    const isTargeted = targetProductIds && targetProductIds.length > 0

    logger.info({isTargeted, productIds: targetProductIds}, 'Starting product image refresh job')

    // Step 1: Find products to refresh
    const products = await step.run('find-products', async () => {
      if (isTargeted) {
        // Targeted mode: fetch specific products by ID
        const result = await sanityWrite.fetch<ProductToRefresh[]>(
          `
          *[_type == "product" && _id in $productIds] {
            _id,
            asin,
            name,
            paApiImageUpdatedAt
          }
          `,
          {productIds: targetProductIds},
        )
        return result || []
      }

      // Scheduled mode: find products with posts that need refresh
      const staleThreshold = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000).toISOString()

      const result = await sanityWrite.fetch<ProductToRefresh[]>(
        `
        *[_type == "product" && (
          _id in *[_type == "post"].product._ref ||
          _id in *[_type == "post"].products[]._ref
        ) && (
          paApiImageUpdatedAt == null ||
          paApiImageUpdatedAt < $staleThreshold
        )] {
          _id,
          asin,
          name,
          paApiImageUpdatedAt
        }
        `,
        {staleThreshold},
      )

      return result || []
    })

    if (products.length === 0) {
      logger.info({}, 'No products need image refresh')
      return {success: true, refreshed: 0}
    }

    logger.info({count: products.length}, 'Found products needing image refresh')

    // Check if PA API is configured
    const paApiConfigured = isPaApiConfigured()

    if (!paApiConfigured) {
      // Skip refresh when PA API isn't configured - products will use discoveryImage fallback
      logger.info({}, 'PA API not configured, skipping refresh (products will use discoveryImage)')
      return {success: true, refreshed: 0, skipped: products.length, reason: 'PA API not configured'}
    }

    // Step 2: Fetch images from PA API
    const refreshedCount = await step.run('refresh-images', async () => {
      let refreshed = 0

      // Process in batches of 10 (PA API limit)
      for (let i = 0; i < products.length; i += 10) {
        const batch = products.slice(i, i + 10)
        const asins = batch.map((p) => p.asin)

        try {
          logger.info({batch: i / 10 + 1, asins}, 'Fetching PA API images')

          const productsMap = await getProductsByAsins(asins)

          logger.info(
            {batch: i / 10 + 1, mapSize: productsMap.size, asinsRequested: asins.length},
            'PA API response received',
          )

          // Update each product with the new image URLs (only if PA API returned an image)
          for (const product of batch) {
            const paApiData = productsMap.get(product.asin)
            const primaryImageUrl = paApiData?.images?.primary?.medium?.url

            if (primaryImageUrl) {
              // Extract variant image URLs (filter out undefined)
              const variantImageUrls = (paApiData?.images?.variants || [])
                .map((v) => v.medium?.url)
                .filter((url): url is string => !!url)

              await sanityWrite
                .patch(product._id)
                .set({
                  paApiPrimaryImageUrl: primaryImageUrl,
                  paApiVariantImageUrls: variantImageUrls,
                  paApiImageUpdatedAt: new Date().toISOString(),
                })
                .commit()

              logger.info(
                {
                  productId: product._id,
                  asin: product.asin,
                  primaryImageUrl,
                  variantCount: variantImageUrls.length,
                },
                'Updated product image URLs',
              )
              refreshed++
            } else {
              logger.info(
                {productId: product._id, asin: product.asin},
                'No PA API image available, skipping (will use discoveryImage)',
              )
            }
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          logger.error({errorMessage, batch: i / 10 + 1}, 'Error fetching PA API images for batch')
          // Skip this batch - products will use discoveryImage fallback
        }

        // Small delay between batches to respect rate limits
        if (i + 10 < products.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      return refreshed
    })

    logger.info({refreshed: refreshedCount, total: products.length}, 'Product image refresh complete')

    return {
      success: true,
      refreshed: refreshedCount,
      total: products.length,
    }
  },
)
