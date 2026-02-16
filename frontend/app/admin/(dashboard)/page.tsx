import {redirect} from 'next/navigation'

/**
 * Admin dashboard root - redirects to products page
 * Protected by admin layout - only accessible when draft mode is enabled
 */
export default function AdminPage() {
  redirect('/admin/products')
}
