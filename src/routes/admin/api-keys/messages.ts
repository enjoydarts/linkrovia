import { uiMessages, type Locale } from '$lib/i18n/locale';

export function apiKeyMessages(locale: Locale) {
  return uiMessages(locale).apiKeys;
}
