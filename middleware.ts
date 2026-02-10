import createMiddleware from 'next-intl/middleware';
import { i18n } from './i18n/config';

export default createMiddleware({
  locales: i18n.locales,
  defaultLocale: i18n.defaultLocale,
  localePrefix: 'as-needed',
});

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|admin|.*\\..*).*)',
  ],
};
