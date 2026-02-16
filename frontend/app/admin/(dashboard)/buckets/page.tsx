'use client'

import {useCallback, useEffect, useState} from 'react'

interface Bucket {
  id: string
  stage: string
  name: string
  prompt: string
  isActive: boolean
  sortOrder: number
}

const STAGES = ['phrase', 'design', 'product', 'listing'] as const

export default function BucketsPage() {
  const [buckets, setBuckets] = useState<Bucket[]>([])
  const [activeStage, setActiveStage] = useState<string>('phrase')
  const [editing, setEditing] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({name: '', prompt: '', sortOrder: 0})

  const fetchBuckets = useCallback(async () => {
    const res = await fetch(`/api/admin/buckets?stage=${activeStage}`)
    const data = await res.json()
    setBuckets(data)
  }, [activeStage])

  useEffect(() => {
    fetchBuckets()
  }, [fetchBuckets])

  async function handleCreate() {
    await fetch('/api/admin/buckets', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({...form, stage: activeStage}),
    })
    setCreating(false)
    setForm({name: '', prompt: '', sortOrder: 0})
    fetchBuckets()
  }

  async function handleUpdate(id: string, data: Partial<Bucket>) {
    await fetch(`/api/admin/buckets/${id}`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data),
    })
    setEditing(null)
    fetchBuckets()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this bucket?')) return
    await fetch(`/api/admin/buckets/${id}`, {method: 'DELETE'})
    fetchBuckets()
  }

  async function handleToggleActive(bucket: Bucket) {
    await handleUpdate(bucket.id, {isActive: !bucket.isActive})
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Buckets</h1>
        <button
          onClick={() => setCreating(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          New Bucket
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        {STAGES.map((stage) => (
          <button
            key={stage}
            onClick={() => setActiveStage(stage)}
            className={`rounded px-3 py-1.5 text-sm font-medium capitalize ${
              activeStage === stage
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {stage}
          </button>
        ))}
      </div>

      {creating && (
        <div className="mb-4 rounded border border-gray-700 bg-gray-800 p-4">
          <h3 className="mb-3 font-medium">
            New {activeStage} bucket
          </h3>
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({...form, name: e.target.value})}
            className="mb-2 w-full rounded bg-gray-700 px-3 py-2 text-sm"
          />
          <textarea
            placeholder="AI directive prompt"
            value={form.prompt}
            onChange={(e) => setForm({...form, prompt: e.target.value})}
            className="mb-2 w-full rounded bg-gray-700 px-3 py-2 text-sm"
            rows={3}
          />
          <input
            type="number"
            placeholder="Sort order"
            value={form.sortOrder}
            onChange={(e) =>
              setForm({...form, sortOrder: parseInt(e.target.value) || 0})
            }
            className="mb-3 w-24 rounded bg-gray-700 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
            >
              Create
            </button>
            <button
              onClick={() => setCreating(false)}
              className="rounded bg-gray-600 px-3 py-1.5 text-sm text-white hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {buckets.map((bucket) => (
          <div
            key={bucket.id}
            className={`rounded border p-4 ${
              bucket.isActive
                ? 'border-gray-700 bg-gray-800'
                : 'border-gray-800 bg-gray-900 opacity-60'
            }`}
          >
            {editing === bucket.id ? (
              <BucketEditor
                bucket={bucket}
                onSave={(data) => handleUpdate(bucket.id, data)}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{bucket.name}</h3>
                    {!bucket.isActive && (
                      <span className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-400">
                        Inactive
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      #{bucket.sortOrder}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(bucket)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      {bucket.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => setEditing(bucket.id)}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(bucket.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-400">{bucket.prompt}</p>
              </div>
            )}
          </div>
        ))}
        {buckets.length === 0 && (
          <p className="py-8 text-center text-gray-500">
            No {activeStage} buckets yet.
          </p>
        )}
      </div>
    </div>
  )
}

function BucketEditor({
  bucket,
  onSave,
  onCancel,
}: {
  bucket: Bucket
  onSave: (data: Partial<Bucket>) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(bucket.name)
  const [prompt, setPrompt] = useState(bucket.prompt)
  const [sortOrder, setSortOrder] = useState(bucket.sortOrder)

  return (
    <div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mb-2 w-full rounded bg-gray-700 px-3 py-2 text-sm"
      />
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="mb-2 w-full rounded bg-gray-700 px-3 py-2 text-sm"
        rows={3}
      />
      <input
        type="number"
        value={sortOrder}
        onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
        className="mb-3 w-24 rounded bg-gray-700 px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSave({name, prompt, sortOrder})}
          className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="rounded bg-gray-600 px-3 py-1.5 text-sm text-white hover:bg-gray-500"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
