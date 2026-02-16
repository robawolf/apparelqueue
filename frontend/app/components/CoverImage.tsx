import {stegaClean} from '@sanity/client/stega'
import Image from 'next/image'
import {getImageDimensions} from '@sanity/asset-utils'
import {urlForImage, urlForProductImage} from '@/lib/sanity/utils'

interface CoverImageProps {
  image: any
  priority?: boolean
  isProductImage?: boolean // Flag to indicate if this is a product image (uses Amazon URLs)
}

export default function CoverImage(props: CoverImageProps) {
  const {image: source, priority, isProductImage = false} = props

  // Handle product images with external Amazon URLs
  if (isProductImage) {
    const imageUrl = urlForProductImage(source)

    if (!imageUrl) return null

    return (
      <div className="relative">
        <Image
          className="object-cover"
          width={800}
          height={800}
          alt={stegaClean(source?.alt) || ''}
          src={imageUrl}
          priority={priority}
        />
      </div>
    )
  }

  // Handle standard Sanity images (posts, pages, etc.)
  const image = source?.asset?._ref ? (
    <Image
      className="object-cover"
      width={getImageDimensions(source).width}
      height={getImageDimensions(source).height}
      alt={stegaClean(source?.alt) || ''}
      src={urlForImage(source)?.url() as string}
      priority={priority}
    />
  ) : null

  return <div className="relative">{image}</div>
}
