import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check for session cookie or auth header
  const sessionCookie = request.cookies.get('sb-access-token');
  const hasSession = !!sessionCookie;

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/clients') || pathname.startsWith('/offers') || pathname.startsWith('/templates')) {
    if (!hasSession) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  // Redirect authenticated users away from auth pages
  if (pathname.startsWith('/auth/')) {
    if (hasSession) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

