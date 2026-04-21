import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'ar', 'fr', 'es'],

  // Used when no locale matches
  defaultLocale: 'fr'
});

// Debug: Add custom middleware wrapper to log locale
export function middleware(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Extract locale from pathname
  const localeMatch = pathname.match(/^\/([a-z]{2})/);
  const detectedLocale = localeMatch ? localeMatch[1] : 'default (fr)';
  
  console.log('[I18N DEBUG] Middleware - Pathname:', pathname);
  console.log('[I18N DEBUG] Middleware - Detected locale:', detectedLocale);
  
  return createMiddleware({
    locales: ['en', 'ar', 'fr', 'es'],
    defaultLocale: 'fr'
  })(request);
}

export const config = {
  // Match all pathnames except for API routes, Next.js internals, and static files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
