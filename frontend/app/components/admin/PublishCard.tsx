'use client'

import StatusBadge from './StatusBadge'
import BucketBadge from './BucketBadge'
import ActionBar from './ActionBar'
import RevisionHistory from './RevisionHistory'
import type {Idea} from './StageQueue'

interface PublishCardProps {
  idea: Idea
  onAction: (ideaId: string, action: string, body?: Record<string, unknown>) => Promise<void>
}

export default function PublishCard({idea, onAction}: PublishCardProps) {
  const revisionHistory = Array.isArray(idea.revisionHistory) ? idea.revisionHistory : []

  // Parse variants for summary
  let variantCount = 0
  let colorCount = 0
  let sizeCount = 0
  if (idea.variants) {
    try {
      const parsed = JSON.parse(idea.variants)
      if (Array.isArray(parsed)) {
        variantCount = parsed.length
        colorCount = new Set(parsed.map((v: {color: string}) => v.color)).size
        sizeCount = new Set(parsed.map((v: {size: string}) => v.size)).size
      }
    } catch {
      // ignore
    }
  }

  // Parse placements for summary
  let placementNames: string[] = []
  if (idea.printPlacements) {
    try {
      const parsed = JSON.parse(idea.printPlacements)
      if (Array.isArray(parsed)) {
        placementNames = parsed.map((p: {placement: string}) => p.placement)
      }
    } catch {
      // ignore
    }
  }

  // Parse tags
  let tagList: string[] = []
  if (idea.productTags) {
    try {
      const parsed = JSON.parse(idea.productTags)
      if (Array.isArray(parsed)) tagList = parsed
    } catch {
      tagList = idea.productTags.split(',').map((t) => t.trim()).filter(Boolean)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xl font-semibold flex-1">{idea.phrase}</h3>
        <div className="flex gap-2 ml-4">
          <StatusBadge status={idea.status} />
          {idea.category && (
            <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
              {idea.category.name}
            </span>
          )}
        </div>
      </div>

      {/* Published status */}
      {idea.shopifyProductUrl && idea.publishedAt && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
          <div className="flex items-center gap-2 text-sm text-green-800">
            <span>&#10003;</span>
            <span>Published on {new Date(idea.publishedAt).toLocaleDateString()}</span>
            <a
              href={idea.shopifyProductUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-700 underline hover:text-green-900 ml-2"
            >
              View on Shopify &#8599;
            </a>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Section 1: Phrase */}
        <div className="border border-gray-100 rounded p-3">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Phrase</h4>
          <p className="text-sm font-medium mb-1">{idea.phrase}</p>
          {idea.phraseExplanation && (
            <p className="text-sm text-gray-600">{idea.phraseExplanation}</p>
          )}
        </div>

        {/* Section 2: Design */}
        <div className="border border-gray-100 rounded p-3">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Design</h4>
          <div className="flex gap-3">
            {idea.mockupImageUrl ? (
              <img
                src={idea.mockupImageUrl}
                alt={idea.phrase}
                className="w-32 h-32 object-cover rounded flex-shrink-0"
              />
            ) : (
              <div className="w-32 h-32 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs flex-shrink-0">
                No mockup
              </div>
            )}
            <div className="text-sm space-y-1">
              {idea.graphicStyle && (
                <div>
                  <span className="text-gray-500">Style: </span>
                  <span>{idea.graphicStyle}</span>
                </div>
              )}
              {idea.canvaDesignId && (
                <a
                  href={`https://www.canva.com/design/${idea.canvaDesignId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                >
                  Canva &#8599;
                </a>
              )}
              {idea.designFileUrl && (
                <div className="text-green-700 flex items-center gap-1">
                  <span>&#10003;</span> Print file ready
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Product */}
        <div className="border border-gray-100 rounded p-3">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Product</h4>
          <div className="text-sm space-y-1">
            {idea.apparelType && (
              <div>
                <span className="text-gray-500">Type: </span>
                <span className="font-medium">{idea.apparelType}</span>
              </div>
            )}
            {variantCount > 0 && (
              <div>
                {variantCount} variant{variantCount !== 1 ? 's' : ''} — {colorCount} color{colorCount !== 1 ? 's' : ''}, {sizeCount} size{sizeCount !== 1 ? 's' : ''}
              </div>
            )}
            {placementNames.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {placementNames.map((p) => (
                  <span key={p} className="px-1.5 py-0.5 rounded text-xs bg-gray-50 text-gray-600 border border-gray-200 capitalize">
                    {p}
                  </span>
                ))}
              </div>
            )}
            {idea.colorScheme && (
              <div>
                <span className="text-gray-500">Colors: </span>
                <span>{idea.colorScheme}</span>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Listing */}
        <div className="border border-gray-100 rounded p-3">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Listing</h4>
          <div className="text-sm space-y-1">
            {idea.productTitle && (
              <p className="font-medium">{idea.productTitle}</p>
            )}
            {idea.productDescription && (
              <p className="text-gray-600 line-clamp-3">{idea.productDescription}</p>
            )}
            {tagList.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-1">
                {tagList.map((tag, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded text-xs bg-gray-50 text-gray-600 border border-gray-200">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline trail: bucket badges */}
      <div className="mb-3">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Pipeline Trail</h4>
        <div className="flex items-center gap-2 flex-wrap">
          {idea.phraseBucket?.name && (
            <>
              <BucketBadge name={idea.phraseBucket.name} />
              <span className="text-gray-300 text-xs">&rarr;</span>
            </>
          )}
          {idea.designBucket?.name && (
            <>
              <BucketBadge name={idea.designBucket.name} />
              <span className="text-gray-300 text-xs">&rarr;</span>
            </>
          )}
          {idea.productBucket?.name && (
            <>
              <BucketBadge name={idea.productBucket.name} />
              <span className="text-gray-300 text-xs">&rarr;</span>
            </>
          )}
          {idea.listingBucket?.name && (
            <BucketBadge name={idea.listingBucket.name} />
          )}
          {!idea.phraseBucket?.name && !idea.designBucket?.name && !idea.productBucket?.name && !idea.listingBucket?.name && (
            <span className="text-xs text-gray-400">No bucket assignments</span>
          )}
        </div>
      </div>

      {/* Revision history (expanded by default for publish) */}
      {revisionHistory.length > 0 && (
        <div className="mt-3">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Revision history ({revisionHistory.length})
          </h4>
          <div className="space-y-2 border-l-2 border-gray-200 pl-3">
            {revisionHistory.map((entry, i) => (
              <div key={i} className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="capitalize text-xs font-medium text-gray-500">{entry.stage}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-xs ${
                      entry.type === 'forward'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-purple-50 text-purple-700'
                    }`}
                  >
                    {entry.type}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(entry.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-600 mt-0.5">{entry.notes}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {idea.status === 'pending' && (
        <ActionBar
          ideaId={idea.id}
          stage="publish"
          nextStage={null}
          nextStageBuckets={[]}
          onAction={onAction}
        />
      )}
    </div>
  )
}
