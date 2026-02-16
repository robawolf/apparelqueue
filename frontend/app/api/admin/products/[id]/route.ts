import {NextRequest, NextResponse} from 'next/server'
import {draftMode} from 'next/headers'
import {client} from '@/lib/sanity/client'
import {writeToken} from '@/lib/sanity/write-token'
import {inngest} from '@/lib/inngest/client'

/**
 * API route to update product approval status
 * PATCH /api/admin/products/[id]
 */
export async function PATCH(
  request: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  // Check authentication
  const {isEnabled} = await draftMode()
  if (!isEnabled) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401})
  }

  try {
    const {id} = await params
    const {approvalStatus} = await request.json()

    // Validate approval status
    const validStatuses = ['pending', 'approved', 'rejected', 'paused']
    if (!validStatuses.includes(approvalStatus)) {
      return NextResponse.json(
        {error: 'Invalid approval status'},
        {status: 400},
      )
    }

    // Update product using write token
    const writeClient = client.withConfig({token: writeToken})
    const result = await writeClient
      .patch(id)
      .set({approvalStatus})
      .commit()

    // If approved, trigger scrape job via Inngest
    let jobRun = null
    if (approvalStatus === 'approved') {
      try {
        const result = await inngest.send({
          name: 'job/scrape-product',
          data: {productId: id},
        })
        jobRun = {runId: result.ids[0], status: 'started'}
      } catch (error) {
        console.error('Error triggering scrape job:', error)
        // Don't fail the approval if job trigger fails
      }
    }

    return NextResponse.json({
      success: true,
      product: result,
      jobRun,
    })
  } catch (error) {
    console.error('Error updating product approval:', error)
    return NextResponse.json(
      {error: 'Failed to update product approval status'},
      {status: 500},
    )
  }
}
