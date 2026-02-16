import {prisma} from '@/lib/db'
import StageQueue from '@/app/components/admin/StageQueue'
import DesignCard from '@/app/components/admin/DesignCard'

export default async function DesignsPage({
  searchParams,
}: {
  searchParams: Promise<{status?: string; bucketId?: string}>
}) {
  const params = await searchParams
  const status = params.status || 'pending'
  const bucketId = params.bucketId

  const where: Record<string, unknown> = {stage: 'design'}
  if (status !== 'all') where.status = status
  if (bucketId) where.designBucketId = bucketId

  const [ideas, designBuckets, productBuckets] = await Promise.all([
    prisma.idea.findMany({
      where,
      include: {category: true, designBucket: true},
      orderBy: {createdAt: 'desc'},
    }),
    prisma.bucket.findMany({where: {stage: 'design', isActive: true}, orderBy: {sortOrder: 'asc'}}),
    prisma.bucket.findMany({where: {stage: 'product', isActive: true}, orderBy: {sortOrder: 'asc'}}),
  ])

  return (
    <StageQueue
      stage="design"
      title="Design Queue"
      ideas={ideas}
      buckets={designBuckets}
      currentStatus={status}
      currentBucketId={bucketId}
      renderCard={(idea, onAction) => (
        <DesignCard idea={idea} productBuckets={productBuckets} onAction={onAction} />
      )}
    />
  )
}
