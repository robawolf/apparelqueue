import {NextResponse} from 'next/server'

export async function GET() {
  return NextResponse.json({
    runs: [],
    note: 'Runs triggered in this session are tracked in the browser. For historical runs, visit the Inngest dashboard.',
    dashboardUrl: 'https://app.inngest.com',
  })
}
