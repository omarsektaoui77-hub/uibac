import {getRequestConfig} from 'next-intl/server';

// Can be imported from a shared config
const locales = ['en', 'ar', 'fr', 'es'];
const defaultLocale = 'fr';

export default getRequestConfig(async ({ locale }) => {
  console.log('[I18N DEBUG] getRequestConfig - Received locale:', locale);

  // If locale is undefined or invalid, use default locale instead of notFound()
  // This prevents 404s when next-intl calls getRequestConfig during rendering
  if (!locale || !locales.includes(locale as (typeof locales)[number])) {
    console.log('[I18N DEBUG] getRequestConfig - Invalid locale, using default:', defaultLocale);
    locale = defaultLocale;
  }

  const resolved = locale as (typeof locales)[number];
  console.log('[I18N DEBUG] getRequestConfig - Resolved locale:', resolved);

  const messages = (await import(`../messages/${resolved}.json`)).default;
  console.log('[I18N DEBUG] getRequestConfig - Loaded messages keys:', Object.keys(messages));

  return {
    locale: resolved,
    messages,
  };
});
