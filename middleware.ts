import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from './src/lib/auth/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Debug: Log cookies received by middleware (dev only)
  if (process.env.NODE_ENV === 'development') {
    const cookies = request.cookies.getAll();
    const cookieNames = cookies.map(c => c.name);
    const supabaseCookieNames = cookieNames.filter(name => 
      name.includes('supabase') || 
      name.startsWith('sb-') || 
      name.includes('auth')
    );
    
    console.log('[Middleware] Request path:', pathname);
    console.log('[Middleware] Supabase-related cookies:', supabaseCookieNames);
  }
  
  // Validate session using Supabase JWT (now using createServerClient for v2 compatibility)
  const session = await getSessionFromRequest(request);
  const hasValidSession = session !== null;
  
  // Log session user id for debugging (as requested)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Middleware] Session user id:', session?.user?.id ?? null);
    console.log('[Middleware] Session validation result:', {
      hasValidSession,
      session: session ? { userId: session.user.id, email: session.user.email } : null,
    });
  }

  // Handle authentication routes
  if (pathname.startsWith('/authentication/login') || pathname.startsWith('/authentication/register')) {
    // If user is already authenticated, redirect to dashboard
    if (hasValidSession) {
      console.log('[Middleware] Redirecting authenticated user from login to dashboard');
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // Otherwise, allow access to login/register pages
    return NextResponse.next();
  }

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/clients') || pathname.startsWith('/offers') || pathname.startsWith('/templates')) {
    if (!hasValidSession) {
      console.log('[Middleware] Redirecting to login - no valid session');
      return NextResponse.redirect(new URL('/authentication/login', request.url));
    }
  }

  // Redirect authenticated users away from old auth pages (legacy /auth/ routes)
  if (pathname.startsWith('/auth/')) {
    if (hasValidSession) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};


