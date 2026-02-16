import {NextResponse} from 'next/server'
import type {NextRequest} from 'next/server'

export function proxy(request: NextRequest) {
  // Add pathname to headers so server components can access the current URL
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)
  requestHeaders.set('x-search', request.nextUrl.search)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    // Match admin routes for URL capture
    '/admin/:path*',
  ],
}
