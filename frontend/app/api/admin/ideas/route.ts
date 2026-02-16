import {NextRequest, NextResponse} from 'next/server'
import {prisma} from '@/lib/db'

export async function GET(request: NextRequest) {
  const {searchParams} = request.nextUrl
  const stage = searchParams.get('stage')
  const status = searchParams.get('status')
  const bucketId = searchParams.get('bucketId')

  const where: Record<string, unknown> = {}
  if (stage) where.stage = stage
  if (status) where.status = status
  if (bucketId) {
    if (stage === 'phrase') where.phraseBucketId = bucketId
    else if (stage === 'design') where.designBucketId = bucketId
    else if (stage === 'product') where.productBucketId = bucketId
    else if (stage === 'listing') where.listingBucketId = bucketId
  }

  const ideas = await prisma.idea.findMany({
    where,
    include: {
      category: true,
      phraseBucket: true,
      designBucket: true,
      productBucket: true,
      listingBucket: true,
    },
    orderBy: {createdAt: 'desc'},
  })

  return NextResponse.json(ideas)
}
