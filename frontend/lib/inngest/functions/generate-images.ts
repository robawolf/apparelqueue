import {inngest} from '../client'
import {sanityWrite} from '@/lib/sanity-write'
import {generateImageWithGemini} from '@/lib/ai'
import {createJobLogger} from '@/lib/logger'

const logger = createJobLogger('generate-images')

// Image perspectives to generate
const PERSPECTIVES = [
  {id: 1, description: 'Front view - hands holding/presenting the product from the front'},
  {id: 2, description: 'Side view - hands demonstrating the product from the side angle'},
  {id: 3, description: 'Top-down view - hands showing the product from above'},
  {id: 4, description: '45-degree angle - hands using the product at an angled perspective'},
  {
    id: 5,
    description: 'Close-up detail - hands highlighting a specific feature or detail of the product',
  },
]

interface ProductWithScrape {
  _id: string
  name: string
  asin: string
  brand?: string
  latestScrape: {
    _id: string
    scrapedAt: string
    title: string
    images: string[]
  }
}

interface GeneratedImage {
  _type: 'generatedProductImage'
  _key: string
  perspective: number
  perspectiveDescription: string
  imageData: string // base64 data URL
  generatedAt: string
}

/**
 * Create the prompt for Gemini image generation
 */
function createImagePrompt(
  productName: string,
  perspectiveId: number,
  perspectiveDescription: string,
): string {
  return `Generate ONE high-quality professional product photo showing "${productName}" in use. This is image ${perspectiveId} of a 5-image set.

CRITICAL CONSISTENCY REQUIREMENTS (must match across all 5 images in the set):
- Use the EXACT SAME hands/hand model (same skin tone, same hand size, same features)
- Use the EXACT SAME background/setting (same surface, same environment)
- Use the EXACT SAME lighting setup (soft, even lighting with no harsh shadows)
- Maintain the EXACT SAME photographic style (professional product photography)

PERSPECTIVE FOR THIS IMAGE:
${perspectiveDescription}

QUALITY REQUIREMENTS:
- Professional photography quality with sharp focus and proper exposure
- Product must be the clear focal point
- Natural, realistic hand positioning and product interaction
- Clean, professional, neutral background (white or light gray)
- Full-resolution standalone photograph
- This image must look like it was shot in the same photo session as the other 4 images`
}

/**
 * Generate AI product lifestyle images using Google Gemini.
 * Creates 5 different perspectives for consistent product photography.
 */
export const generateImages = inngest.createFunction(
  {
    id: 'generate-images',
    name: 'Generate Images',
    concurrency: {limit: 1},
  },
  {event: 'job/generate-images'},
  async ({step}) => {
    logger.info({}, 'Starting image generation job')

    // Step 1: Find product needing images
    const product = await step.run('find-product', async () => {
      const result = await sanityWrite.fetch<ProductWithScrape | null>(`
        *[_type == "product" && approvalStatus == "approved" && (_id in *[_type == "post"].product._ref)] {
          _id,
          name,
          asin,
          brand,
          "latestScrape": *[_type == "scrape" && product._ref == ^._id] | order(scrapedAt desc)[0] {
            _id,
            scrapedAt,
            title,
            images
          }
        }[defined(latestScrape) && defined(latestScrape.images) && length(latestScrape.images) > 0] | order(latestScrape.scrapedAt asc)[0]
      `)

      return result
    })

    if (!product) {
      logger.info({}, 'No products found that need image generation')
      return {success: false, error: 'No products need image generation'}
    }

    if (!product.latestScrape.images || product.latestScrape.images.length === 0) {
      logger.info({productId: product._id}, 'Product has no source images')
      return {success: false, error: 'Product has no source images', productId: product._id}
    }

    logger.info(
      {
        productId: product._id,
        asin: product.asin,
        sourceImageCount: product.latestScrape.images.length,
      },
      'Generating lifestyle images for product',
    )

    // Use the first product image as the source
    const sourceImageUrl = product.latestScrape.images[0]

    // Generate each perspective as a separate step (each ~20-30s)
    const generatedImages: GeneratedImage[] = []

    for (const perspective of PERSPECTIVES) {
      const image = await step.run(`generate-perspective-${perspective.id}`, async () => {
        try {
          logger.debug(
            {productId: product._id, perspective: perspective.id},
            'Generating image for perspective',
          )

          const prompt = createImagePrompt(product.name, perspective.id, perspective.description)

          const result = await generateImageWithGemini(prompt, {
            sourceImageUrl,
            model: 'gemini-2.0-flash-exp',
          })

          logger.debug(
            {productId: product._id, perspective: perspective.id},
            'Generated image for perspective',
          )

          return {
            _type: 'generatedProductImage' as const,
            _key: `gen-img-${perspective.id}-${Date.now()}`,
            perspective: perspective.id,
            perspectiveDescription: perspective.description,
            imageData: result.imageUrl,
            generatedAt: new Date().toISOString(),
          }
        } catch (error) {
          logger.error(
            {productId: product._id, perspective: perspective.id, error},
            'Failed to generate image for perspective',
          )
          return null
        }
      })

      if (image) {
        generatedImages.push(image)
      }
    }

    if (generatedImages.length === 0) {
      logger.error({productId: product._id}, 'No images were generated')
      return {success: false, error: 'No images generated', productId: product._id}
    }

    // Save all generated images
    await step.run('save-images', async () => {
      await sanityWrite
        .patch(product.latestScrape._id)
        .setIfMissing({generatedImages: []})
        .append('generatedImages', generatedImages)
        .commit()
    })

    logger.info(
      {
        productId: product._id,
        generatedCount: generatedImages.length,
        totalPerspectives: PERSPECTIVES.length,
      },
      'Image generation complete',
    )

    return {
      success: true,
      productId: product._id,
      metadata: {
        generatedCount: generatedImages.length,
        totalPerspectives: PERSPECTIVES.length,
      },
    }
  },
)
