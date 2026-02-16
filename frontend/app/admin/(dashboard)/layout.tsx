import {draftMode, headers} from 'next/headers'
import {redirect} from 'next/navigation'
import AdminLayoutClient from './AdminLayoutClient'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const {isEnabled} = await draftMode()

  if (!isEnabled) {
    // Get the current URL path to redirect back after login
    const headersList = await headers()
    const pathname = headersList.get('x-pathname') || headersList.get('x-invoke-path') || '/admin'
    const searchParams = headersList.get('x-search') || ''
    const redirectUrl = pathname + searchParams

    redirect(`/admin/login?redirect=${encodeURIComponent(redirectUrl)}`)
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
