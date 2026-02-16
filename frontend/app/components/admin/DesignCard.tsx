'use client'

import {useState} from 'react'
import StatusBadge from './StatusBadge'
import BucketBadge from './BucketBadge'
import ActionBar, {type ActionBarBucket} from './ActionBar'
import RevisionHistory from './RevisionHistory'
import type {Idea} from './StageQueue'

interface DesignConcept {
  type: string
  imageUrl: string
  seed?: number
}

interface DesignCardProps {
  idea: Idea
  productBuckets: ActionBarBucket[]
  onAction: (ideaId: string, action: string, body?: Record<string, unknown>) => Promise<void>
}

export default function DesignCard({idea, productBuckets, onAction}: DesignCardProps) {
  const [selecting, setSelecting] = useState<string | null>(null)
  const revisionHistory = Array.isArray(idea.revisionHistory) ? idea.revisionHistory : []

  let concepts: DesignConcept[] = []
  if (idea.variants) {
    try {
      const parsed = JSON.parse(idea.variants)
      if (Array.isArray(parsed)) {
        concepts = parsed.filter((v: DesignConcept) => v.type === 'design-concept' && v.imageUrl)
      }
    } catch {
      // invalid JSON, ignore
    }
  }

  const handleSelectConcept = async (imageUrl: string) => {
    if (selecting) return
    setSelecting(imageUrl)
    try {
      await fetch(`/api/admin/ideas/${idea.id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({mockupImageUrl: imageUrl}),
      })
      // Trigger a refresh via the parent's router
      await onAction(idea.id, '__refresh')
    } catch {
      // ignore
    } finally {
      setSelecting(null)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header: phrase + badges */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-xl font-semibold flex-1">{idea.phrase}</h3>
        <div className="flex gap-2 ml-4">
          <StatusBadge status={idea.status} />
          {idea.designBucket?.name && <BucketBadge name={idea.designBucket.name} />}
          {idea.category && (
            <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
              {idea.category.name}
            </span>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex gap-4 mb-3">
        {/* Primary mockup */}
        {idea.mockupImageUrl ? (
          <img
            src={idea.mockupImageUrl}
            alt={idea.phrase}
            className="w-80 h-80 object-cover rounded-lg flex-shrink-0"
          />
        ) : (
          <div className="w-80 h-80 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm flex-shrink-0">
            No mockup yet
          </div>
        )}

        {/* Details sidebar */}
        <div className="flex-1 min-w-0">
          {idea.graphicStyle && (
            <div className="mb-2">
              <span className="text-xs text-gray-500">Graphic style: </span>
              <span className="text-sm text-gray-700">{idea.graphicStyle}</span>
            </div>
          )}

          {idea.designFileUrl && (
            <div className="flex items-center gap-1 mb-2 text-sm text-green-700">
              <span>&#10003;</span> Print-ready file
            </div>
          )}

          {idea.canvaDesignId && (
            <a
              href={`https://www.canva.com/design/${idea.canvaDesignId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-2"
            >
              Edit in Canva <span className="text-xs">&#8599;</span>
            </a>
          )}

          {idea.graphicDescription && (
            <div className="mt-2">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Graphic concept
              </h4>
              <p className="text-sm text-gray-700">{idea.graphicDescription}</p>
            </div>
          )}
        </div>
      </div>

      {/* Concept grid */}
      {concepts.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Concepts
          </h4>
          <div className="flex gap-2">
            {concepts.map((concept, i) => {
              const isSelected = concept.imageUrl === idea.mockupImageUrl
              const isLoading = selecting === concept.imageUrl
              return (
                <button
                  key={i}
                  onClick={() => !isSelected && handleSelectConcept(concept.imageUrl)}
                  disabled={isSelected || !!selecting}
                  className={`relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 transition-all ${
                    isSelected
                      ? 'ring-2 ring-blue-500 ring-offset-1'
                      : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-1 cursor-pointer'
                  } ${selecting && !isLoading ? 'opacity-50' : ''}`}
                >
                  <img
                    src={concept.imageUrl}
                    alt={`Concept ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {isLoading && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Revision history */}
      <RevisionHistory entries={revisionHistory} />

      {/* Actions (only for pending ideas) */}
      {idea.status === 'pending' && (
        <ActionBar
          ideaId={idea.id}
          stage="design"
          nextStage="product"
          nextStageBuckets={productBuckets}
          onAction={onAction}
        />
      )}
    </div>
  )
}
