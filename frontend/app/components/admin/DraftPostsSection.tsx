'use client'

import {useState} from 'react'
import {toast} from 'sonner'
import {getPostReadiness, type PostValidationData} from '@/lib/validation/post-publish'

type DraftPost = {
  _id: string
  title: string
  slug: string | null
  excerpt: string | null
  content: Array<{_type: string}> | null
  postType: 'general' | 'productReview' | 'comparison' | null
  _updatedAt: string
  author: {
    firstName: string | null
    lastName: string | null
  } | null
  product: {
    name: string | null
    asin: string | null
    discoveryImage: string | null
  } | null
  products: Array<{
    name: string | null
    asin: string | null
    discoveryImage: string | null
  }> | null
}

interface DraftPostsSectionProps {
  draftPosts: DraftPost[]
}

export default function DraftPostsSection({draftPosts}: DraftPostsSectionProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handlePublishPost = async (postId: string) => {
    setLoading(postId)
    try {
      const response = await fetch(`/api/admin/posts/${postId}/publish`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to publish post')
      }

      toast.success('Post published successfully')
      // Refresh the page to show updated data
      window.location.reload()
    } catch (error) {
      console.error('Error publishing post:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to publish post')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      {draftPosts.map((post) => {
        const readiness = getPostReadiness({
          title: post.title,
          excerpt: post.excerpt ?? undefined,
          content: post.content ?? undefined,
        } as PostValidationData)

        // Post is "generating" if it has no content yet
        const isGenerating = !readiness.hasTextContent

        return (
          <div
            key={post._id}
            className={`bg-white rounded-lg shadow-md p-3 sm:p-6 ${isGenerating ? 'relative overflow-hidden' : ''}`}
          >
            {/* Generating overlay with animated shimmer */}
            {isGenerating && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-50/50 to-transparent animate-shimmer" />
              </div>
            )}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold mb-1">{post.title}</h3>
                <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                  {post.postType && (
                    <span className="px-2 py-1 bg-gray-100 rounded">
                      {post.postType}
                    </span>
                  )}
                  {post.author && (
                    <span>
                      by {post.author.firstName} {post.author.lastName}
                    </span>
                  )}
                  <span>
                    Updated: {new Date(post._updatedAt).toLocaleDateString()}
                  </span>
                </div>
                {/* Validation Status */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {readiness.isReadyToPublish ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                      Ready to publish
                    </span>
                  ) : isGenerating ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generating content...
                    </span>
                  ) : (
                    <>
                      {!readiness.hasProductImages && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                          Images not injected
                        </span>
                      )}
                      {!readiness.hasExcerpt && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                          Missing excerpt
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

          {/* Associated Products */}
          {post.product && (
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm font-medium mb-2">Product Review:</p>
              <div className="flex items-center gap-3">
                {post.product.discoveryImage ? (
                  <img
                    src={post.product.discoveryImage}
                    alt={post.product.name || 'Product image'}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                    No img
                  </div>
                )}
                <p className="text-sm text-gray-600">
                  {post.product.name} (ASIN: {post.product.asin})
                </p>
              </div>
            </div>
          )}

          {post.products && post.products.length > 0 && (
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm font-medium mb-2">Comparison Products:</p>
              <div className="flex flex-wrap gap-3">
                {post.products.map((product, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {product.discoveryImage ? (
                      <img
                        src={product.discoveryImage}
                        alt={product.name || 'Product image'}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                        No img
                      </div>
                    )}
                    <p className="text-sm text-gray-600">
                      {product.name} (ASIN: {product.asin})
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handlePublishPost(post._id)}
                disabled={loading === post._id || !readiness.isReadyToPublish}
                className="px-3 sm:px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title={
                  !readiness.isReadyToPublish
                    ? `Cannot publish: ${readiness.errors.join(', ')}`
                    : 'Publish this post'
                }
              >
                {loading === post._id ? 'Publishing...' : 'Publish'}
              </button>
              {post.slug && (
                isGenerating ? (
                  <span
                    className="px-3 sm:px-4 py-2 bg-gray-100 text-gray-400 text-sm rounded cursor-not-allowed"
                    title="Preview unavailable while content is generating"
                  >
                    Preview
                  </span>
                ) : (
                  <a
                    href={`/posts/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                  >
                    Preview
                  </a>
                )
              )}
            </div>
          </div>
        )
      })}

      {draftPosts.length === 0 && (
        <p className="text-center text-gray-500 py-8">No draft posts found</p>
      )}
    </div>
  )
}
