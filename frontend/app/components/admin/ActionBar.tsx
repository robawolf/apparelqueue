'use client'

import {useState} from 'react'

export interface ActionBarBucket {
  id: string
  name: string
}

interface ActionBarProps {
  ideaId: string
  stage: string
  nextStage: string | null
  nextStageBuckets: ActionBarBucket[]
  onAction: (ideaId: string, action: string, body?: Record<string, unknown>) => Promise<void>
}

export default function ActionBar({ideaId, stage, nextStage, nextStageBuckets, onAction}: ActionBarProps) {
  const [guidance, setGuidance] = useState('')
  const [nextBucketId, setNextBucketId] = useState('')
  const [showRefine, setShowRefine] = useState(false)
  const [refineNotes, setRefineNotes] = useState('')

  return (
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
          {nextStage !== 'publish' && nextStageBuckets.length > 0 && (
            <select
              value={nextBucketId}
              onChange={(e) => setNextBucketId(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              <option value="">Auto bucket</option>
              {nextStageBuckets.map((b) => (
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
              onAction(ideaId, 'advance', {
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
            onClick={() => onAction(ideaId, 'publish')}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Publish
          </button>
        )}

        <button
          onClick={() => onAction(ideaId, 'reject')}
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
                onAction(ideaId, 'refine', {notes: refineNotes, stage})
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
  )
}
