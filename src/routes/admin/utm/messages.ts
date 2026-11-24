import { uiMessages, type Locale } from '$lib/i18n/locale';

export function utmMessages(locale: Locale) {
  return uiMessages(locale).utmBuilder;
}
