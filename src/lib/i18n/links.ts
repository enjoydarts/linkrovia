import { uiMessages, type Locale } from './locale';

export type LinkMessages = ReturnType<typeof uiMessages>['links'];

export function linkMessages(locale: Locale): LinkMessages {
  return uiMessages(locale).links;
}

export function linkExtra(locale: Locale) {
  return uiMessages(locale).linkExtra;
}
