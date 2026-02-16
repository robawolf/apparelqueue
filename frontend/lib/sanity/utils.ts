import createImageUrlBuilder from '@sanity/image-url'
import {Link} from '@/sanity.types'
import {dataset, projectId, studioUrl} from '@/lib/sanity/api'
import {createDataAttribute, CreateDataAttributeProps} from 'next-sanity'
import {getImageDimensions} from '@sanity/asset-utils'

const imageBuilder = createImageUrlBuilder({
  projectId: projectId || '',
  dataset: dataset || '',
})

export const urlForImage = (source: any) => {
  // Ensure that source image contains a valid reference
  if (!source?.asset?._ref) {
    return undefined
  }

  const imageRef = source?.asset?._ref
  const crop = source.crop

  // get the image's og dimensions
  const {width, height} = getImageDimensions(imageRef)

  if (Boolean(crop)) {
    // compute the cropped image's area
    const croppedWidth = Math.floor(width * (1 - (crop.right + crop.left)))

    const croppedHeight = Math.floor(height * (1 - (crop.top + crop.bottom)))

    // compute the cropped image's position
    const left = Math.floor(width * crop.left)
    const top = Math.floor(height * crop.top)

    // gather into a url
    return imageBuilder?.image(source).rect(left, top, croppedWidth, croppedHeight).auto('format')
  }

  return imageBuilder?.image(source).auto('format')
}

/**
 * Get image URL for product images that may come from Amazon PA API or Sanity
 * Supports both external Amazon CDN URLs and Sanity image assets
 *
 * @param image - Image object that may contain imageUrl (Amazon) or asset (Sanity)
 * @param size - Preferred image size: 'small', 'medium', 'large' (default: 'large')
 * @returns Image URL string or undefined if no valid image found
 */
export function urlForProductImage(
  image: any,
  size: 'small' | 'medium' | 'large' = 'large'
): string | undefined {
  // Priority 1: Amazon CDN URL (compliance requirement)
  if (image?.imageUrl && typeof image.imageUrl === 'string') {
    return image.imageUrl
  }

  // Priority 2: Fallback to Sanity image asset (for Studio preview or legacy data)
  if (image?.fallbackImage?.asset?._ref) {
    return urlForImage(image.fallbackImage)?.url()
  }

  // Legacy support: Direct Sanity image asset (pre-migration)
  if (image?.asset?._ref) {
    return urlForImage(image)?.url()
  }

  return undefined
}

/**
 * Check if a product image URL is stale and needs refresh
 * Amazon requires image URLs to be refreshed every 24 hours
 *
 * @param fetchedAt - ISO 8601 timestamp string of when URL was fetched
 * @returns true if image data is stale (>24 hours old)
 */
export function isProductImageStale(fetchedAt: string | null | undefined): boolean {
  if (!fetchedAt) return true

  const fetchedTime = new Date(fetchedAt).getTime()
  const now = Date.now()
  const twentyFourHours = 24 * 60 * 60 * 1000

  return (now - fetchedTime) > twentyFourHours
}

export function resolveOpenGraphImage(image: any, width = 1200, height = 627) {
  if (!image) return
  const url = urlForImage(image)?.width(1200).height(627).fit('crop').url()
  if (!url) return
  return {url, alt: image?.alt as string, width, height}
}

// Depending on the type of link, we need to fetch the corresponding page, post, or URL.  Otherwise return null.
export function linkResolver(link: Link | undefined) {
  if (!link) return null

  // If linkType is not set but href is, lets set linkType to "href".  This comes into play when pasting links into the portable text editor because a link type is not assumed.
  if (!link.linkType && link.href) {
    link.linkType = 'href'
  }

  switch (link.linkType) {
    case 'href':
      return link.href || null
    case 'page':
      if (link?.page && typeof link.page === 'string') {
        return `/${link.page}`
      }
    case 'post':
      if (link?.post && typeof link.post === 'string') {
        return `/posts/${link.post}`
      }
    default:
      return null
  }
}

type DataAttributeConfig = CreateDataAttributeProps &
  Required<Pick<CreateDataAttributeProps, 'id' | 'type' | 'path'>>

export function dataAttr(config: DataAttributeConfig) {
  return createDataAttribute({
    projectId,
    dataset,
    baseUrl: studioUrl,
  }).combine(config)
}
