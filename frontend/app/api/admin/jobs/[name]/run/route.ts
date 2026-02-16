import {NextRequest, NextResponse} from 'next/server'
import {draftMode} from 'next/headers'
import {inngest} from '@/lib/inngest/client'
import type {Events} from '@/lib/inngest/events'

// Valid job names that can be triggered
const VALID_JOBS = [
  'discover-products',
  'scrape-product',
  'create-post-draft',
  'generate-post-content',
  'enhance-post',
  'generate-images',
] as const

type JobName = (typeof VALID_JOBS)[number]

/**
 * API route to trigger a job run via Inngest
 * POST /api/admin/jobs/[name]/run
 *
 * Optional body: { productId?: string, scrapeId?: string, postId?: string }
 */
export async function POST(request: NextRequest, {params}: {params: Promise<{name: string}>}) {
  const {isEnabled} = await draftMode()
  if (!isEnabled) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401})
  }

  const {name} = await params

  // Validate job name
  if (!VALID_JOBS.includes(name as JobName)) {
    return NextResponse.json({error: `Unknown job: ${name}`}, {status: 404})
  }

  // Parse optional body params
  let jobParams: Record<string, string> = {}
  try {
    const body = await request.json().catch(() => ({}))
    if (body && typeof body === 'object') {
      jobParams = body
    }
  } catch {
    // No body is fine
  }

  try {
    // Send event to Inngest to trigger the job
    const eventName = `job/${name}` as keyof Events
    const result = await inngest.send({
      name: eventName,
      data: jobParams as Events[typeof eventName],
    })

    return NextResponse.json(
      {
        runId: result.ids[0],
        jobName: name,
        params: jobParams,
        status: 'started',
        // Inngest handles execution - check dashboard for status
        dashboardUrl: 'https://app.inngest.com',
      },
      {status: 202},
    )
  } catch (error) {
    console.error('Failed to trigger job:', error)
    return NextResponse.json(
      {error: error instanceof Error ? error.message : 'Failed to trigger job'},
      {status: 500},
    )
  }
}
