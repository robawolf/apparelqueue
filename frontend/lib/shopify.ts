import {logger} from './logger'

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN
const SHOPIFY_ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN
const SHOPIFY_API_VERSION = '2024-10'

function getBaseUrl(): string {
  if (!SHOPIFY_STORE_DOMAIN) {
    throw new Error('SHOPIFY_STORE_DOMAIN is required')
  }
  return `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}`
}

function getHeaders(): Record<string, string> {
  if (!SHOPIFY_ADMIN_API_TOKEN) {
    throw new Error('SHOPIFY_ADMIN_API_TOKEN is required')
  }
  return {
    'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN,
    'Content-Type': 'application/json',
  }
}

export interface ShopifyProduct {
  id: number
  title: string
  handle: string
  status: string
  tags: string
  body_html: string
}

/**
 * Get a product by Shopify ID
 */
export async function getProduct(shopifyProductId: string): Promise<ShopifyProduct> {
  const response = await fetch(`${getBaseUrl()}/products/${shopifyProductId}.json`, {
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status}`)
  }

  const data = (await response.json()) as {product: ShopifyProduct}
  return data.product
}

/**
 * Update product metadata (tags, description, SEO)
 */
export async function updateProductMetadata(
  shopifyProductId: string,
  metadata: {
    tags?: string[]
    bodyHtml?: string
    title?: string
    metafieldsGlobalTitleTag?: string
    metafieldsGlobalDescriptionTag?: string
  },
): Promise<void> {
  logger.info({shopifyProductId}, 'Updating Shopify product metadata')

  const product: Record<string, unknown> = {}

  if (metadata.tags) {
    product.tags = metadata.tags.join(', ')
  }
  if (metadata.bodyHtml) {
    product.body_html = metadata.bodyHtml
  }
  if (metadata.title) {
    product.title = metadata.title
  }
  if (metadata.metafieldsGlobalTitleTag) {
    product.metafields_global_title_tag = metadata.metafieldsGlobalTitleTag
  }
  if (metadata.metafieldsGlobalDescriptionTag) {
    product.metafields_global_description_tag = metadata.metafieldsGlobalDescriptionTag
  }

  const response = await fetch(`${getBaseUrl()}/products/${shopifyProductId}.json`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({product}),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Shopify update error: ${response.status} - ${error}`)
  }

  logger.info({shopifyProductId}, 'Shopify product metadata updated')
}

/**
 * Add product to a collection
 */
export async function addProductToCollection(
  productId: string,
  collectionId: string,
): Promise<void> {
  logger.info({productId, collectionId}, 'Adding product to Shopify collection')

  const response = await fetch(`${getBaseUrl()}/collects.json`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      collect: {
        product_id: parseInt(productId),
        collection_id: parseInt(collectionId),
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Shopify collect error: ${response.status} - ${error}`)
  }
}

/**
 * List Shopify collections
 */
export async function listCollections(): Promise<
  Array<{id: number; title: string; handle: string}>
> {
  const response = await fetch(`${getBaseUrl()}/custom_collections.json`, {
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status}`)
  }

  const data = (await response.json()) as {
    custom_collections: Array<{id: number; title: string; handle: string}>
  }
  return data.custom_collections
}
