/**
 * ⚠️ ADMIN/INTERNAL USE ONLY ⚠️
 *
 * This ProductCard component is for admin dashboard and internal use only.
 * It should NOT be used on public-facing frontend pages.
 *
 * For public frontend:
 * - Posts display original editorial content only
 * - Product data (images, prices, ratings) should be fetched from Amazon PA API in real-time
 * - No ProductCard displays on post pages or public routes
 *
 * This component remains for:
 * - Admin dashboard product management
 * - Internal product preview/approval workflows
 * - Sanity Studio integration
 */

import Image from 'next/image'
import {urlForProductImage} from '@/lib/sanity/utils'
import {stegaClean} from '@sanity/client/stega'
import AffiliateLink from './AffiliateLink'
import {sanityFetch} from '@/lib/sanity/live'
import {settingsQuery} from '@/lib/sanity/queries'

// Product type - NOTE: This references OLD schema fields that no longer exist in simplified product schema
// This component needs refactoring if it will be used with the new minimal product schema
type Product = {
  _id: string
  name: string
  asin: string
  brand?: string | null
  description?: string | null
  images?: Array<{
    imageUrl?: string // Amazon CDN URL
    imageUrlFetchedAt?: string // ISO timestamp
    alt?: string
    fallbackImage?: { // Sanity image for Studio preview
      asset?: {
        _ref: string
        _type: 'reference'
      }
    }
    // Legacy support for pre-migration data
    asset?: {
      _ref: string
      _type: 'reference'
    }
  }> | null
  priceRange?: {
    min?: number
    max?: number
    currency?: string
    lastPriceCheck?: string
  } | null
  affiliateUrl: string
  trackingTag?: string | null
  features?: Array<string> | null
  averageRating?: number | null
  reviewCount?: number | null
  bestSellerBadge?: boolean | null
  specifications?: {
    items?: Array<{
      label: string
      value: string
    }> | null
  } | null
}

interface ProductCardProps {
  product: Product
  showPrice?: boolean
  className?: string
  ctaText?: string
}

/**
 * Conversion-optimized product card component
 * Displays product image, rating, price, features, and CTA button
 */
export default async function ProductCard({
  product,
  showPrice,
  className = '',
  ctaText,
}: ProductCardProps) {
  const {data: settings} = await sanityFetch({
    query: settingsQuery,
    stega: false,
  })

  if (!product) return null

  const primaryImage = product.images?.[0]
  // Use urlForProductImage which prioritizes Amazon CDN URLs for compliance
  const imageUrl = primaryImage ? urlForProductImage(primaryImage) : null

  const shouldShowPrice = showPrice ?? settings?.showPriceRange ?? false

  const buttonStyle = settings?.activeTheme?.buttonStyle || 'rounded'
  const cardStyle = settings?.activeTheme?.cardStyle || 'shadow'

  const getButtonClasses = () => {
    const base = 'inline-flex items-center justify-center p-3 text-white transition-all duration-200 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2'
    const radiusMap = {
      pill: 'rounded-full',
      rounded: 'rounded-lg',
      square: 'rounded-none',
    }
    return `${base} ${radiusMap[buttonStyle as keyof typeof radiusMap] || radiusMap.rounded}`
  }

  const getCardClasses = () => {
    const base = 'bg-white overflow-hidden transition-all duration-200 hover:scale-[1.02] relative'
    const styleMap = {
      flat: 'border border-gray-200',
      shadow: 'shadow-md',
      border: 'border-2 border-gray-300',
      elevated: 'shadow-lg',
    }
    return `${base} ${styleMap[cardStyle as keyof typeof styleMap] || styleMap.shadow}`
  }

  const formatPrice = (priceRange: typeof product.priceRange) => {
    if (!priceRange?.min && !priceRange?.max) return null
    const currency = priceRange.currency || 'USD'
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£'
    
    if (priceRange.min === priceRange.max) {
      return `${symbol}${priceRange.min}`
    }
    return `${symbol}${priceRange.min} - ${symbol}${priceRange.max}`
  }

  const renderStars = (rating: number | null | undefined) => {
    if (!rating) return null
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5
    
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => {
          if (i < fullStars) {
            return (
              <svg key={i} className="w-4 h-4 fill-yellow-400" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
            )
          }
          if (i === fullStars && hasHalfStar) {
            return (
              <svg key={i} className="w-4 h-4 fill-yellow-400" viewBox="0 0 20 20">
                <defs>
                  <linearGradient id={`half-${i}`}>
                    <stop offset="50%" stopColor="currentColor" />
                    <stop offset="50%" stopColor="transparent" />
                  </linearGradient>
                </defs>
                <path fill={`url(#half-${i})`} d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
            )
          }
          return (
            <svg key={i} className="w-4 h-4 fill-gray-300" viewBox="0 0 20 20">
              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
            </svg>
          )
        })}
      </div>
    )
  }

  return (
    <article className={`${getCardClasses()} ${className}`} style={{borderRadius: 'var(--border-radius)'}}>
      {primaryImage && imageUrl && (
        <div className="relative w-full aspect-square bg-gray-100">
          <Image
            src={imageUrl}
            alt={stegaClean(primaryImage.alt) || product.name || 'Product image'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {product.bestSellerBadge && (
            <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">
              Best Seller
            </div>
          )}
        </div>
      )}
      
      <div className="p-6">
        {product.brand && (
          <div className="text-sm font-medium mb-1" style={{color: 'var(--color-neutral)'}}>
            {product.brand}
          </div>
        )}
        
        <h3 className="text-xl font-bold mb-2 leading-tight" style={{fontFamily: 'var(--font-heading)', color: 'var(--color-primary)'}}>
          {product.name}
        </h3>
        
        {(product.averageRating || product.reviewCount) && (
          <div className="flex items-center gap-2 mb-3">
            {renderStars(product.averageRating)}
            {product.averageRating && (
              <span className="text-sm font-medium">{product.averageRating.toFixed(1)}</span>
            )}
            {product.reviewCount && (
              <span className="text-sm text-gray-600">({product.reviewCount.toLocaleString()} reviews)</span>
            )}
          </div>
        )}
        
        {shouldShowPrice && product.priceRange && (
          <div className="mb-3">
            <div className="text-2xl font-bold" style={{color: 'var(--color-primary)'}}>
              {formatPrice(product.priceRange)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Price may vary</p>
          </div>
        )}
        
        {product.features && product.features.length > 0 && (
          <ul className="mb-4 space-y-1">
            {product.features.slice(0, 3).map((feature, index) => (
              <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{color: 'var(--color-accent)'}} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        )}
        
        {product.affiliateUrl && (
          <AffiliateLink
            url={product.affiliateUrl}
            trackingTag={product.trackingTag}
            defaultTrackingTag={settings?.amazonAssociateTag}
            className={getButtonClasses()}
            aria-label={`View ${product.name} on Amazon`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </AffiliateLink>
        )}
      </div>
    </article>
  )
}

