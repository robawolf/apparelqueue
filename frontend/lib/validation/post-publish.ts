/**
 * Post publishing validation utilities.
 * Centralized logic for validating posts before publishing.
 * Easy to extend with additional checks.
 */

export interface PostValidationData {
  title?: string
  excerpt?: string
  content?: Array<{_type: string}>
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export interface PostReadiness {
  hasTitle: boolean
  hasExcerpt: boolean
  hasTextContent: boolean
  hasProductImages: boolean
  isReadyToPublish: boolean
  errors: string[]
}

/**
 * Validate a post is ready for publishing.
 * Returns validation result with list of errors.
 */
export function validatePostForPublish(post: PostValidationData): ValidationResult {
  const errors: string[] = []

  // Check title
  if (!post.title?.trim()) {
    errors.push('Missing title')
  }

  // Check excerpt
  if (!post.excerpt?.trim()) {
    errors.push('Missing excerpt')
  }

  // Check content has text blocks
  const hasTextContent = post.content?.some((block) => block._type === 'block') ?? false
  if (!hasTextContent) {
    errors.push('Content not generated')
  }

  // Check content has product images
  const hasProductImages = post.content?.some((block) => block._type === 'productImage') ?? false
  if (!hasProductImages) {
    errors.push('Product images not injected')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Get detailed readiness status for UI display.
 * Provides granular status for each validation check.
 */
export function getPostReadiness(post: PostValidationData): PostReadiness {
  const hasTitle = !!post.title?.trim()
  const hasExcerpt = !!post.excerpt?.trim()
  const hasTextContent = post.content?.some((block) => block._type === 'block') ?? false
  const hasProductImages = post.content?.some((block) => block._type === 'productImage') ?? false

  const errors: string[] = []
  if (!hasTitle) errors.push('Missing title')
  if (!hasExcerpt) errors.push('Missing excerpt')
  if (!hasTextContent) errors.push('Content not generated')
  if (!hasProductImages) errors.push('Images not injected')

  return {
    hasTitle,
    hasExcerpt,
    hasTextContent,
    hasProductImages,
    isReadyToPublish: errors.length === 0,
    errors,
  }
}
