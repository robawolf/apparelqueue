import OpenAI from 'openai'
import {logger} from './logger'

// OpenAI client (for GPT models)
const openaiApiKey = process.env.OPENAI_API_KEY
export const openai = openaiApiKey ? new OpenAI({apiKey: openaiApiKey}) : null

// OpenRouter client (for DeepSeek and other models)
const openrouterApiKey = process.env.OPENROUTER_API_KEY
export const openrouter = openrouterApiKey
  ? new OpenAI({
      apiKey: openrouterApiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    })
  : null

// Google Gemini API key
const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY

/**
 * Generate text using OpenAI GPT models
 */
export async function generateWithGPT(
  prompt: string,
  options: {
    model?: string
    systemPrompt?: string
    maxTokens?: number
    temperature?: number
    responseFormat?: 'text' | 'json_object'
  } = {},
): Promise<string> {
  if (!openai) {
    throw new Error('OPENAI_API_KEY is required for GPT generation')
  }

  const {
    model = 'gpt-4o-mini',
    systemPrompt,
    maxTokens = 4096,
    temperature = 0.7,
    responseFormat = 'text',
  } = options

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []

  if (systemPrompt) {
    messages.push({role: 'system', content: systemPrompt})
  }

  messages.push({role: 'user', content: prompt})

  logger.debug({model, promptLength: prompt.length}, 'Generating with GPT')

  const response = await openai.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
    response_format: responseFormat === 'json_object' ? {type: 'json_object'} : undefined,
  })

  const content = response.choices[0]?.message?.content || ''

  logger.debug(
    {model, responseLength: content.length, tokens: response.usage?.total_tokens},
    'GPT generation complete',
  )

  return content
}

// Default model for OpenRouter (can be overridden via OPENROUTER_MODEL env var)
const defaultOpenrouterModel = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat'

/**
 * Generate text using any model via OpenRouter (configurable)
 * Model is selected via OPENROUTER_MODEL environment variable
 * Defaults to deepseek/deepseek-chat if not set
 *
 * Available models: https://openrouter.ai/models
 * Examples: anthropic/claude-3.5-sonnet, openai/gpt-4-turbo, deepseek/deepseek-chat
 */
export async function generateWithOpenRouter(
  prompt: string,
  options: {
    model?: string // Override OPENROUTER_MODEL env var
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
 * Generate text using DeepSeek via OpenRouter
 * @deprecated Use generateWithOpenRouter() instead for configurable model selection
 */
export async function generateWithDeepSeek(
  prompt: string,
  options: {
    model?: string
    systemPrompt?: string
    maxTokens?: number
    temperature?: number
  } = {},
): Promise<string> {
  if (!openrouter) {
    throw new Error('OPENROUTER_API_KEY is required for DeepSeek generation')
  }

  const {
    model = 'deepseek/deepseek-chat',
    systemPrompt,
    maxTokens = 4096,
    temperature = 0.7,
  } = options

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []

  if (systemPrompt) {
    messages.push({role: 'system', content: systemPrompt})
  }

  messages.push({role: 'user', content: prompt})

  logger.debug({model, promptLength: prompt.length}, 'Generating with DeepSeek')

  const response = await openrouter.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  })

  const content = response.choices[0]?.message?.content || ''

  logger.debug(
    {model, responseLength: content.length, tokens: response.usage?.total_tokens},
    'DeepSeek generation complete',
  )

  return content
}

/**
 * Generate or edit images using Google Gemini
 */
export async function generateImageWithGemini(
  prompt: string,
  options: {
    sourceImageUrl?: string
    model?: string
  } = {},
): Promise<{imageUrl: string; mimeType: string}> {
  if (!geminiApiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY is required for Gemini image generation')
  }

  const {sourceImageUrl, model = 'gemini-2.0-flash-exp'} = options

  logger.debug({model, hasSourceImage: !!sourceImageUrl}, 'Generating image with Gemini')

  // Build request parts
  const parts: Array<{text?: string; inlineData?: {mimeType: string; data: string}}> = []

  // If source image provided, fetch and include it
  if (sourceImageUrl) {
    const imageResponse = await fetch(sourceImageUrl)
    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg'

    parts.push({
      inlineData: {
        mimeType,
        data: base64Image,
      },
    })
  }

  parts.push({text: prompt})

  // Call Gemini API
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{parts}],
        generationConfig: {
          responseModalities: ['image', 'text'],
          responseMimeType: 'image/png',
        },
      }),
    },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${error}`)
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: {mimeType: string; data: string}
        }>
      }
    }>
  }

  // Extract image from response
  const candidate = data.candidates?.[0]
  const imagePart = candidate?.content?.parts?.find(
    (p: {inlineData?: {mimeType: string; data: string}}) => p.inlineData,
  )

  if (!imagePart?.inlineData) {
    throw new Error('No image generated by Gemini')
  }

  // Return as data URL
  const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`

  logger.debug({model}, 'Gemini image generation complete')

  return {
    imageUrl,
    mimeType: imagePart.inlineData.mimeType,
  }
}

/**
 * Parse JSON from AI response (handles markdown code blocks)
 */
export function parseJsonResponse<T>(response: string): T {
  // Remove markdown code blocks if present
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
