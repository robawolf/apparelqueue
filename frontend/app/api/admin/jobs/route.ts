import {NextResponse} from 'next/server'

const JOBS = [
  {name: 'generate-ideas', schedule: null, enabled: true, description: 'AI-generate batch of phrase options'},
  {name: 'create-design', schedule: null, enabled: true, description: 'Generate concept art and print-ready design'},
  {name: 'configure-product', schedule: null, enabled: true, description: 'AI-suggest product configurations'},
  {name: 'configure-listing', schedule: null, enabled: true, description: 'AI-generate listing copy options'},
  {name: 'create-printful-product', schedule: null, enabled: true, description: 'Create product on Printful'},
  {name: 'publish-to-shopify', schedule: null, enabled: true, description: 'Sync to Shopify after Printful creation'},
  {name: 'refine-idea', schedule: null, enabled: true, description: 'AI-regenerate at any stage with revision guidance'},
  {name: 'analyze-categories', schedule: '0 0 * * *', enabled: true, description: 'Analyze category gaps and priorities'},
]

export async function GET() {
  return NextResponse.json({
    available: true,
    jobs: JOBS.map((job) => ({
      ...job,
      running: false,
    })),
    dashboardUrl: 'https://app.inngest.com',
  })
}
