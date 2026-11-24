import en from '../../../messages/en.json' with { type: 'json' };
import ja from '../../../messages/ja.json' with { type: 'json' };
import zhCN from '../../../messages/zh-CN.json' with { type: 'json' };
import zhTW from '../../../messages/zh-TW.json' with { type: 'json' };
import es from '../../../messages/es.json' with { type: 'json' };
import it from '../../../messages/it.json' with { type: 'json' };
import fr from '../../../messages/fr.json' with { type: 'json' };
import de from '../../../messages/de.json' with { type: 'json' };
import ko from '../../../messages/ko.json' with { type: 'json' };
import pt from '../../../messages/pt.json' with { type: 'json' };
import { brand } from '../brand';

export const locales = [
  'en',
  'ja',
  'zh-CN',
  'zh-TW',
  'es',
  'it',
  'fr',
  'de',
  'ko',
  'pt',
] as const;
export type Locale = (typeof locales)[number];

const catalogs = {
  en,
  ja,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  es,
  it,
  fr,
  de,
  ko,
  pt,
} satisfies Record<Locale, typeof en>;

type Catalog = typeof en;

export function uiMessages(locale: Locale): Catalog {
  return catalogs[locale];
}

export function localizedSection<Key extends keyof Catalog>(section: Key) {
  return Object.fromEntries(
    locales.map((locale) => [locale, uiMessages(locale)[section]]),
  ) as Record<Locale, Catalog[Key]>;
}

export const localeNames = localizedSection('languageName');

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && Object.hasOwn(catalogs, value);
}

export function messagesFor(locale: Locale): Catalog['shared'] {
  const messages = { ...en.shared, ...uiMessages(locale).shared };
  if (brand.name !== 'Linkrovia') {
    for (const key of Object.keys(messages) as (keyof Catalog['shared'])[]) {
      messages[key] = messages[key].replaceAll('Linkrovia', () => brand.name);
    }
  }
  return messages;
}

export function preferredLocale(
  user: unknown,
  cookie: unknown,
  acceptLanguage: string | null = null,
): Locale | undefined {
  if (isLocale(user)) return user;
  if (isLocale(cookie)) return cookie;

  const candidates = (acceptLanguage ?? '')
    .split(',')
    .map((entry) => {
      const [tag, parameter] = entry.trim().split(';');
      const weight =
        parameter === undefined
          ? 1
          : /^q=(0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/i.exec(parameter.trim())?.[1];
      return { tag: tag.toLowerCase(), weight: Number(weight ?? 0) };
    })
    .sort((a, b) => b.weight - a.weight);

  for (const { tag, weight } of candidates) {
    if (weight === 0) break;
    const [language, ...subtags] = tag.split('-');
    if (language === 'zh') {
      if (subtags.includes('hant')) return 'zh-TW';
      if (subtags.includes('hans')) return 'zh-CN';
      return subtags.some((subtag) => ['tw', 'hk', 'mo'].includes(subtag))
        ? 'zh-TW'
        : 'zh-CN';
    }
    if (isLocale(language)) return language;
  }
}

export function resolveLocale(
  user: unknown,
  cookie: unknown,
  acceptLanguage: string | null = null,
): Locale {
  return preferredLocale(user, cookie, acceptLanguage) ?? 'en';
}
