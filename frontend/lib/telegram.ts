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

export interface SendDraftNotificationParams {
  postTitle: string
  postSlug: string
  productName?: string
  asin?: string
}

export interface SendProductDiscoveryParams {
  savedCount: number
  targetCategory: string
  topProduct?: {
    name: string
    score: number
  }
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

  logger.debug({chatId: TELEGRAM_CHAT_ID}, 'Sending Telegram message')

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

    logger.debug({}, 'Telegram message sent successfully')
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
 * Send notification for a new draft post
 */
export async function sendDraftPostNotification(
  params: SendDraftNotificationParams,
): Promise<boolean> {
  const {postTitle, postSlug, productName, asin} = params

  const postUrl = `${PUBLIC_SITE_URL}/posts/${postSlug}`

  let message = `<u>📝 Draft Post Ready</u>\n\n`
  message += `<b>${escapeHtml(postTitle)}</b>\n`

  message += `\n<a href="${postUrl}">Review in Admin</a>`

  return sendTelegramMessage(message, {parseMode: 'HTML'})
}

/**
 * Send notification for newly discovered products
 */
export async function sendProductDiscoveryNotification(
  params: SendProductDiscoveryParams,
): Promise<boolean> {
  const {savedCount, targetCategory, topProduct} = params
  const adminUrl = `${PUBLIC_SITE_URL}/admin/products`
  

  let message = `<u>🆕 New Products Discovered</u>\n\n`
  if (topProduct) {
    message += `<b>${escapeHtml(topProduct.name)}</b>\n\n`
  }
  message += `<a href="${adminUrl}">Review in Admin</a>\n`

  return sendTelegramMessage(message, {parseMode: 'HTML'})
}
