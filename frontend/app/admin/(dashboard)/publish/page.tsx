import {prisma} from '@/lib/db'
import StageQueue from '@/app/components/admin/StageQueue'

export default async function PublishPage({
  searchParams,
}: {
  searchParams: Promise<{status?: string}>
}) {
  const params = await searchParams
  const status = params.status || 'pending'

  const where: Record<string, unknown> = {stage: 'publish'}
  if (status !== 'all') where.status = status

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

  return (
    <StageQueue
      stage="publish"
      title="Publish Queue"
      ideas={ideas}
      buckets={[]}
      currentStatus={status}
    />
  )
}
