import Image from 'next/image'

interface ProductImageProps {
  value: {
    product?: {
      _id: string
      name: string
      asin?: string | null
      paApiPrimaryImageUrl?: string | null
      paApiVariantImageUrls?: string[] | null
      paApiImageUpdatedAt?: string | null
      discoveryImage?: string | null
      latestScrapeImages?: string[] | null
    } | null
    size?: 'small' | 'medium' | 'large'
    alignment?: 'left' | 'center' | 'right'
    showLink?: boolean
    variantIndex?: number
    caption?: string
    altText?: string
    isDraftMode?: boolean
  }
}

const SIZES = {
  small: 160,
  medium: 300,
  large: 500,
}

const ALIGNMENT_CLASSES = {
  left: 'mr-auto',
  center: 'mx-auto',
  right: 'ml-auto',
}

/**
 * Check if PA API images are fresh (updated within 24 hours)
 * Amazon requires product data to be refreshed every 24 hours
 */
function isPaApiImageFresh(updatedAt: string | null | undefined): boolean {
  if (!updatedAt) return false
  const updatedTime = new Date(updatedAt).getTime()
  const now = Date.now()
  const twentyFourHours = 24 * 60 * 60 * 1000
  return (now - updatedTime) < twentyFourHours
}

export default function ProductImage({value}: ProductImageProps) {
  const {
    product,
    size = 'medium',
    alignment = 'center',
    showLink = true,
    variantIndex = 0,
    caption,
    altText,
    isDraftMode = false,
  } = value

  if (!product) {
    return null
  }

  const width = SIZES[size]
  const alt = altText || product.name || 'Product image'

  // Build combined array of all available images: PA API images + scrape images
  const allImages = [
    product.paApiPrimaryImageUrl,
    ...(product.paApiVariantImageUrls || []),
    ...(product.latestScrapeImages || []),
  ].filter((url): url is string => !!url)

  // PA API images only (for published mode compliance)
  const paApiImageUrls = [
    product.paApiPrimaryImageUrl,
    ...(product.paApiVariantImageUrls || []),
  ].filter((url): url is string => !!url)

  // Determine which image to show based on draft/published mode and PA API freshness
  const paApiFresh = isPaApiImageFresh(product.paApiImageUpdatedAt)
  let imageUrl: string | null = null

  if (isDraftMode) {
    // Draft mode: use combined pool with all available images (PA API + scrapes)
    imageUrl = allImages[variantIndex] || allImages[0] || product.discoveryImage || null
  } else {
    // Published mode: only show fresh PA API images (Amazon compliance)
    if (paApiFresh && paApiImageUrls.length > 0) {
      imageUrl = paApiImageUrls[variantIndex] || paApiImageUrls[0]
    }
    // If not fresh or no PA API images, imageUrl stays null → show placeholder
  }

  // Placeholder when no valid image is available
  if (!imageUrl) {
    return (
      <figure className={`my-6 ${ALIGNMENT_CLASSES[alignment]}`} style={{maxWidth: width}}>
        <div
          className="bg-gray-100 flex flex-col items-center justify-center text-gray-400 rounded-lg"
          style={{width, height: width * 0.75, aspectRatio: '4/3'}}
        >
          <svg
            className="w-12 h-12 mb-2 opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm">Image loading...</span>
        </div>
        {caption && <figcaption className="mt-2 text-sm text-gray-500 text-center">{caption}</figcaption>}
      </figure>
    )
  }

  const associateTag = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG || 'thingsfor0f-20'
  const amazonUrl = product.asin
    ? `https://www.amazon.com/dp/${product.asin}?tag=${associateTag}`
    : null

  const imageElement = (
    <Image
      src={imageUrl}
      alt={alt}
      width={width}
      height={width}
      className="object-contain"
      style={{maxWidth: '100%', height: 'auto'}}
    />
  )

  return (
    <figure className={`my-6 ${ALIGNMENT_CLASSES[alignment]}`} style={{maxWidth: width}}>
      {showLink && amazonUrl ? (
        <a
          href={amazonUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="block hover:opacity-80 transition-opacity"
        >
          {imageElement}
        </a>
      ) : (
        imageElement
      )}
      {caption && <figcaption className="mt-2 text-sm text-gray-500 text-center">{caption}</figcaption>}
    </figure>
  )
}
