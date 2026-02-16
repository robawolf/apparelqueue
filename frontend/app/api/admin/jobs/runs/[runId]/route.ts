import {NextRequest, NextResponse} from 'next/server'
import {draftMode} from 'next/headers'

interface InngestRun {
  run_id: string
  status: string
  output: unknown
  run_started_at: string
  ended_at: string | null
  function_id: string
}

/**
 * Get job run status from Inngest REST API
 * GET /api/admin/jobs/runs/[runId]
 *
 * The runId is actually an event ID from inngest.send()
 * We use it to fetch the runs for that event from Inngest API
 */
export async function GET(request: NextRequest, {params}: {params: Promise<{runId: string}>}) {
  const {isEnabled} = await draftMode()
  if (!isEnabled) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401})
  }

  const {runId} = await params
  const signingKey = process.env.INNGEST_SIGNING_KEY

  if (!signingKey) {
    return NextResponse.json({
      runId,
      status: 'unknown',
      error: 'INNGEST_SIGNING_KEY not configured',
    })
  }

  try {
    // runId is actually an event ID - fetch runs for this event
    const response = await fetch(`https://api.inngest.com/v1/events/${runId}/runs`, {
      headers: {
        Authorization: `Bearer ${signingKey}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Inngest API error:', response.status, errorText)
      return NextResponse.json({
        runId,
        status: 'unknown',
        error: `Inngest API error: ${response.status}`,
      })
    }

    const data = await response.json()
    const runs: InngestRun[] = data.data || []

    if (runs.length === 0) {
      return NextResponse.json({
        runId,
        status: 'pending',
        jobName: 'unknown',
        startedAt: new Date().toISOString(),
      })
    }

    // Get the first run (usually there's just one per event)
    const run = runs[0]

    // Map Inngest status to our status format
    const statusMap: Record<string, string> = {
      Running: 'running',
      Completed: 'completed',
      Failed: 'failed',
      Cancelled: 'failed',
    }

    // Extract job name from function_id (format: "thingsfor-job-name")
    const jobName = run.function_id?.replace(/^thingsfor-/, '') || 'unknown'

    // Calculate duration if completed
    let durationMs: number | undefined
    if (run.ended_at && run.run_started_at) {
      durationMs = new Date(run.ended_at).getTime() - new Date(run.run_started_at).getTime()
    }

    return NextResponse.json({
      runId: run.run_id,
      jobName,
      status: statusMap[run.status] || run.status?.toLowerCase() || 'unknown',
      startedAt: run.run_started_at,
      completedAt: run.ended_at,
      durationMs,
      result: run.output,
    })
  } catch (error) {
    console.error('Failed to fetch run status:', error)
    return NextResponse.json({
      runId,
      status: 'unknown',
      error: error instanceof Error ? error.message : 'Failed to fetch run status',
    })
  }
}
