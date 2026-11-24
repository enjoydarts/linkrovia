import { uiMessages, type Locale } from '$lib/i18n/locale';

export function ruleMessages(locale: Locale) {
  return uiMessages(locale).linkRules;
}
