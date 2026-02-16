import {client} from '@/lib/sanity/client'
import {token} from '@/lib/sanity/token'
import {draftPostsQuery} from '@/lib/sanity/queries'
import DraftPostsSection from '@/app/components/admin/DraftPostsSection'

export default async function DraftsPage() {
  // Fetch all draft posts - use raw perspective to see drafts with their drafts.* IDs
  const draftClient = client.withConfig({
    perspective: 'raw',
    useCdn: false,
    token,
  })
  const draftPosts = await draftClient.fetch(draftPostsQuery)

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">Draft Posts</h1>
      <DraftPostsSection draftPosts={draftPosts || []} />
    </div>
  )
}
