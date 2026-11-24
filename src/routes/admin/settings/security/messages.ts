import { uiMessages, type Locale } from '$lib/i18n/locale';

export function securityMessages(locale: Locale) {
  return uiMessages(locale).securitySettings;
}
