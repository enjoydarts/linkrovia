import { uiMessages, type Locale } from '$lib/i18n/locale';

export function healthMessages(locale: Locale) {
  return uiMessages(locale).operationsHealth;
}
