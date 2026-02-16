import {NextResponse} from 'next/server'
import {draftMode} from 'next/headers'

// Static job definitions (Inngest functions defined in /lib/inngest/functions/)
const JOBS = [
  {name: 'discover-products', schedule: '0 */6 * * *', enabled: true},
  {name: 'scrape-product', schedule: '0 * * * *', enabled: true},
  {name: 'create-post-draft', schedule: '0 */2 * * *', enabled: true},
  {name: 'generate-post-content', schedule: null, enabled: true}, // Triggered by create-post-draft
  {name: 'enhance-post', schedule: null, enabled: true}, // Triggered by generate-post-content
  {name: 'generate-images', schedule: null, enabled: false},
]

/**
 * API route to list all automation jobs
 * GET /api/admin/jobs
 *
 * Jobs are now Inngest functions. This returns static metadata.
 * For detailed run status, use the Inngest dashboard.
 */
export async function GET() {
  const {isEnabled} = await draftMode()
  if (!isEnabled) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401})
  }

  return NextResponse.json({
    available: true,
    jobs: JOBS.map((job) => ({
      ...job,
      running: false, // Inngest handles concurrent execution
    })),
    // Link to Inngest dashboard for detailed monitoring
    dashboardUrl: 'https://app.inngest.com',
  })
}
