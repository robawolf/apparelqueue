import {draftMode} from 'next/headers'
import {NextRequest, NextResponse} from 'next/server'
import {client} from '@/lib/sanity/client'
import {writeToken} from '@/lib/sanity/write-token'
import {validatePostForPublish, type PostValidationData} from '@/lib/validation/post-publish'

/**
 * API route to publish a draft post
 * POST /api/admin/posts/[id]/publish
 */
export async function POST(
  request: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  // Require draft mode (admin authentication)
  const {isEnabled} = await draftMode()
  if (!isEnabled) {
    return NextResponse.json({error: 'Unauthorized - draft mode required'}, {status: 401})
  }

  try {
    const {id} = await params

    // Remove 'drafts.' prefix if present
    const draftId = id.startsWith('drafts.') ? id : `drafts.${id}`
    const publishedId = id.replace('drafts.', '')

    // Use write token for mutations
    const writeClient = client.withConfig({token: writeToken})

    // Fetch the draft document
    const draft = await writeClient.getDocument(draftId)

    if (!draft) {
      return NextResponse.json(
        {error: 'Draft post not found'},
        {status: 404},
      )
    }

    // Validate post is ready for publishing
    const validation = validatePostForPublish(draft as PostValidationData)
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: `Cannot publish: ${validation.errors.join(', ')}`,
          errors: validation.errors,
        },
        {status: 400},
      )
    }

    // Create transaction to publish
    const transaction = writeClient.transaction()

    // Create or update published document
    transaction.createOrReplace({
      ...draft,
      _id: publishedId,
    })

    // Delete the draft
    transaction.delete(draftId)

    // Commit the transaction
    const result = await transaction.commit()

    return NextResponse.json({
      success: true,
      publishedId,
      result,
    })
  } catch (error) {
    console.error('Error publishing post:', error)
    return NextResponse.json(
      {error: 'Failed to publish post'},
      {status: 500},
    )
  }
}
