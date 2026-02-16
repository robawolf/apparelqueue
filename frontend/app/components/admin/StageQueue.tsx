'use client'

import Link from 'next/link'
import {useRouter} from 'next/navigation'
import {useState} from 'react'

export interface Idea {
  id: string
  phrase: string
  phraseExplanation?: string | null
  graphicDescription?: string | null
  graphicStyle?: string | null
  mockupImageUrl?: string | null
  canvaDesignId?: string | null
  designFileUrl?: string | null
  variants?: string | null
  apparelType?: string | null
  productTitle?: string | null
  productDescription?: string | null
  printfulCatalogId?: number | null
  printPlacements?: string | null
  colorScheme?: string | null
  productTags?: string | null
  shopifyCollectionId?: string | null
  printfulProductId?: string | null
  printfulExternalId?: string | null
  shopifyProductId?: string | null
  shopifyProductUrl?: string | null
  publishedAt?: string | null
  aiModel?: string | null
  stage: string
  status: string
  createdAt: Date
  revisionHistory?: Array<{stage: string; type: 'forward' | 'revision'; notes: string; timestamp: string}>
  category?: {name: string} | null
  phraseBucket?: {name: string} | null
  designBucket?: {name: string} | null
  productBucket?: {name: string} | null
  listingBucket?: {name: string} | null
}

export interface Bucket {
  id: string
  name: string
  stage: string
}

export type ActionHandler = (ideaId: string, action: string, body?: Record<string, unknown>) => Promise<void>

interface StageQueueProps {
  stage: string
  title: string
  ideas: Idea[]
  buckets: Bucket[]
  currentStatus: string
  currentBucketId?: string
  showGenerateButton?: boolean
  renderCard?: (idea: Idea, onAction: ActionHandler) => React.ReactNode
}

const STATUS_TABS = ['all', 'pending', 'approved', 'rejected', 'refining', 'processing']

export default function StageQueue({
  stage,
  title,
  ideas,
  buckets,
  currentStatus,
  currentBucketId,
  showGenerateButton,
  renderCard,
}: StageQueueProps) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [selectedBucketId, setSelectedBucketId] = useState(buckets[0]?.id || '')

  const handleGenerate = async () => {
    if (!selectedBucketId) return
    setGenerating(true)
    try {
      await fetch('/api/admin/jobs/generate-ideas/run', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({bucketId: selectedBucketId}),
      })
      router.refresh()
    } finally {
      setGenerating(false)
    }
  }

  const handleAction = async (ideaId: string, action: string, body?: Record<string, unknown>) => {
    await fetch(`/api/admin/ideas/${ideaId}/${action}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body || {}),
    })
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{title}</h2>
        {showGenerateButton && buckets.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={selectedBucketId}
              onChange={(e) => setSelectedBucketId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {buckets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate Ideas'}
            </button>
          </div>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab}
            href={`/admin/${stage}s?status=${tab}${currentBucketId ? `&bucketId=${currentBucketId}` : ''}`}
            className={`px-4 py-2 text-sm capitalize border-b-2 transition-colors ${
              currentStatus === tab
                ? 'border-blue-500 text-blue-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </Link>
        ))}
      </div>

      {/* Bucket filter */}
      {buckets.length > 0 && (
        <div className="flex gap-2 mb-4">
          <Link
            href={`/admin/${stage}s?status=${currentStatus}`}
            className={`px-3 py-1 rounded-full text-xs ${
              !currentBucketId ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All buckets
          </Link>
          {buckets.map((b) => (
            <Link
              key={b.id}
              href={`/admin/${stage}s?status=${currentStatus}&bucketId=${b.id}`}
              className={`px-3 py-1 rounded-full text-xs ${
                currentBucketId === b.id
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {b.name}
            </Link>
          ))}
        </div>
      )}

      {/* Ideas list */}
      {ideas.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No ideas in this queue.
        </div>
      ) : (
        <div className="space-y-4">
          {ideas.map((idea) =>
            renderCard ? (
              <div key={idea.id}>{renderCard(idea, handleAction)}</div>
            ) : (
              <IdeaCard
                key={idea.id}
                idea={idea}
                stage={stage}
                buckets={buckets}
                onAction={handleAction}
              />
            )
          )}
        </div>
      )}
    </div>
  )
}

