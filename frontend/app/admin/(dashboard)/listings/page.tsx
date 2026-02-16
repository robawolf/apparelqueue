import {prisma} from '@/lib/db'
import StageQueue from '@/app/components/admin/StageQueue'

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{status?: string; bucketId?: string}>
}) {
  const params = await searchParams
  const status = params.status || 'pending'
  const bucketId = params.bucketId

  const where: Record<string, unknown> = {stage: 'listing'}
  if (status !== 'all') where.status = status
  if (bucketId) where.listingBucketId = bucketId

  const [ideas, buckets] = await Promise.all([
    prisma.idea.findMany({
      where,
      include: {category: true, listingBucket: true},
      orderBy: {createdAt: 'desc'},
    }),
    prisma.bucket.findMany({where: {stage: 'listing', isActive: true}, orderBy: {sortOrder: 'asc'}}),
  ])

  return (
    <StageQueue
      stage="listing"
      title="Listing Queue"
      ideas={ideas}
      buckets={buckets}
      currentStatus={status}
      currentBucketId={bucketId}
    />
  )
}
