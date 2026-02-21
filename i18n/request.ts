import { getRequestConfig } from 'next-intl/server';
import { i18n } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && i18n.locales.includes(requested as (typeof i18n.locales)[number])
    ? requested
    : i18n.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: 'Asia/Tehran',
    now: new Date(),
  };
});
