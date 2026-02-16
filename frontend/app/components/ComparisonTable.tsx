import ProductCard from './ProductCard'
import AffiliateLink from './AffiliateLink'
import {sanityFetch} from '@/lib/sanity/live'
import {settingsQuery} from '@/lib/sanity/queries'

// Product type matching the query structure
type Product = {
  _id: string
  name: string
  asin: string
  brand: string | null
  description: string | null
  images?: Array<{
    asset?: {
      _ref: string
      _type: 'reference'
    }
    alt?: string
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

interface ComparisonTableProps {
  products: Array<Product | null> | null | undefined
  features?: Array<{label: string; key: string}>
  className?: string
}

/**
 * Comparison table component for comparing multiple products
 * Shows side-by-side comparison with features and CTAs
 */
export default async function ComparisonTable({
  products,
  features,
  className = '',
}: ComparisonTableProps) {
  const {data: settings} = await sanityFetch({
    query: settingsQuery,
    stega: false,
  })

  if (!products || products.length < 2) {
    return null
  }

  const buttonText = settings?.ctaButtonText || 'Check Price on Amazon'
  const buttonStyle = settings?.activeTheme?.buttonStyle || 'rounded'
  
  const getButtonClasses = () => {
    const base = 'inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 w-full'
    const radiusMap = {
      pill: 'rounded-full',
      rounded: 'rounded-lg',
      square: 'rounded-none',
    }
    return `${base} ${radiusMap[buttonStyle as keyof typeof radiusMap] || radiusMap.rounded}`
  }

  // Extract common features from all products if not provided
  const getFeatureList = () => {
    if (features) return features
    
    // Use specifications or features from products
    const allFeatures = new Set<string>()
    products?.forEach((product) => {
      if (product?.features) {
        product.features.forEach((f) => allFeatures.add(f))
      }
      if (product?.specifications?.items) {
        product.specifications.items.forEach((item) => {
          if (item.label) allFeatures.add(item.label)
        })
      }
    })
    
    return Array.from(allFeatures).slice(0, 10).map((label) => ({label, key: label.toLowerCase().replace(/\s+/g, '_')}))
  }

  const featureList = getFeatureList()

  const getFeatureValue = (product: Product | null | undefined, featureKey: string) => {
    if (!product) return '-'
    
    // Check in features array
    const feature = product.features?.find((f) => f.toLowerCase().replace(/\s+/g, '_') === featureKey)
    if (feature) return '✓'
    
    // Check in specifications
    const spec = product.specifications?.items?.find((item) => 
      item.label?.toLowerCase().replace(/\s+/g, '_') === featureKey
    )
    if (spec) return spec.value || '✓'
    
    return '-'
  }

  const formatPrice = (priceRange: Product['priceRange']) => {
    if (!priceRange?.min && !priceRange?.max) return 'Check Price'
    const currency = priceRange.currency || 'USD'
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£'
    
    if (priceRange.min === priceRange.max) {
      return `${symbol}${priceRange.min}`
    }
    return `${symbol}${priceRange.min} - ${symbol}${priceRange.max}`
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <div className="min-w-full inline-block align-middle">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-200" style={{borderRadius: 'var(--border-radius)'}}>
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                Feature
              </th>
              {products.map((product, index) => (
                <th key={product?._id || index} scope="col" className="px-6 py-4 text-center text-sm font-semibold" style={{color: 'var(--color-primary)'}}>
                  {product?.name || `Product ${index + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Price Row */}
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                Price
              </td>
              {products.map((product, index) => (
                <td key={`price-${product?._id || index}`} className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="text-lg font-bold" style={{color: 'var(--color-primary)'}}>
                    {product?.priceRange ? formatPrice(product.priceRange) : 'Check Price'}
                  </div>
                </td>
              ))}
            </tr>
            
            {/* Rating Row */}
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                Rating
              </td>
              {products.map((product, index) => (
                <td key={`rating-${product?._id || index}`} className="px-6 py-4 whitespace-nowrap text-center">
                  {product?.averageRating ? (
                    <div className="flex items-center justify-center gap-1">
                      <span className="font-semibold">{product.averageRating.toFixed(1)}</span>
                      <svg className="w-4 h-4 fill-yellow-400" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                      {product.reviewCount && (
                        <span className="text-xs text-gray-500">({product.reviewCount.toLocaleString()})</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              ))}
            </tr>
            
            {/* Feature Rows */}
            {featureList.map((feature) => (
              <tr key={feature.key}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {feature.label}
                </td>
                {products.map((product, index) => (
                  <td key={`${feature.key}-${product?._id || index}`} className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                    {getFeatureValue(product, feature.key)}
                  </td>
                ))}
              </tr>
            ))}
            
            {/* CTA Row */}
            <tr className="bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                Action
              </td>
              {products.map((product, index) => (
                <td key={`cta-${product?._id || index}`} className="px-6 py-4 whitespace-nowrap text-center">
                  {product?.affiliateUrl ? (
                    <AffiliateLink
                      url={product.affiliateUrl}
                      trackingTag={product.trackingTag}
                      defaultTrackingTag={settings?.amazonAssociateTag}
                      className={getButtonClasses()}
                    >
                      {buttonText}
                    </AffiliateLink>
                  ) : (
                    <span className="text-gray-400 text-sm">N/A</span>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

