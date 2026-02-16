'use client'

import StatusBadge from './StatusBadge'
import BucketBadge from './BucketBadge'
import ActionBar, {type ActionBarBucket} from './ActionBar'
import RevisionHistory from './RevisionHistory'
import type {Idea} from './StageQueue'

interface PhraseCardProps {
  idea: Idea
  designBuckets: ActionBarBucket[]
  onAction: (ideaId: string, action: string, body?: Record<string, unknown>) => Promise<void>
}

export default function PhraseCard({idea, designBuckets, onAction}: PhraseCardProps) {
  const revisionHistory = Array.isArray(idea.revisionHistory) ? idea.revisionHistory : []

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header: phrase + badges */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-xl font-semibold flex-1">{idea.phrase}</h3>
        <div className="flex gap-2 ml-4">
          <StatusBadge status={idea.status} />
          {idea.phraseBucket?.name && <BucketBadge name={idea.phraseBucket.name} />}
          {idea.category && (
            <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
              {idea.category.name}
            </span>
          )}
        </div>
      </div>

      {/* Cultural explanation */}
      {idea.phraseExplanation && (
        <p className="text-sm text-gray-600 mb-3">{idea.phraseExplanation}</p>
      )}

      {/* Graphic suggestion */}
      {idea.graphicDescription && (
        <div className="mb-3">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Suggested graphic concept
          </h4>
          <p className="text-sm text-gray-700">{idea.graphicDescription}</p>
        </div>
      )}

      {/* Graphic style tag */}
      {idea.graphicStyle && (
        <span className="inline-block px-2 py-0.5 rounded text-xs bg-gray-50 text-gray-500 border border-gray-200 mb-3">
          {idea.graphicStyle}
        </span>
      )}

      {/* Revision history */}
      <RevisionHistory entries={revisionHistory} />

      {/* Actions (only for pending ideas) */}
      {idea.status === 'pending' && (
        <ActionBar
          ideaId={idea.id}
          stage="phrase"
          nextStage="design"
          nextStageBuckets={designBuckets}
          onAction={onAction}
        />
      )}
    </div>
  )
}
