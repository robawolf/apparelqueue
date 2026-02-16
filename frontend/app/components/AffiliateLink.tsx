'use client'

interface AffiliateLinkProps {
  url: string
  trackingTag?: string | null
  defaultTrackingTag?: string | null
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

/**
 * Component for Amazon affiliate links with tracking tag support
 * Applies tracking tag from props or default
 */
export default function AffiliateLink({
  url,
  trackingTag,
  defaultTrackingTag,
  children,
  className = '',
  onClick,
}: AffiliateLinkProps) {
  const buildAffiliateUrl = (baseUrl: string, tag?: string | null) => {
    try {
      const urlObj = new URL(baseUrl)
      const finalTag = tag || defaultTrackingTag || ''
      
      if (finalTag && !urlObj.searchParams.has('tag')) {
        urlObj.searchParams.set('tag', finalTag)
      }
      
      return urlObj.toString()
    } catch {
      // If URL parsing fails, return original
      return baseUrl
    }
  }

  const finalUrl = buildAffiliateUrl(url, trackingTag)

  const handleClick = () => {
    if (onClick) {
      onClick()
    }
    // Analytics tracking could be added here
  }

  return (
    <a
      href={finalUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={className}
      onClick={handleClick}
      aria-label={`Affiliate link: ${typeof children === 'string' ? children : 'View product'}`}
      style={className.includes('inline-flex') ? {
        backgroundColor: 'var(--color-primary)',
        color: 'white',
      } : undefined}
    >
      {children}
    </a>
  )
}

