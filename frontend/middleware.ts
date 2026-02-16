import {NextRequest, NextResponse} from 'next/server'

export async function middleware(request: NextRequest) {
  const {pathname} = request.nextUrl

  // Allow auth API routes and Inngest webhook through
  if (pathname.startsWith('/api/auth/') || pathname.startsWith('/api/inngest')) {
    return NextResponse.next()
  }

  // Allow the login page through
  if (pathname === '/admin/login') {
    return NextResponse.next()
  }

  // Protect /admin/* and /api/admin/* routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const sessionToken = request.cookies.get('better-auth.session_token')?.value

    if (!sessionToken) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({error: 'Unauthorized'}, {status: 401})
      }
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
