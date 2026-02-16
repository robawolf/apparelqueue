import {NextRequest, NextResponse} from 'next/server'
import {prisma} from '@/lib/db'
import {inngest} from '@/lib/inngest/client'

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
  const {notes, stage} = body as {notes: string; stage: string}

  if (!notes) {
    return NextResponse.json({error: 'Notes are required'}, {status: 400})
  }

  const idea = await prisma.idea.findUniqueOrThrow({where: {id}})

  // Prepend to revision history
  const history: RevisionEntry[] = idea.revisionHistory
    ? JSON.parse(idea.revisionHistory)
    : []
  history.unshift({
    stage: stage || idea.stage,
    type: 'revision',
    notes,
    timestamp: new Date().toISOString(),
  })

  await prisma.idea.update({
    where: {id},
    data: {
      status: 'refining',
      revisionHistory: JSON.stringify(history),
    },
  })

  // Trigger refine job
  await inngest.send({
    name: 'job/refine-idea',
    data: {ideaId: id, notes, stage: stage || idea.stage},
  })

  return NextResponse.json({refining: true})
}
