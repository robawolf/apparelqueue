import {NextRequest, NextResponse} from 'next/server'

interface InngestRun {
  run_id: string
  status: string
  output: unknown
  run_started_at: string
  ended_at: string | null
  function_id: string
}

export async function GET(
  _request: NextRequest,
  {params}: {params: Promise<{runId: string}>},
) {
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
    const response = await fetch(
      `https://api.inngest.com/v1/events/${runId}/runs`,
      {
        headers: {Authorization: `Bearer ${signingKey}`},
      },
    )

    if (!response.ok) {
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

    const run = runs[0]

    const statusMap: Record<string, string> = {
      Running: 'running',
      Completed: 'completed',
      Failed: 'failed',
      Cancelled: 'failed',
    }

    const jobName =
      run.function_id?.replace(/^product-idea-queue-/, '') || 'unknown'

    let durationMs: number | undefined
    if (run.ended_at && run.run_started_at) {
      durationMs =
        new Date(run.ended_at).getTime() -
        new Date(run.run_started_at).getTime()
    }

    return NextResponse.json({
      runId: run.run_id,
      jobName,
      status:
        statusMap[run.status] || run.status?.toLowerCase() || 'unknown',
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
      error:
        error instanceof Error ? error.message : 'Failed to fetch run status',
    })
  }
}
