import {NextRequest, NextResponse} from 'next/server'
import {prisma} from '@/lib/db'

export async function GET(request: NextRequest) {
  const {searchParams} = new URL(request.url)
  const stage = searchParams.get('stage')

  const where: Record<string, unknown> = {}
  if (stage) where.stage = stage

  const buckets = await prisma.bucket.findMany({
    where,
    orderBy: [{stage: 'asc'}, {sortOrder: 'asc'}, {name: 'asc'}],
  })

  return NextResponse.json(buckets)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const {name, stage, prompt, isActive, sortOrder} = body as {
    name: string
    stage: string
    prompt: string
    isActive?: boolean
    sortOrder?: number
  }

  if (!name || !stage || !prompt) {
    return NextResponse.json(
      {error: 'name, stage, and prompt are required'},
      {status: 400},
    )
  }

  const validStages = ['phrase', 'design', 'product', 'listing']
  if (!validStages.includes(stage)) {
    return NextResponse.json(
      {error: `stage must be one of: ${validStages.join(', ')}`},
      {status: 400},
    )
  }

  const bucket = await prisma.bucket.create({
    data: {
      name,
      stage,
      prompt,
      isActive: isActive ?? true,
      sortOrder: sortOrder ?? 0,
    },
  })

  return NextResponse.json(bucket, {status: 201})
}
