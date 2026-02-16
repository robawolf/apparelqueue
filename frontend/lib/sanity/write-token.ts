import 'server-only'

export const writeToken = process.env.SANITY_API_WRITE_TOKEN

if (!writeToken) {
  throw new Error('Missing SANITY_API_WRITE_TOKEN')
}
