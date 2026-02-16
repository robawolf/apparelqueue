import {logger} from './logger'

const SCRAPINGBEE_API_KEY = process.env.SCRAPINGBEE_API_KEY
const BASE_URL = 'https://app.scrapingbee.com/api/v1'

if (!SCRAPINGBEE_API_KEY && process.env.NODE_ENV === 'production') {
  logger.warn({}, 'SCRAPINGBEE_API_KEY not set - scraping functions will fail')
}

export interface AmazonProductResult {
  title: string
  brand: string
  price: number
  currency: string
  rating: number
  reviews_count: number
  stock: string
  images: string[]
  bullet_points: string
  product_details: Record<string, string>
  delivery: Array<{
    type?: string
    text?: string
    date?: string
    arrives?: string
    price?: number
    cost?: number
  }>
  best_sellers_rank: Array<{
    rank: number
    category: string
  }>
}

export interface AmazonSearchResult {
  products: Array<{
    asin: string
    title: string
    brand?: string
    price?: number
    rating?: number
    reviews_count?: number
    url_image?: string
  }>
}

export interface TransformedScrapeData {
  title: string
  brand: string
  images: string[]
  price: {
    amount: number
    currency: string
  }
  rating: {
    average: number
    count: number
  }
  availability: 'inStock' | 'outOfStock' | 'backorder' | 'discontinued'
  delivery: {
    type: string | null
    date: string | null
    cost: number | null
  } | null
  features: string[]
  specifications: {
    items: Array<{
      _key: string
      label: string
      value: string
    }>
  }
  bestSellerBadge: boolean
  rawData: string
}

/**
 * Scrape Amazon product details by ASIN
 */
export async function scrapeAmazonProduct(asin: string): Promise<AmazonProductResult> {
  if (!SCRAPINGBEE_API_KEY) {
    throw new Error('SCRAPINGBEE_API_KEY is required')
  }

  const params = new URLSearchParams({
    api_key: SCRAPINGBEE_API_KEY,
    query: asin,
    domain: 'com',
    light_request: 'true',
    country: 'us',
    autoselect_variant: 'true',
  })

  const url = `${BASE_URL}/amazon/product?${params}`

  logger.debug({asin}, 'Scraping Amazon product')

  const response = await fetch(url)

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ScrapingBee error: ${response.status} - ${error}`)
  }

  const data = (await response.json()) as AmazonProductResult

  logger.debug({asin, title: data.title}, 'Scraped Amazon product')

  return data
}

/**
 * Search Amazon products
 */
export async function searchAmazonProducts(
  query: string,
  options: {
    sortBy?:
      | 'most_recent'
      | 'price_low_to_high'
      | 'price_high_to_low'
      | 'featured'
      | 'average_review'
      | 'bestsellers'
    page?: number
  } = {},
): Promise<AmazonSearchResult> {
  if (!SCRAPINGBEE_API_KEY) {
    throw new Error('SCRAPINGBEE_API_KEY is required')
  }

  const params = new URLSearchParams({
    api_key: SCRAPINGBEE_API_KEY,
    query: query,
    domain: 'com',
    country: 'us',
  })

  if (options.sortBy) {
    params.set('sort_by', options.sortBy)
  }

  if (options.page) {
    params.set('page', String(options.page))
  }

  const url = `${BASE_URL}/amazon/search?${params}`

  logger.debug({query, options}, 'Searching Amazon products')

  const response = await fetch(url)

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ScrapingBee error: ${response.status} - ${error}`)
  }

  const data = (await response.json()) as AmazonSearchResult

  logger.debug({query, resultCount: data.products?.length || 0}, 'Amazon search complete')

  return data
}

/**
 * Transform raw ScrapingBee response to Sanity scrape format
 */
export function transformScrapeData(data: AmazonProductResult): TransformedScrapeData {
  // Helper to generate unique keys
  const generateKey = () => Math.random().toString(36).substring(2, 10)

  // Parse bullet_points string into array
  let features: string[] = []
  if (data.bullet_points) {
    features = data.bullet_points
      .split(/[\n•]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  }

  // Transform product_details object to specifications array WITH _key
  const specifications: TransformedScrapeData['specifications'] = {items: []}
  if (data.product_details && typeof data.product_details === 'object') {
    specifications.items = Object.entries(data.product_details).map(([key, value]) => ({
      _key: generateKey(),
      label: key,
      value: String(value),
    }))
  }

  // Map stock to availability enum
  const availabilityMap: Record<string, TransformedScrapeData['availability']> = {
    in_stock: 'inStock',
    'In Stock': 'inStock',
    out_of_stock: 'outOfStock',
    'Out of Stock': 'outOfStock',
    backorder: 'backorder',
    discontinued: 'discontinued',
  }
  const availability = availabilityMap[data.stock] || 'inStock'

  // Parse delivery info (handle null values)
  let delivery: TransformedScrapeData['delivery'] = null
  if (data.delivery && Array.isArray(data.delivery) && data.delivery.length > 0) {
    const d = data.delivery[0]
    delivery = {
      type: d.type || d.text || null,
      date: d.date || d.arrives || null,
      cost: typeof d.price === 'number' ? d.price : typeof d.cost === 'number' ? d.cost : null,
    }
  }

  return {
    title: data.title || '',
    brand: data.brand || '',
    images: data.images || [],
    price: {
      amount: data.price || 0,
      currency: data.currency || 'USD',
    },
    rating: {
      average: data.rating || 0,
      count: data.reviews_count || 0,
    },
    availability,
    delivery,
    features,
    specifications,
    bestSellerBadge: Array.isArray(data.best_sellers_rank) && data.best_sellers_rank.length > 0,
    rawData: JSON.stringify(data),
  }
}
