import {logger} from './logger'

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY
const PRINTFUL_STORE_ID = process.env.PRINTFUL_STORE_ID
const PRINTFUL_BASE_URL = 'https://api.printful.com'

function getHeaders(): Record<string, string> {
  if (!PRINTFUL_API_KEY) {
    throw new Error('PRINTFUL_API_KEY is required')
  }
  return {
    Authorization: `Bearer ${PRINTFUL_API_KEY}`,
    'Content-Type': 'application/json',
    ...(PRINTFUL_STORE_ID ? {'X-PF-Store-Id': PRINTFUL_STORE_ID} : {}),
  }
}

// --- Catalog & Variants ---

export interface CatalogProduct {
  id: number
  title: string
  type: string
  brand: string
  model: string
  image: string
}

export async function getCatalogProducts(): Promise<CatalogProduct[]> {
  const response = await fetch(`${PRINTFUL_BASE_URL}/v2/catalog-products`, {
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Printful API error: ${response.status}`)
  }

  const data = (await response.json()) as {data: CatalogProduct[]}
  return data.data
}

export interface CatalogVariant {
  id: number
  product_id: number
  name: string
  size: string
  color: string
  color_code: string
  price: string
  in_stock: boolean
}

export async function getCatalogVariants(catalogId: number): Promise<CatalogVariant[]> {
  const response = await fetch(
    `${PRINTFUL_BASE_URL}/v2/catalog-products/${catalogId}/catalog-variants`,
    {headers: getHeaders()},
  )

  if (!response.ok) {
    throw new Error(`Printful API error: ${response.status}`)
  }

  const data = (await response.json()) as {data: CatalogVariant[]}
  return data.data
}

export interface PrintfileSpec {
  placement: string
  width: number
  height: number
  dpi: number
}

export async function getProductPrintfiles(catalogId: number): Promise<PrintfileSpec[]> {
  const response = await fetch(
    `${PRINTFUL_BASE_URL}/v2/catalog-products/${catalogId}/catalog-printfiles`,
    {headers: getHeaders()},
  )

  if (!response.ok) {
    throw new Error(`Printful API error: ${response.status}`)
  }

  const data = (await response.json()) as {data: PrintfileSpec[]}
  return data.data
}

// --- File Management ---

export async function uploadDesignFile(imageUrl: string): Promise<{id: number; url: string}> {
  logger.info({}, 'Uploading design file to Printful')

  const response = await fetch(`${PRINTFUL_BASE_URL}/v2/files`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({url: imageUrl}),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Printful upload error: ${response.status} - ${error}`)
  }

  const data = (await response.json()) as {data: {id: number; url: string}}
  return data.data
}

export async function getFileStatus(
  fileId: number,
): Promise<{id: number; status: string; url: string}> {
  const response = await fetch(`${PRINTFUL_BASE_URL}/v2/files/${fileId}`, {
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Printful API error: ${response.status}`)
  }

  const data = (await response.json()) as {data: {id: number; status: string; url: string}}
  return data.data
}

// --- Product Creation ---

export interface CreateSyncProductParams {
  externalId: string
  title: string
  description: string
  catalogProductId: number
  variants: Array<{
    variantId: number
    retailPrice: string
    files: Array<{
      placement: string
      url: string
    }>
  }>
}

export async function createSyncProduct(
  params: CreateSyncProductParams,
): Promise<{id: number; externalId: string}> {
  logger.info({title: params.title}, 'Creating Printful sync product')

  const response = await fetch(`${PRINTFUL_BASE_URL}/v2/store/products`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      sync_product: {
        external_id: params.externalId,
        name: params.title,
        description: params.description,
      },
      sync_variants: params.variants.map((v) => ({
        external_id: `${params.externalId}-${v.variantId}`,
        variant_id: v.variantId,
        retail_price: v.retailPrice,
        files: v.files.map((f) => ({
          type: f.placement,
          url: f.url,
        })),
      })),
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Printful create product error: ${response.status} - ${error}`)
  }

  const data = (await response.json()) as {
    data: {id: number; external_id: string}
  }

  logger.info({productId: data.data.id}, 'Printful sync product created')
  return {id: data.data.id, externalId: data.data.external_id}
}

// --- Product Status ---

export async function getSyncProduct(
  printfulProductId: string,
): Promise<{id: number; synced: number; externalId: string}> {
  const response = await fetch(
    `${PRINTFUL_BASE_URL}/v2/store/products/${printfulProductId}`,
    {headers: getHeaders()},
  )

  if (!response.ok) {
    throw new Error(`Printful API error: ${response.status}`)
  }

  const data = (await response.json()) as {
    data: {id: number; synced: number; external_id: string}
  }
  return {id: data.data.id, synced: data.data.synced, externalId: data.data.external_id}
}
