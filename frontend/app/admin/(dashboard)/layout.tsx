import AdminLayoutClient from './AdminLayoutClient'

export default async function AdminLayout({children}: {children: React.ReactNode}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
