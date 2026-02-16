/**
 * Structured Data (JSON-LD) components for SEO
 *
 * These components generate Schema.org structured data that helps search engines
 * understand your content, potentially resulting in rich snippets in search results.
 *
 * Usage:
 * - OrganizationSchema: Add to root layout for site identity
 * - BreadcrumbSchema: Add to category and post pages for navigation
 * - ArticleSchema: Add to all post pages
 * - ReviewSchema: Add to product review posts (postType === 'productReview')
 * - ItemListSchema: Add to category listing pages
 */

interface OrganizationSchemaProps {
  name: string
  url: string
  logo?: string
  description?: string
  sameAs?: string[] // Social media URLs
}

export function OrganizationSchema({
  name,
  url,
  logo,
  description,
  sameAs = [],
}: OrganizationSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    ...(logo && {logo}),
    ...(description && {description}),
    ...(sameAs.length > 0 && {sameAs}),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{__html: JSON.stringify(schema)}}
    />
  )
}

interface BreadcrumbItem {
  name: string
  url: string
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[]
}

export function BreadcrumbSchema({items}: BreadcrumbSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{__html: JSON.stringify(schema)}}
    />
  )
}

interface ArticleSchemaProps {
  title: string
  description: string
  url: string
  image?: string
  datePublished: string
  dateModified?: string
  author: {
    name: string
    url?: string
  }
  publisher: {
    name: string
    logo?: string
  }
}

export function ArticleSchema({
  title,
  description,
  url,
  image,
  datePublished,
  dateModified,
  author,
  publisher,
}: ArticleSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url,
    ...(image && {image}),
    datePublished,
    ...(dateModified && {dateModified}),
    author: {
      '@type': 'Person',
      name: author.name,
      ...(author.url && {url: author.url}),
    },
    publisher: {
      '@type': 'Organization',
      name: publisher.name,
      ...(publisher.logo && {
        logo: {
          '@type': 'ImageObject',
          url: publisher.logo,
        },
      }),
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{__html: JSON.stringify(schema)}}
    />
  )
}

interface ReviewSchemaProps {
  itemReviewed: {
    name: string
    brand?: string
    image?: string
    description?: string
    sku?: string // ASIN
  }
  reviewRating?: {
    ratingValue: number // 1-5
    bestRating?: number
    worstRating?: number
  }
  author: {
    name: string
  }
  datePublished: string
  reviewBody?: string
  url: string
  publisher: {
    name: string
  }
}

export function ReviewSchema({
  itemReviewed,
  reviewRating,
  author,
  datePublished,
  reviewBody,
  url,
  publisher,
}: ReviewSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'Product',
      name: itemReviewed.name,
      ...(itemReviewed.brand && {
        brand: {
          '@type': 'Brand',
          name: itemReviewed.brand,
        },
      }),
      ...(itemReviewed.image && {image: itemReviewed.image}),
      ...(itemReviewed.description && {description: itemReviewed.description}),
      ...(itemReviewed.sku && {sku: itemReviewed.sku}),
    },
    ...(reviewRating && {
      reviewRating: {
        '@type': 'Rating',
        ratingValue: reviewRating.ratingValue,
        bestRating: reviewRating.bestRating || 5,
        worstRating: reviewRating.worstRating || 1,
      },
    }),
    author: {
      '@type': 'Person',
      name: author.name,
    },
    datePublished,
    ...(reviewBody && {reviewBody}),
    url,
    publisher: {
      '@type': 'Organization',
      name: publisher.name,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{__html: JSON.stringify(schema)}}
    />
  )
}

interface ItemListItem {
  name: string
  url: string
  image?: string
  description?: string
}

interface ItemListSchemaProps {
  name: string
  description?: string
  items: ItemListItem[]
  url: string
}

export function ItemListSchema({
  name,
  description,
  items,
  url,
}: ItemListSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    ...(description && {description}),
    url,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Article',
        name: item.name,
        url: item.url,
        ...(item.image && {image: item.image}),
        ...(item.description && {description: item.description}),
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{__html: JSON.stringify(schema)}}
    />
  )
}

interface WebSiteSchemaProps {
  name: string
  url: string
  description?: string
  potentialAction?: {
    target: string // Search URL template with {search_term_string}
    queryInput: string
  }
}

export function WebSiteSchema({
  name,
  url,
  description,
  potentialAction,
}: WebSiteSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    ...(description && {description}),
    ...(potentialAction && {
      potentialAction: {
        '@type': 'SearchAction',
        target: potentialAction.target,
        'query-input': potentialAction.queryInput,
      },
    }),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{__html: JSON.stringify(schema)}}
    />
  )
}
