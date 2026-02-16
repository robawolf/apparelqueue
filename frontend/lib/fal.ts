import {fal} from '@fal-ai/client'
import {logger} from './logger'

fal.config({
  credentials: process.env.FAL_KEY,
})

export interface DesignConcept {
  imageUrl: string
  seed: number
}

export interface GenerateConceptsOptions {
  count?: number
  style?: string
  width?: number
  height?: number
}

/**
 * Generate multiple design concept art variations using fal.ai
 */
export async function generateDesignConcepts(
  prompt: string,
  options: GenerateConceptsOptions = {},
): Promise<DesignConcept[]> {
  const {count = 4, width = 1024, height = 1024} = options

  logger.info({promptLength: prompt.length, count}, 'Generating design concepts with fal.ai')

  const results: DesignConcept[] = []

  // Generate multiple variations
  for (let i = 0; i < count; i++) {
    const result = await fal.subscribe('fal-ai/flux/dev', {
      input: {
        prompt: `${prompt}${options.style ? `. Style: ${options.style}` : ''}`,
        image_size: {width, height},
        num_inference_steps: 28,
        seed: Math.floor(Math.random() * 2147483647),
      },
    })

    const data = result.data as {images?: Array<{url: string; seed?: number}>}
    if (data.images?.[0]) {
      results.push({
        imageUrl: data.images[0].url,
        seed: data.images[0].seed || 0,
      })
    }
  }

  logger.info({count: results.length}, 'Design concepts generated')
  return results
}

/**
 * Generate a product mockup on apparel using fal.ai
 */
export async function generateMockup(
  designImageUrl: string,
  apparelType: string,
): Promise<string> {
  logger.info({apparelType}, 'Generating product mockup with fal.ai')

  const result = await fal.subscribe('fal-ai/flux/dev', {
    input: {
      prompt: `Professional product mockup photo of a ${apparelType} with a printed design on the front, displayed on a clean white background, e-commerce product photography style`,
      image_size: {width: 1024, height: 1024},
      num_inference_steps: 28,
    },
  })

  const data = result.data as {images?: Array<{url: string}>}
  const imageUrl = data.images?.[0]?.url

  if (!imageUrl) {
    throw new Error('No mockup image generated')
  }

  logger.info({}, 'Mockup generated')
  return imageUrl
}

/**
 * Upload an image to fal.ai storage
 */
export async function uploadImage(buffer: Buffer): Promise<string> {
  const blob = new Blob([buffer])
  const url = await fal.storage.upload(blob)
  return url
}
