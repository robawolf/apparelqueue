import {MetadataRoute} from 'next'
import {headers} from 'next/headers'

/**
 * Generates robots.txt for search engine crawlers.
 * - Allows all pages except admin, API, and studio routes
 * - Points to sitemap for efficient crawling
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/studio/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
