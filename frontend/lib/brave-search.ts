import {logger} from './logger'

const BRAVE_SEARCH_API_KEY = process.env.BRAVE_SEARCH_API_KEY
const BASE_URL = 'https://api.search.brave.com/res/v1'

if (!BRAVE_SEARCH_API_KEY && process.env.NODE_ENV === 'production') {
  logger.warn({}, 'BRAVE_SEARCH_API_KEY not set - search functions will fail')
}

export interface BraveSearchResult {
  title: string
  url: string
  description: string
  age?: string
}

export interface BraveSearchResponse {
  query: {
    original: string
  }
  web?: {
    results: BraveSearchResult[]
  }
}

/**
 * Search the web using Brave Search API
 */
export async function searchWeb(
  query: string,
  options: {
    count?: number
    freshness?: 'pd' | 'pw' | 'pm' | 'py' // past day, week, month, year
  } = {},
): Promise<BraveSearchResult[]> {
  if (!BRAVE_SEARCH_API_KEY) {
    throw new Error('BRAVE_SEARCH_API_KEY is required')
  }

  const {count = 10, freshness} = options

  const params = new URLSearchParams({
    q: query,
    count: String(count),
  })

  if (freshness) {
    params.set('freshness', freshness)
  }

  const url = `${BASE_URL}/web/search?${params}`

  logger.debug({query, count}, 'Searching with Brave')

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': BRAVE_SEARCH_API_KEY,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Brave Search error: ${response.status} - ${error}`)
  }

  const data = (await response.json()) as BraveSearchResponse

  const results = data.web?.results || []

  logger.debug({query, resultCount: results.length}, 'Brave search complete')

  return results
}

/**
 * Search for product reviews and information
 */
export async function searchProductInfo(
  productName: string,
  brand?: string,
): Promise<BraveSearchResult[]> {
  const queries = [
    `${productName} ${brand || ''} review`,
    `${productName} ${brand || ''} pros cons`,
    `best ${productName} alternatives`,
  ]

  const allResults: BraveSearchResult[] = []

  for (const query of queries) {
    try {
      const results = await searchWeb(query, {count: 5, freshness: 'py'})
      allResults.push(...results)
    } catch (error) {
      logger.warn({query, error}, 'Search query failed')
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>()
  return allResults.filter((result) => {
    if (seen.has(result.url)) {
      return false
    }
    seen.add(result.url)
    return true
  })
}
