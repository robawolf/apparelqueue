// Event type definitions for Inngest functions

export type Events = {
  // Manual job triggers
  'job/analyze-categories': Record<string, never>
  'job/discover-products': Record<string, never>
  'job/scrape-product': {productId?: string}
  'job/create-post-draft': {productId?: string; scrapeId?: string}
  'job/generate-post-content': {postId: string}
  'job/enhance-post': {postId?: string; productId?: string}
  'job/generate-images': {productId?: string}
  'job/refresh-product-images': {productIds?: string[]}

  // Internal chained events
  'scrape.completed': {
    productId: string
    scrapeId: string
    success: boolean
  }

  'post.draft.created': {
    postId: string
    productId: string
    scrapeId: string
  }

  'post.content.generated': {
    postId: string
    productId: string
  }

  'discovery.completed': {
    subcategoryId: string
    savedCount: number
  }
}
