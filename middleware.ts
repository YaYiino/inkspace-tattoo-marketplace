import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID()
  
  // Add request ID to headers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)

  // Create response
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-Request-ID', requestId)

  // Add CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID')
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: response.headers })
  }

  // Rate limiting check (simplified for Edge Runtime)
  const rateLimitResult = checkRateLimit(request)
  if (!rateLimitResult.allowed) {
    return new NextResponse('Too Many Requests', { 
      status: 429,
      headers: {
        'Retry-After': rateLimitResult.retryAfter.toString(),
        ...Object.fromEntries(response.headers.entries())
      }
    })
  }

  // Authentication check for protected routes
  if (isProtectedRoute(request.nextUrl.pathname)) {
    const authResult = checkAuthentication(request)
    if (!authResult.authenticated) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Simple console logging for development (Edge Runtime compatible)
  if (process.env.NODE_ENV === 'development') {
    console.log(`${request.method} ${request.nextUrl.pathname} - ${requestId}`)
  }

  return response
}

function checkRateLimit(request: NextRequest): { allowed: boolean; retryAfter: number } {
  // Simple in-memory rate limiting (replace with Redis in production)
  const ip = getClientIP(request)
  const key = `rate_limit:${ip}`
  
  // For now, allow all requests (implement proper rate limiting with Redis)
  return { allowed: true, retryAfter: 0 }
}

function isProtectedRoute(pathname: string): boolean {
  const protectedRoutes = [
    '/dashboard',
    '/profile-completion',
    '/api/bookings',
    '/api/user',
  ]
  
  return protectedRoutes.some(route => pathname.startsWith(route))
}

function checkAuthentication(request: NextRequest): { authenticated: boolean; userId?: string } {
  // Check for Supabase session cookie or Authorization header
  const sessionCookie = request.cookies.get('sb-access-token')
  const authHeader = request.headers.get('authorization')
  
  if (sessionCookie || authHeader) {
    // In a real implementation, you'd validate the token with Supabase
    return { authenticated: true }
  }
  
  return { authenticated: false }
}

function getClientIP(request: NextRequest): string {
  // Try different headers for IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  return realIP || cfConnectingIP || 'unknown'
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}