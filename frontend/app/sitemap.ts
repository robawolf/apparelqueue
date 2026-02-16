import {MetadataRoute} from 'next'
import {sanityFetch} from '@/lib/sanity/live'
import {sitemapData} from '@/lib/sanity/queries'
import {headers} from 'next/headers'

/**
 * This file creates a sitemap (sitemap.xml) for the application.
 * Includes pages, posts, and categories with appropriate priorities.
 *
 * Priority levels:
 * - Homepage: 1.0
 * - Pages: 0.8
 * - Categories: 0.7
 * - Featured posts: 0.8
 * - Product reviews: 0.7
 * - Regular posts: 0.5
 *
 * Learn more: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
 */

type SitemapItem = {
  slug: string | null
  _type: string
  _updatedAt: string | null
  featured?: boolean | null
  postType?: string | null
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const allContent = await sanityFetch({
    query: sitemapData,
  })
  const headersList = await headers()
  const sitemap: MetadataRoute.Sitemap = []
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const domain = `${protocol}://${host}`

  // Add homepage
  sitemap.push({
    url: domain,
    lastModified: new Date(),
    priority: 1,
    changeFrequency: 'daily',
  })

  if (allContent?.data?.length) {
    for (const item of allContent.data as SitemapItem[]) {
      if (!item.slug) continue

      let priority: number
      let changeFrequency:
        | 'monthly'
        | 'always'
        | 'hourly'
        | 'daily'
        | 'weekly'
        | 'yearly'
        | 'never'
        | undefined
      let url: string

      switch (item._type) {
        case 'page':
          priority = 0.8
          changeFrequency = 'monthly'
          url = `${domain}/${item.slug}`
          break

        case 'category':
          priority = 0.7
          changeFrequency = 'weekly'
          url = `${domain}/category/${item.slug}`
          break

        case 'post':
          // Featured posts get higher priority
          if (item.featured) {
            priority = 0.8
          } else if (item.postType === 'productReview' || item.postType === 'comparison') {
            // Product reviews and comparisons get higher priority than general posts
            priority = 0.7
          } else {
            priority = 0.5
          }
          changeFrequency = 'monthly'
          url = `${domain}/posts/${item.slug}`
          break

        default:
          continue // Skip unknown types
      }

      sitemap.push({
        url,
        lastModified: item._updatedAt ? new Date(item._updatedAt) : new Date(),
        priority,
        changeFrequency,
      })
    }
  }

  return sitemap
}
