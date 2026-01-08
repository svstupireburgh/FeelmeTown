import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const MANAGEMENT_ACCESS_COOKIE = 'managementAccess';
const ADMIN_ACCESS_COOKIE = 'adminAccess';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if the request is for admin routes
  if (pathname.startsWith('/Administrator')) {
    const hasSecretAccess =
      request.cookies.get(ADMIN_ACCESS_COOKIE)?.value === 'granted';

    if (!hasSecretAccess) {
      const notFoundUrl = new URL('/404', request.url);
      return NextResponse.rewrite(notFoundUrl);
    }
  }

  // Check if the request is for staff management routes
  if (pathname.startsWith('/management')) {
    const hasSecretAccess =
      request.cookies.get(MANAGEMENT_ACCESS_COOKIE)?.value === 'granted';

    if (!hasSecretAccess) {
      // Pretend the page doesn't exist unless the secret cookie is present
      const notFoundUrl = new URL('/404', request.url);
      return NextResponse.rewrite(notFoundUrl);
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/Administrator/:path*',
    '/management/:path*',
  ],
};