function IdeaCard({
  idea,
  stage,
  buckets,
  onAction,
}: {
  idea: Idea
  stage: string
  buckets: Bucket[]
  onAction: (ideaId: string, action: string, body?: Record<string, unknown>) => Promise<void>
}) {
  const [guidance, setGuidance] = useState('')
  const [nextBucketId, setNextBucketId] = useState('')
  const [showRefine, setShowRefine] = useState(false)
  const [refineNotes, setRefineNotes] = useState('')

  const nextStage = stage === 'phrase' ? 'design' : stage === 'design' ? 'product' : stage === 'product' ? 'listing' : stage === 'listing' ? 'publish' : null

  const bucketBadge =
    stage === 'phrase' ? idea.phraseBucket?.name :
    stage === 'design' ? idea.designBucket?.name :
    stage === 'product' ? idea.productBucket?.name :
    stage === 'listing' ? idea.listingBucket?.name : null

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    refining: 'bg-purple-100 text-purple-800',
    processing: 'bg-blue-100 text-blue-800',
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{idea.phrase}</h3>
          {idea.phraseExplanation && (
            <p className="text-sm text-gray-600 mt-1">{idea.phraseExplanation}</p>
          )}
        </div>
        <div className="flex gap-2 ml-4">
          <span className={`px-2 py-1 rounded-full text-xs ${statusColors[idea.status] || 'bg-gray-100'}`}>
            {idea.status}
          </span>
          {bucketBadge && (
            <span className="px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
              {bucketBadge}
            </span>
          )}
          {idea.category && (
            <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
              {idea.category.name}
            </span>
          )}
        </div>
      </div>

      {/* Stage-specific content */}
      {idea.mockupImageUrl && (
        <div className="mb-3">
          <img
            src={idea.mockupImageUrl}
            alt={idea.phrase}
            className="w-48 h-48 object-cover rounded-lg"
          />
        </div>
      )}

      {stage === 'product' && idea.apparelType && (
        <p className="text-sm text-gray-600 mb-2">Apparel: {idea.apparelType}</p>
      )}

      {stage === 'listing' && idea.productTitle && (
        <div className="mb-2">
          <p className="font-medium">{idea.productTitle}</p>
          {idea.productDescription && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{idea.productDescription}</p>
          )}
        </div>
      )}

      {/* Actions */}
      {idea.status === 'pending' && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          {nextStage && (
            <div className="flex items-end gap-2 mb-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Forward guidance (optional)</label>
                <input
                  type="text"
                  value={guidance}
                  onChange={(e) => setGuidance(e.target.value)}
                  placeholder="Direction for next stage..."
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                />
              </div>
              {nextStage !== 'publish' && (
                <select
                  value={nextBucketId}
                  onChange={(e) => setNextBucketId(e.target.value)}
                  className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                >
                  <option value="">Auto bucket</option>
                  {buckets.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="flex gap-2">
            {nextStage && (
              <button
                onClick={() =>
                  onAction(idea.id, 'advance', {
                    guidance: guidance || undefined,
                    bucketId: nextBucketId || undefined,
                  })
                }
                className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Approve
              </button>
            )}

            {stage === 'publish' && (
              <button
                onClick={() => onAction(idea.id, 'publish')}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Publish
              </button>
            )}

            <button
              onClick={() => onAction(idea.id, 'reject')}
              className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
            >
              Reject
            </button>

            <button
              onClick={() => setShowRefine(!showRefine)}
              className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200"
            >
              Refine
            </button>
          </div>

          {showRefine && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={refineNotes}
                onChange={(e) => setRefineNotes(e.target.value)}
                placeholder="What should AI change?"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
              />
              <button
                onClick={() => {
                  if (refineNotes) {
                    onAction(idea.id, 'refine', {notes: refineNotes, stage})
                    setRefineNotes('')
                    setShowRefine(false)
                  }
                }}
                className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
              >
                Send
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
