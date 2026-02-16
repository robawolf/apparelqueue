import {createClient, type SanityClient} from '@sanity/client'
import {projectId, dataset, apiVersion} from '@/lib/sanity/api'

// Write token for automation jobs (server-only)
const writeToken = process.env.SANITY_API_WRITE_TOKEN

if (!writeToken && process.env.NODE_ENV === 'production') {
  console.warn('SANITY_API_WRITE_TOKEN not set - automation jobs will fail')
}

// Sanity client with write permissions for automation jobs
// Uses no CDN for fresh data
// Uses 'raw' perspective to see draft documents (drafts.* prefix)
export const sanityWrite: SanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  token: writeToken,
  useCdn: false,
  perspective: 'raw',
})
