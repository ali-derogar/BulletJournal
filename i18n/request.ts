import { getRequestConfig } from 'next-intl/server';
import { i18n } from './config';

export default getRequestConfig(async ({ locale }) => {
  if (!locale || !i18n.locales.includes(locale as any)) {
    return {
      locale: i18n.defaultLocale,
      messages: (await import(`../messages/${i18n.defaultLocale}.json`)).default,
      timeZone: 'Asia/Tehran',
      now: new Date(),
    };
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: 'Asia/Tehran',
    now: new Date(),
  };
});
