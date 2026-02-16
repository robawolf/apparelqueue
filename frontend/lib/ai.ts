import OpenAI from 'openai'
import {logger} from './logger'

// OpenRouter client (all text inference)
const openrouterApiKey = process.env.OPENROUTER_API_KEY
export const openrouter = openrouterApiKey
  ? new OpenAI({
      apiKey: openrouterApiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    })
  : null

const defaultOpenrouterModel = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat'

/**
 * Generate text using any model via OpenRouter
 */
export async function generateWithOpenRouter(
  prompt: string,
  options: {
    model?: string
    systemPrompt?: string
    maxTokens?: number
    temperature?: number
  } = {},
): Promise<string> {
  if (!openrouter) {
    throw new Error('OPENROUTER_API_KEY is required for OpenRouter generation')
  }

  const {
    model = defaultOpenrouterModel,
    systemPrompt,
    maxTokens = 4096,
    temperature = 0.7,
  } = options

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []

  if (systemPrompt) {
    messages.push({role: 'system', content: systemPrompt})
  }

  messages.push({role: 'user', content: prompt})

  logger.info({model, promptLength: prompt.length}, 'Generating with OpenRouter')

  const response = await openrouter.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  })

  const content = response.choices[0]?.message?.content || ''

  logger.info(
    {model, responseLength: content.length, tokens: response.usage?.total_tokens},
    'OpenRouter generation complete',
  )

  return content
}

/**
 * Parse JSON from AI response (handles markdown code blocks)
 */
export function parseJsonResponse<T>(response: string): T {
  let cleaned = response.trim()

  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3)
  }

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3)
  }

  return JSON.parse(cleaned.trim()) as T
}

// --- Prompt Builders (Brand + Category/Idea + Bucket hierarchy) ---

interface BrandContext {
  verbiagePromptContext?: string | null
  toneGuidelines?: string | null
  graphicThemes?: string | null
  defaultApparelTypes?: string
  defaultMarkupPercent?: number
}

interface CategoryContext {
  name: string
  promptContext?: string | null
}

interface BucketContext {
  name: string
  prompt: string
}

interface RevisionEntry {
  stage: string
  type: 'forward' | 'revision'
  notes: string
  timestamp: string
}

/**
 * Build system prompt for phrase generation (Stage 1)
 */
export function generatePhrasePrompt(
  brand: BrandContext,
  category: CategoryContext,
  bucket: BucketContext,
  existingPhrases: string[],
): {systemPrompt: string; userPrompt: string} {
  const systemPrompt = [
    'You are a creative copywriter specializing in culturally authentic apparel phrases.',
    brand.verbiagePromptContext || '',
    brand.toneGuidelines ? `\nTone guidelines: ${brand.toneGuidelines}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const userPrompt = [
    `Category: ${category.name}`,
    category.promptContext ? `Context: ${category.promptContext}` : '',
    `\nCreative directive: ${bucket.prompt}`,
    existingPhrases.length > 0
      ? `\nAvoid these existing phrases:\n${existingPhrases.map((p) => `- ${p}`).join('\n')}`
      : '',
    '\nGenerate phrases as JSON array. Each item: { "phrase": string, "explanation": string, "graphicDescription": string, "graphicStyle": string, "apparelType": string }',
  ]
    .filter(Boolean)
    .join('\n')

  return {systemPrompt, userPrompt}
}

/**
 * Build prompt for design generation (Stage 2)
 */
export function suggestGraphicPrompt(
  idea: {phrase: string; graphicDescription?: string | null; graphicStyle?: string | null},
  brand: BrandContext,
  bucket: BucketContext,
  forwardGuidance?: string,
): string {
  const parts = [
    `Create a design for the phrase: "${idea.phrase}"`,
    idea.graphicDescription ? `Concept: ${idea.graphicDescription}` : '',
    idea.graphicStyle ? `Style: ${idea.graphicStyle}` : '',
    brand.graphicThemes ? `Available styles: ${brand.graphicThemes}` : '',
    `\nDesign directive: ${bucket.prompt}`,
    forwardGuidance ? `\nAdditional guidance: ${forwardGuidance}` : '',
  ]

  return parts.filter(Boolean).join('\n')
}

/**
 * Build prompt for product configuration suggestions (Stage 3)
 */
export function suggestProductPrompt(
  idea: {phrase: string; apparelType?: string | null; designFileUrl?: string | null},
  brand: BrandContext,
  bucket: BucketContext,
  forwardGuidance?: string,
): {systemPrompt: string; userPrompt: string} {
  const systemPrompt = [
    'You are a product configuration specialist for print-on-demand apparel.',
    `Available apparel types: ${brand.defaultApparelTypes || '["t-shirt","hoodie","tank-top"]'}`,
    `Default markup: ${brand.defaultMarkupPercent || 50}%`,
  ].join('\n')

  const userPrompt = [
    `Configure products for phrase: "${idea.phrase}"`,
    idea.apparelType ? `Suggested apparel: ${idea.apparelType}` : '',
    `\nProduct directive: ${bucket.prompt}`,
    forwardGuidance ? `\nAdditional guidance: ${forwardGuidance}` : '',
    '\nRespond as JSON: { "suggestions": [{ "apparelType": string, "colors": string[], "sizes": string[], "retailPrice": string, "reasoning": string }] }',
  ]
    .filter(Boolean)
    .join('\n')

  return {systemPrompt, userPrompt}
}

/**
 * Build prompt for listing copy generation (Stage 4)
 */
export function generateListingPrompt(
  idea: {phrase: string; apparelType?: string | null; productTitle?: string | null},
  brand: BrandContext,
  bucket: BucketContext,
  forwardGuidance?: string,
): {systemPrompt: string; userPrompt: string} {
  const systemPrompt = [
    'You are an e-commerce copywriter specializing in culturally authentic apparel listings.',
    brand.toneGuidelines ? `Tone: ${brand.toneGuidelines}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const userPrompt = [
    `Write product listing for: "${idea.phrase}"`,
    idea.apparelType ? `Product type: ${idea.apparelType}` : '',
    `\nCopy directive: ${bucket.prompt}`,
    forwardGuidance ? `\nAdditional guidance: ${forwardGuidance}` : '',
    '\nRespond as JSON: { "options": [{ "title": string, "description": string, "tags": string[], "angle": string }] }',
  ]
    .filter(Boolean)
    .join('\n')

  return {systemPrompt, userPrompt}
}

/**
 * Build prompt for idea refinement at any stage
 */
export function refineIdeaPrompt(
  idea: {phrase: string; stage: string; revisionHistory?: string | null},
  brand: BrandContext,
  bucket: BucketContext,
  newGuidance: string,
): {systemPrompt: string; userPrompt: string} {
  const history: RevisionEntry[] = idea.revisionHistory
    ? JSON.parse(idea.revisionHistory)
    : []

  const systemPrompt = [
    'You are refining a product idea based on admin feedback.',
    brand.verbiagePromptContext || '',
    brand.toneGuidelines ? `Tone: ${brand.toneGuidelines}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  const userPrompt = [
    `Current phrase: "${idea.phrase}"`,
    `Current stage: ${idea.stage}`,
    `\nBucket directive: ${bucket.prompt}`,
    `\nNew feedback: ${newGuidance}`,
    history.length > 0
      ? `\nPrevious guidance history (newest first):\n${history.map((h) => `- [${h.stage}/${h.type}] ${h.notes}`).join('\n')}`
      : '',
    '\nRegenerate with improvements based on all feedback.',
  ]
    .filter(Boolean)
    .join('\n')

  return {systemPrompt, userPrompt}
}
