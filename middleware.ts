import { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';

const intlMiddleware = createMiddleware({
  locales: ['en', 'ar', 'fr', 'es'],
  defaultLocale: 'fr'
});

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const localeMatch = pathname.match(/^\/([a-z]{2})/);
  const detectedLocale = localeMatch ? localeMatch[1] : 'default (fr)';

  console.log('[I18N DEBUG] Middleware - Pathname:', pathname);
  console.log('[I18N DEBUG] Middleware - Detected locale:', detectedLocale);

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
