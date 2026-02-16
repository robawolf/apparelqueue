import {NextRequest, NextResponse} from 'next/server'
import {prisma} from '@/lib/db'
import {inngest} from '@/lib/inngest/client'

const STAGE_ORDER = ['phrase', 'design', 'product', 'listing', 'publish']

const STAGE_TO_JOB: Record<string, string> = {
  design: 'job/create-design',
  product: 'job/configure-product',
  listing: 'job/configure-listing',
}

const STAGE_TO_BUCKET_FK: Record<string, string> = {
  design: 'designBucketId',
  product: 'productBucketId',
  listing: 'listingBucketId',
}

interface RevisionEntry {
  stage: string
  type: string
  notes: string
  timestamp: string
}

export async function POST(
  request: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const {id} = await params
  const body = await request.json()
  const {guidance, bucketId} = body as {guidance?: string; bucketId?: string}

  const idea = await prisma.idea.findUniqueOrThrow({where: {id}})

  const currentIdx = STAGE_ORDER.indexOf(idea.stage)
  if (currentIdx === -1 || currentIdx >= STAGE_ORDER.length - 1) {
    return NextResponse.json({error: 'Cannot advance from this stage'}, {status: 400})
  }

  const nextStage = STAGE_ORDER[currentIdx + 1]

  // Build update data
  const updateData: Record<string, unknown> = {
    stage: nextStage,
    status: 'pending',
  }

  // Set bucket FK for next stage
  if (bucketId && STAGE_TO_BUCKET_FK[nextStage]) {
    updateData[STAGE_TO_BUCKET_FK[nextStage]] = bucketId
  }

  // Prepend forward guidance to revision history
  if (guidance) {
    const history: RevisionEntry[] = idea.revisionHistory
      ? JSON.parse(idea.revisionHistory)
      : []
    history.unshift({
      stage: idea.stage,
      type: 'forward',
      notes: guidance,
      timestamp: new Date().toISOString(),
    })
    updateData.revisionHistory = JSON.stringify(history)
  }

  await prisma.idea.update({where: {id}, data: updateData})

  // Trigger job for next stage
  const jobName = STAGE_TO_JOB[nextStage]
  if (jobName) {
    await inngest.send({name: jobName as 'job/create-design', data: {ideaId: id}})
  }

  return NextResponse.json({advanced: true, stage: nextStage})
}
