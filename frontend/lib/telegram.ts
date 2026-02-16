import {logger} from './logger'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID
const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL || 'http://localhost:3000'

if (!TELEGRAM_BOT_TOKEN && process.env.NODE_ENV === 'production') {
  logger.warn({}, 'TELEGRAM_BOT_TOKEN not set - Telegram notifications will be skipped')
}
if (!TELEGRAM_CHAT_ID && process.env.NODE_ENV === 'production') {
  logger.warn({}, 'TELEGRAM_CHAT_ID not set - Telegram notifications will be skipped')
}

export interface TelegramMessageOptions {
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
  disableWebPagePreview?: boolean
}

/**
 * Send a message to Telegram
 */
export async function sendTelegramMessage(
  text: string,
  options: TelegramMessageOptions = {},
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    logger.warn({}, 'Telegram credentials not configured, skipping notification')
    return false
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`

  const body = {
    chat_id: TELEGRAM_CHAT_ID,
    text,
    parse_mode: options.parseMode || 'HTML',
    disable_web_page_preview: options.disableWebPagePreview ?? false,
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Telegram API error: ${response.status} - ${error}`)
    }

    return true
  } catch (error) {
    logger.error({error}, 'Failed to send Telegram message')
    return false
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Send notification when ideas are ready for review at a stage
 */
export async function sendStageNotification(
  idea: {phrase: string; stage: string; id: string},
  count?: number,
): Promise<boolean> {
  const adminUrl = `${PUBLIC_SITE_URL}/admin/${idea.stage}s`

  const stageLabels: Record<string, string> = {
    phrase: 'Phrases',
    design: 'Designs',
    product: 'Products',
    listing: 'Listings',
    publish: 'Publish',
  }

  const stageLabel = stageLabels[idea.stage] || idea.stage

  let message = `<b>${stageLabel} Ready for Review</b>\n\n`
  if (count && count > 1) {
    message += `${count} new items in the ${stageLabel} queue\n`
  }
  message += `<i>${escapeHtml(idea.phrase)}</i>\n`
  message += `\n<a href="${adminUrl}">Review in Admin</a>`

  return sendTelegramMessage(message, {parseMode: 'HTML'})
}

/**
 * Send notification when a product is published to Shopify
 */
export async function sendPublishedNotification(idea: {
  phrase: string
  shopifyProductUrl?: string | null
  productTitle?: string | null
}): Promise<boolean> {
  let message = `<b>Product Published!</b>\n\n`
  message += `<i>${escapeHtml(idea.productTitle || idea.phrase)}</i>\n`

  if (idea.shopifyProductUrl) {
    message += `\n<a href="${idea.shopifyProductUrl}">View on Store</a>`
  }

  return sendTelegramMessage(message, {parseMode: 'HTML'})
}
