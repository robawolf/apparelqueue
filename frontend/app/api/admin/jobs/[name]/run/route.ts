import {NextRequest, NextResponse} from 'next/server'
import {inngest} from '@/lib/inngest/client'
import type {Events} from '@/lib/inngest/events'

const VALID_JOBS = [
  'generate-ideas',
  'create-design',
  'configure-product',
  'configure-listing',
  'create-printful-product',
  'publish-to-shopify',
  'refine-idea',
  'analyze-categories',
] as const

type JobName = (typeof VALID_JOBS)[number]

export async function POST(
  request: NextRequest,
  {params}: {params: Promise<{name: string}>},
) {
  const {name} = await params

  if (!VALID_JOBS.includes(name as JobName)) {
    return NextResponse.json({error: `Unknown job: ${name}`}, {status: 404})
  }

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
