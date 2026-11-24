import { uiMessages, type Locale } from '$lib/i18n/locale';

export function linkUtmMessages(locale: Locale) {
  return uiMessages(locale).linkUtm;
}
