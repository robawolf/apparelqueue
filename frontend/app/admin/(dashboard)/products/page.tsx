import {prisma} from '@/lib/db'
import StageQueue from '@/app/components/admin/StageQueue'
import ProductCard from '@/app/components/admin/ProductCard'

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{status?: string; bucketId?: string}>
}) {
  const params = await searchParams
  const status = params.status || 'pending'
  const bucketId = params.bucketId

  const where: Record<string, unknown> = {stage: 'product'}
  if (status !== 'all') where.status = status
  if (bucketId) where.productBucketId = bucketId

  const [ideas, buckets, listingBuckets] = await Promise.all([
    prisma.idea.findMany({
      where,
      include: {category: true, productBucket: true},
      orderBy: {createdAt: 'desc'},
    }),
    prisma.bucket.findMany({where: {stage: 'product', isActive: true}, orderBy: {sortOrder: 'asc'}}),
    prisma.bucket.findMany({where: {stage: 'listing', isActive: true}, orderBy: {sortOrder: 'asc'}}),
  ])

  return (
    <StageQueue
      stage="product"
      title="Product Queue"
      ideas={ideas}
      buckets={buckets}
      currentStatus={status}
      currentBucketId={bucketId}
      renderCard={(idea, onAction) => (
        <ProductCard idea={idea} listingBuckets={listingBuckets} onAction={onAction} />
      )}
    />
  )
}
