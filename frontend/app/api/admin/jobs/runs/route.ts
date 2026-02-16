import {NextResponse} from 'next/server'
import {draftMode} from 'next/headers'

/**
 * API route to list recent job runs
 * GET /api/admin/jobs/runs
 *
 * Note: The Inngest REST API only supports fetching runs per event ID,
 * not listing all recent runs. Runs triggered in the current session
 * are tracked client-side. For historical runs, use the Inngest dashboard.
 */
export async function GET() {
  const {isEnabled} = await draftMode()
  if (!isEnabled) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401})
  }

  // Inngest API doesn't support listing all runs - only per event ID
  // Client-side tracking handles runs from the current session
  return NextResponse.json({
    runs: [],
    note: 'Runs triggered in this session are tracked in the browser. For historical runs, visit the Inngest dashboard.',
    dashboardUrl: 'https://app.inngest.com',
  })
}
