import {prisma} from '@/lib/db'
import StageQueue from '@/app/components/admin/StageQueue'
import PhraseCard from '@/app/components/admin/PhraseCard'

export default async function PhrasesPage({
  searchParams,
}: {
  searchParams: Promise<{status?: string; bucketId?: string}>
}) {
  const params = await searchParams
  const status = params.status || 'pending'
  const bucketId = params.bucketId

  const where: Record<string, unknown> = {stage: 'phrase'}
  if (status !== 'all') where.status = status
  if (bucketId) where.phraseBucketId = bucketId

  const [ideas, buckets, designBuckets] = await Promise.all([
    prisma.idea.findMany({
      where,
      include: {category: true, phraseBucket: true},
      orderBy: {createdAt: 'desc'},
    }),
    prisma.bucket.findMany({where: {stage: 'phrase', isActive: true}, orderBy: {sortOrder: 'asc'}}),
    prisma.bucket.findMany({where: {stage: 'design', isActive: true}, orderBy: {sortOrder: 'asc'}}),
  ])

  return (
    <StageQueue
      stage="phrase"
      title="Phrase Queue"
      ideas={ideas}
      buckets={buckets}
      currentStatus={status}
      currentBucketId={bucketId}
      showGenerateButton
      renderCard={(idea, onAction) => (
        <PhraseCard idea={idea} designBuckets={designBuckets} onAction={onAction} />
      )}
    />
  )
}
