import { uiMessages, type Locale } from '$lib/i18n/locale';

export function analyticsMessages(locale: Locale) {
  return uiMessages(locale).analytics;
}

export function analyticsArchiveMessages(locale: Locale) {
  return uiMessages(locale).analyticsArchive;
}

export function analyticsPeriodMessages(locale: Locale) {
  return uiMessages(locale).analyticsPeriod;
}

export function analyticsRepairMessages(locale: Locale) {
  return uiMessages(locale).analyticsRepair;
}
