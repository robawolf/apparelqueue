'use client'

import {useState} from 'react'
import StatusBadge from './StatusBadge'
import BucketBadge from './BucketBadge'
import ActionBar from './ActionBar'
import RevisionHistory from './RevisionHistory'
import type {Idea} from './StageQueue'

interface ListingCardProps {
  idea: Idea
  onAction: (ideaId: string, action: string, body?: Record<string, unknown>) => Promise<void>
}

export default function ListingCard({idea, onAction}: ListingCardProps) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(idea.productTitle || '')
  const [description, setDescription] = useState(idea.productDescription || '')
  const [tags, setTags] = useState(idea.productTags || '')
  const [saving, setSaving] = useState(false)

  const revisionHistory = Array.isArray(idea.revisionHistory) ? idea.revisionHistory : []

  // Parse tags for display
  let tagList: string[] = []
  if (idea.productTags) {
    try {
      const parsed = JSON.parse(idea.productTags)
      if (Array.isArray(parsed)) tagList = parsed
    } catch {
      tagList = idea.productTags.split(',').map((t) => t.trim()).filter(Boolean)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch(`/api/admin/ideas/${idea.id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          productTitle: title,
          productDescription: description,
          productTags: tags,
        }),
      })
      await onAction(idea.id, '__refresh')
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-xl font-semibold flex-1">{idea.phrase}</h3>
        <div className="flex gap-2 ml-4">
          <StatusBadge status={idea.status} />
          {idea.listingBucket?.name && <BucketBadge name={idea.listingBucket.name} />}
          {idea.category && (
            <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
              {idea.category.name}
            </span>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex gap-4 mb-3">
        {/* Small mockup thumbnail */}
        {idea.mockupImageUrl && (
          <img
            src={idea.mockupImageUrl}
            alt={idea.phrase}
            className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
          />
        )}

        <div className="flex-1 min-w-0">
          {!editing ? (
            <>
              {idea.productTitle && (
                <h4 className="text-lg font-medium mb-1">{idea.productTitle}</h4>
              )}
              {idea.productDescription && (
                <p className="text-sm text-gray-600 mb-2 whitespace-pre-line">{idea.productDescription}</p>
              )}
              {tagList.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {tagList.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-xs bg-gray-50 text-gray-600 border border-gray-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {idea.status === 'pending' && (
                <button
                  onClick={() => setEditing(true)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Edit listing
                </button>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Product Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">Tags (comma-separated or JSON array)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder='["tag1", "tag2"] or tag1, tag2'
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setTitle(idea.productTitle || '')
                    setDescription(idea.productDescription || '')
                    setTags(idea.productTags || '')
                    setEditing(false)
                  }}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Revision history */}
      <RevisionHistory entries={revisionHistory} />

      {/* Actions */}
      {idea.status === 'pending' && (
        <ActionBar
          ideaId={idea.id}
          stage="listing"
          nextStage="publish"
          nextStageBuckets={[]}
          onAction={onAction}
        />
      )}
    </div>
  )
}
