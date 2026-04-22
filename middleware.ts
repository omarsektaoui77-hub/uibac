import { NextRequest } from 'next/server';
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
  const detectedLocale = localeMatch ? localeMatch[1] : 'default (fr)';

  console.log('[I18N DEBUG] Middleware - Pathname:', pathname);
  console.log('[I18N DEBUG] Middleware - Detected locale:', detectedLocale);

  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except for API routes, Next.js internals, and static files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
