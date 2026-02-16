'use client'

import {useCallback, useEffect, useState} from 'react'

interface Category {
  id: string
  name: string
  slug: string
  description: string
  promptContext: string
  targetCount: number
  isActive: boolean
  _count?: {ideas: number}
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    promptContext: '',
    targetCount: 10,
  })

  const fetchCategories = useCallback(async () => {
    const res = await fetch('/api/admin/categories')
    const data = await res.json()
    setCategories(data)
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  function slugify(text: string) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  async function handleCreate() {
    await fetch('/api/admin/categories', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(form),
    })
    setCreating(false)
    setForm({name: '', slug: '', description: '', promptContext: '', targetCount: 10})
    fetchCategories()
  }

  async function handleUpdate(id: string, data: Partial<Category>) {
    await fetch(`/api/admin/categories/${id}`, {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data),
    })
    setEditing(null)
    fetchCategories()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this category?')) return
    const res = await fetch(`/api/admin/categories/${id}`, {method: 'DELETE'})
    if (!res.ok) {
      const data = await res.json()
      alert(data.error)
      return
    }
    fetchCategories()
  }

  async function handleToggleActive(cat: Category) {
    await handleUpdate(cat.id, {isActive: !cat.isActive})
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <button
          onClick={() => setCreating(true)}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          New Category
        </button>
      </div>

      {creating && (
        <div className="mb-4 rounded border border-gray-700 bg-gray-800 p-4">
          <h3 className="mb-3 font-medium">New category</h3>
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => {
              setForm({...form, name: e.target.value, slug: slugify(e.target.value)})
            }}
            className="mb-2 w-full rounded bg-gray-700 px-3 py-2 text-sm"
          />
          <input
            placeholder="Slug"
            value={form.slug}
            onChange={(e) => setForm({...form, slug: e.target.value})}
            className="mb-2 w-full rounded bg-gray-700 px-3 py-2 text-sm"
          />
          <input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({...form, description: e.target.value})}
            className="mb-2 w-full rounded bg-gray-700 px-3 py-2 text-sm"
          />
          <textarea
            placeholder="AI prompt context"
            value={form.promptContext}
            onChange={(e) => setForm({...form, promptContext: e.target.value})}
            className="mb-2 w-full rounded bg-gray-700 px-3 py-2 text-sm"
            rows={3}
          />
          <input
            type="number"
            placeholder="Target count"
            value={form.targetCount}
            onChange={(e) =>
              setForm({...form, targetCount: parseInt(e.target.value) || 10})
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
        {categories.map((cat) => (
          <div
            key={cat.id}
            className={`rounded border p-4 ${
              cat.isActive
                ? 'border-gray-700 bg-gray-800'
                : 'border-gray-800 bg-gray-900 opacity-60'
            }`}
          >
            {editing === cat.id ? (
              <CategoryEditor
                category={cat}
                onSave={(data) => handleUpdate(cat.id, data)}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{cat.name}</h3>
                    <span className="text-xs text-gray-500">/{cat.slug}</span>
                    {!cat.isActive && (
                      <span className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-400">
                        Inactive
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {cat._count?.ideas ?? 0} ideas / {cat.targetCount} target
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(cat)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      {cat.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => setEditing(cat.id)}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {cat.description && (
                  <p className="text-sm text-gray-400">{cat.description}</p>
                )}
                {cat.promptContext && (
                  <p className="mt-1 text-xs text-gray-500">
                    Prompt: {cat.promptContext}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
        {categories.length === 0 && (
          <p className="py-8 text-center text-gray-500">
            No categories yet. Run database seed or create one.
          </p>
        )}
      </div>
    </div>
  )
}

function CategoryEditor({
  category,
  onSave,
  onCancel,
}: {
  category: Category
  onSave: (data: Partial<Category>) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(category.name)
  const [description, setDescription] = useState(category.description)
  const [promptContext, setPromptContext] = useState(category.promptContext)
  const [targetCount, setTargetCount] = useState(category.targetCount)

  return (
    <div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mb-2 w-full rounded bg-gray-700 px-3 py-2 text-sm"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="mb-2 w-full rounded bg-gray-700 px-3 py-2 text-sm"
        placeholder="Description"
      />
      <textarea
        value={promptContext}
        onChange={(e) => setPromptContext(e.target.value)}
        className="mb-2 w-full rounded bg-gray-700 px-3 py-2 text-sm"
        rows={3}
        placeholder="AI prompt context"
      />
      <input
        type="number"
        value={targetCount}
        onChange={(e) => setTargetCount(parseInt(e.target.value) || 10)}
        className="mb-3 w-24 rounded bg-gray-700 px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSave({name, description, promptContext, targetCount})}
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
