import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';

// Can be imported from a shared config
const locales = ['en', 'ar', 'fr', 'es'];

export default getRequestConfig(async ({ locale }) => {
  console.log('[I18N DEBUG] getRequestConfig - Received locale:', locale);
  
  if (!locale || !locales.includes(locale as (typeof locales)[number])) {
    console.log('[I18N DEBUG] getRequestConfig - Invalid locale, not found');
    notFound();
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
