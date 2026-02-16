'use client'

import {useState} from 'react'
import {toast} from 'sonner'

type PostAdminControlsProps = {
  postId: string
  status: 'draft' | 'published'
}

export default function PostAdminControls({postId, status}: PostAdminControlsProps) {
  const [publishing, setPublishing] = useState(false)

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const response = await fetch(`/api/admin/posts/${postId}/publish`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to publish post')
      }

      toast.success('Post published successfully!')
      window.location.reload()
    } catch (error) {
      console.error('Error publishing post:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to publish post')
    } finally {
      setPublishing(false)
    }
  }

  // Only show for drafts
  if (status !== 'draft') {
    return null
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2 p-4 bg-white rounded-lg shadow-xl border border-gray-200">
      <div className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">
        Draft Post
      </div>

      <button
        onClick={handlePublish}
        disabled={publishing}
        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {publishing ? 'Publishing...' : 'Publish'}
      </button>
    </div>
  )
}
