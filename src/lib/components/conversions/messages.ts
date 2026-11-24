import {
  localizedSection,
  locales,
  uiMessages,
  type Locale,
} from '$lib/i18n/locale';

export const archivedDates = Object.fromEntries(
  locales.map((locale) => {
    const { rangeLimit, partialDay } =
      uiMessages(locale).conversionArchivedDates;
    return [locale, [rangeLimit, partialDay] as const] as const;
  }),
) as Record<Locale, readonly [string, string]>;

export function conversionMessages(locale: Locale) {
  return uiMessages(locale).conversions;
}

export const manageHelp = localizedSection('conversionManageHelp');
export const goalHelp = localizedSection('conversionGoalHelp');
export const ratePending = localizedSection('conversionRatePending');
export const incompleteLinkHistory = localizedSection(
  'conversionIncompleteLinkHistory',
);
