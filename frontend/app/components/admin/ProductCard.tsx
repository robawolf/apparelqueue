'use client'

import {useState} from 'react'
import StatusBadge from './StatusBadge'
import BucketBadge from './BucketBadge'
import ActionBar, {type ActionBarBucket} from './ActionBar'
import RevisionHistory from './RevisionHistory'
import VariantPicker, {type SelectedVariant} from './VariantPicker'
import PlacementEditor, {type Placement} from './PlacementEditor'
import type {Idea} from './StageQueue'

interface ProductCardProps {
  idea: Idea
  listingBuckets: ActionBarBucket[]
  onAction: (ideaId: string, action: string, body?: Record<string, unknown>) => Promise<void>
}

export default function ProductCard({idea, listingBuckets, onAction}: ProductCardProps) {
  const [showVariants, setShowVariants] = useState(false)
  const [showPlacements, setShowPlacements] = useState(false)
  const [saving, setSaving] = useState(false)

  const revisionHistory = Array.isArray(idea.revisionHistory) ? idea.revisionHistory : []

  // Parse variants JSON
  let variants: SelectedVariant[] = []
  if (idea.variants) {
    try {
      const parsed = JSON.parse(idea.variants)
      if (Array.isArray(parsed)) variants = parsed
    } catch {
      // invalid JSON
    }
  }

  // Parse placements JSON
  let placements: Placement[] = []
  if (idea.printPlacements) {
    try {
      const parsed = JSON.parse(idea.printPlacements)
      if (Array.isArray(parsed)) placements = parsed
    } catch {
      // invalid JSON
    }
  }

  const saveField = async (field: string, value: unknown) => {
    setSaving(true)
    try {
      await fetch(`/api/admin/ideas/${idea.id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({[field]: value}),
      })
      await onAction(idea.id, '__refresh')
    } finally {
      setSaving(false)
    }
  }

  const colorCount = new Set(variants.map((v) => v.color)).size
  const sizeCount = new Set(variants.map((v) => v.size)).size

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-xl font-semibold flex-1">{idea.phrase}</h3>
        <div className="flex gap-2 ml-4">
          <StatusBadge status={idea.status} />
          {idea.productBucket?.name && <BucketBadge name={idea.productBucket.name} />}
          {idea.category && (
            <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
              {idea.category.name}
            </span>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex gap-4 mb-3">
        {/* Mockup from Stage 2 */}
        {idea.mockupImageUrl ? (
          <img
            src={idea.mockupImageUrl}
            alt={idea.phrase}
            className="w-48 h-48 object-cover rounded-lg flex-shrink-0"
          />
        ) : (
          <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm flex-shrink-0">
            No mockup
          </div>
        )}

        {/* Product details */}
        <div className="flex-1 min-w-0 space-y-2">
          {idea.apparelType && (
            <div>
              <span className="text-xs text-gray-500">Apparel type: </span>
              <span className="text-sm font-medium">{idea.apparelType}</span>
            </div>
          )}

          {idea.colorScheme && (
            <div>
              <span className="text-xs text-gray-500">Color scheme: </span>
              <span className="text-sm text-gray-700">{idea.colorScheme}</span>
            </div>
          )}

          {/* Variant summary */}
          {variants.length > 0 && (
            <div className="text-sm text-gray-700">
              {variants.length} variant{variants.length !== 1 ? 's' : ''} — {colorCount} color{colorCount !== 1 ? 's' : ''}, {sizeCount} size{sizeCount !== 1 ? 's' : ''}
            </div>
          )}

          {/* Placement summary */}
          {placements.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {placements.map((p) => (
                <span
                  key={p.placement}
                  className="px-2 py-0.5 rounded text-xs bg-gray-50 text-gray-600 border border-gray-200 capitalize"
                >
                  {p.placement}
                </span>
              ))}
            </div>
          )}

          {idea.printfulCatalogId && (
            <div className="text-xs text-gray-400">
              Printful catalog #{idea.printfulCatalogId}
            </div>
          )}
        </div>
      </div>

      {/* Collapsible variant picker */}
      {idea.printfulCatalogId && idea.status === 'pending' && (
        <>
          <div className="border-t border-gray-100 pt-3 mb-3">
            <button
              onClick={() => setShowVariants(!showVariants)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>{showVariants ? '▾' : '▸'}</span>
              Edit Variants
            </button>
            {showVariants && (
              <div className="mt-2">
                <VariantPicker
                  catalogId={idea.printfulCatalogId}
                  selectedVariants={variants}
                  onChange={(v) => saveField('variants', JSON.stringify(v))}
                />
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-3 mb-3">
            <button
              onClick={() => setShowPlacements(!showPlacements)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>{showPlacements ? '▾' : '▸'}</span>
              Edit Placements
            </button>
            {showPlacements && (
              <div className="mt-2">
                <PlacementEditor
                  catalogId={idea.printfulCatalogId}
                  designFileUrl={idea.designFileUrl || undefined}
                  placements={placements}
                  onChange={(p) => saveField('printPlacements', JSON.stringify(p))}
                />
              </div>
            )}
          </div>
        </>
      )}

      {saving && (
        <div className="text-xs text-blue-600 mb-2">Saving...</div>
      )}

      {/* Revision history */}
      <RevisionHistory entries={revisionHistory} />

      {/* Actions */}
      {idea.status === 'pending' && (
        <ActionBar
          ideaId={idea.id}
          stage="product"
          nextStage="listing"
          nextStageBuckets={listingBuckets}
          onAction={onAction}
        />
      )}
    </div>
  )
}
