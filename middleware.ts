import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'ar', 'fr', 'es'],

  // Used when no locale matches
  defaultLocale: 'en'
});

export const config = {
  // Match all pathnames except for API routes, Next.js internals, and static files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
