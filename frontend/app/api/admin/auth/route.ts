import {draftMode} from 'next/headers'
import {redirect} from 'next/navigation'
import {NextRequest} from 'next/server'

/**
 * Simple admin authentication endpoint
 * Enables draft mode with a secret token
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const secret = searchParams.get('secret')
  const redirectTo = searchParams.get('redirect') || '/admin'

  // Check secret matches environment variable
  const expectedSecret = process.env.ADMIN_SECRET || 'change-this-secret'

  if (secret !== expectedSecret) {
    // Preserve the redirect URL in the error redirect
    const errorRedirect = `/admin/login?error=invalid${redirectTo !== '/admin' ? `&redirect=${encodeURIComponent(redirectTo)}` : ''}`
    redirect(errorRedirect)
  }

  // Enable draft mode
  const draft = await draftMode()
  draft.enable()

  // Redirect to admin or specified path
  redirect(redirectTo)
}
