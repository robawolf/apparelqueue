export type Events = {
  // Manual triggers
  'job/generate-ideas': {data: {categoryId?: string; bucketId: string}}
  'job/create-design': {data: {ideaId: string}}
  'job/refine-idea': {data: {ideaId: string; notes: string; stage: string}}
  'job/configure-product': {data: {ideaId: string}}
  'job/configure-listing': {data: {ideaId: string}}
  'job/create-printful-product': {data: {ideaId: string}}
  'job/publish-to-shopify': {data: {ideaId: string}}
  'job/analyze-categories': {data: Record<string, never>}

  // Chain events (emitted after job completion)
  'idea.created': {data: {ideaId: string; categoryId: string}}
  'design.created': {data: {ideaId: string}}
  'product.configured': {data: {ideaId: string}}
  'listing.configured': {data: {ideaId: string}}
  'printful.created': {data: {ideaId: string; printfulProductId: string}}
  'categories.analyzed': {data: {categoryIds: string[]}}
}
