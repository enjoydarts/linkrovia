import { uiMessages, type Locale } from '$lib/i18n/locale';

export function backupMessages(locale: Locale) {
  return uiMessages(locale).backup;
}
