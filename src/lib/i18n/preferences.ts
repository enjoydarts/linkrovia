import { uiMessages } from './locale';
import type { Locale } from './locale';

export function preferenceMessages(locale: Locale) {
  return uiMessages(locale).preferences;
}
