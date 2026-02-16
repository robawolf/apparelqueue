import {logger} from './logger'

const CANVA_API_KEY = process.env.CANVA_API_KEY
const CANVA_BRAND_KIT_ID = process.env.CANVA_BRAND_KIT_ID
const CANVA_BASE_URL = 'https://api.canva.com/rest/v1'

interface CanvaHeaders {
  Authorization: string
  'Content-Type': string
}

function getHeaders(): CanvaHeaders {
  if (!CANVA_API_KEY) {
    throw new Error('CANVA_API_KEY is required')
  }
  return {
    Authorization: `Bearer ${CANVA_API_KEY}`,
    'Content-Type': 'application/json',
  }
}

export interface DesignCustomization {
  text?: Record<string, string>
  images?: Record<string, string>
  colors?: Record<string, string>
}

/**
 * Create a design from a Canva template
 */
export async function createDesignFromTemplate(
  templateId: string,
  customizations: DesignCustomization,
): Promise<{designId: string; editUrl: string}> {
  logger.info({templateId}, 'Creating Canva design from template')

  const response = await fetch(`${CANVA_BASE_URL}/designs`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      design_type: {type: 'preset', name: 'custom'},
      asset_id: templateId,
      brand_template_data: customizations,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Canva API error: ${response.status} - ${error}`)
  }

  const data = (await response.json()) as {design: {id: string; urls: {edit_url: string}}}

  logger.info({designId: data.design.id}, 'Canva design created')
  return {
    designId: data.design.id,
    editUrl: data.design.urls.edit_url,
  }
}

/**
 * Export a design as high-res PNG for print
 */
export async function exportDesign(
  designId: string,
  format: 'png' | 'pdf' = 'png',
): Promise<string> {
  logger.info({designId, format}, 'Exporting Canva design')

  // Start export job
  const response = await fetch(`${CANVA_BASE_URL}/designs/${designId}/exports`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      format: {type: format},
      quality: 'print',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Canva export error: ${response.status} - ${error}`)
  }

  const data = (await response.json()) as {job: {id: string; status: string}}

  // Poll for completion
  let exportUrl = ''
  for (let i = 0; i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const statusResponse = await fetch(
      `${CANVA_BASE_URL}/designs/${designId}/exports/${data.job.id}`,
      {headers: getHeaders()},
    )

    const statusData = (await statusResponse.json()) as {
      job: {status: string; urls?: Array<{url: string}>}
    }

    if (statusData.job.status === 'completed' && statusData.job.urls?.[0]) {
      exportUrl = statusData.job.urls[0].url
      break
    }

    if (statusData.job.status === 'failed') {
      throw new Error('Canva export job failed')
    }
  }

  if (!exportUrl) {
    throw new Error('Canva export timed out')
  }

  logger.info({designId}, 'Canva design exported')
  return exportUrl
}

/**
 * Get shareable preview/edit URL for a design
 */
export async function getDesignUrl(designId: string): Promise<string> {
  const response = await fetch(`${CANVA_BASE_URL}/designs/${designId}`, {
    headers: getHeaders(),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Canva API error: ${response.status} - ${error}`)
  }

  const data = (await response.json()) as {design: {urls: {edit_url: string}}}
  return data.design.urls.edit_url
}

/**
 * List available templates from the brand kit
 */
export async function listTemplates(): Promise<
  Array<{id: string; name: string; thumbnailUrl: string}>
> {
  const response = await fetch(
    `${CANVA_BASE_URL}/brand-templates${CANVA_BRAND_KIT_ID ? `?brand_id=${CANVA_BRAND_KIT_ID}` : ''}`,
    {headers: getHeaders()},
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Canva API error: ${response.status} - ${error}`)
  }

  const data = (await response.json()) as {
    items: Array<{id: string; name: string; thumbnail: {url: string}}>
  }

  return data.items.map((item) => ({
    id: item.id,
    name: item.name,
    thumbnailUrl: item.thumbnail.url,
  }))
}
