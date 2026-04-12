import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'ar', 'fr', 'esp'],

  // Used when no locale matches
  defaultLocale: 'en',
  
  // Optional: Set to true if you want to use the locale prefix in the URL
  localePrefix: 'always'
});

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(ar|en|fr|esp)/:path*']
};
