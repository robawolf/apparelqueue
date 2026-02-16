'use client'

import Image from 'next/image'
import {useProductImages} from './ProductImageContext'
import AffiliateLink from './AffiliateLink'

interface ProductImageBlockProps {
  asin: string
  productName?: string
  size?: 'small' | 'medium' | 'large'
  alignment?: 'left' | 'center' | 'right'
  showLink?: boolean
  caption?: string
  altText?: string
  affiliateTag?: string
}

const sizeDimensions = {
  small: {width: 160, height: 160},
  medium: {width: 300, height: 300},
  large: {width: 500, height: 500},
}

const alignmentClasses = {
  left: 'mr-auto',
  center: 'mx-auto',
  right: 'ml-auto',
}

export default function ProductImageBlock({
  asin,
  productName,
  size = 'medium',
  alignment = 'center',
  showLink = true,
  caption,
  altText,
  affiliateTag,
}: ProductImageBlockProps) {
  const {productData, loading, error} = useProductImages()
  const product = productData[asin]

  const dimensions = sizeDimensions[size]

  // Loading state
  if (loading) {
    return (
      <figure className={`my-6 w-fit ${alignmentClasses[alignment]}`}>
        <div
          className="bg-[var(--color-neutral)]/10 animate-pulse rounded-lg flex items-center justify-center"
          style={{width: dimensions.width, height: dimensions.height}}
        >
          <span className="text-[var(--color-neutral)]/50 text-sm">Loading...</span>
        </div>
      </figure>
    )
  }

  // Error or no data state
  if (error || !product?.images?.primary?.[size]?.url) {
    return (
      <figure className={`my-6 w-fit ${alignmentClasses[alignment]}`}>
        <div
          className="bg-[var(--color-neutral)]/5 rounded-lg flex items-center justify-center border border-[var(--color-neutral)]/20"
          style={{width: dimensions.width, height: dimensions.height}}
        >
          <span className="text-[var(--color-neutral)]/40 text-sm">Image unavailable</span>
        </div>
        {caption && (
          <figcaption className="text-sm text-[var(--color-neutral)]/70 mt-2 text-center">
            {caption}
          </figcaption>
        )}
      </figure>
    )
  }

  const imageData = product.images.primary[size]
  const imageUrl = imageData?.url
  const alt = altText || product.title || productName || 'Product image'

  const imageContent = (
    <figure className={`my-6 w-fit ${alignmentClasses[alignment]}`}>
      <div className="relative overflow-hidden rounded-lg bg-white">
        <Image
          src={imageUrl!}
          alt={alt}
          width={imageData?.width || dimensions.width}
          height={imageData?.height || dimensions.height}
          className="object-contain"
          sizes={`(max-width: 768px) 100vw, ${dimensions.width}px`}
        />
      </div>
      {caption && (
        <figcaption className="text-sm text-[var(--color-neutral)]/70 mt-2 text-center">
          {caption}
        </figcaption>
      )}
    </figure>
  )

  // Wrap with affiliate link if enabled
  if (showLink && product.detailPageUrl) {
    return (
      <AffiliateLink
        url={product.detailPageUrl}
        trackingTag={affiliateTag}
        className="block hover:opacity-90 transition-opacity"
      >
        {imageContent}
      </AffiliateLink>
    )
  }

  return imageContent
}
