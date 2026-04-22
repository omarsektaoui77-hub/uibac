import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';

const intlMiddleware = createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'ar', 'fr', 'es'],

  // Used when no locale matches
  defaultLocale: 'fr'
});

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Extract locale from pathname for debugging
  const localeMatch = pathname.match(/^\/([a-z]{2})/);
  const detectedLocale = localeMatch ? localeMatch[1] : 'fr';

  console.log('[I18N DEBUG] Middleware - Pathname:', pathname);
  console.log('[I18N DEBUG] Middleware - Detected locale:', detectedLocale);

  // Skip API routes and static files
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
    return intlMiddleware(request);
  }

  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except for API routes, Next.js internals, and static files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
