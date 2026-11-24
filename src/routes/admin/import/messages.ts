import { uiMessages, type Locale } from '$lib/i18n/locale';

export function csvMessages(locale: Locale) {
  return uiMessages(locale).csvImport;
}
