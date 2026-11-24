import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json' with { type: 'json' };
import {
  locales,
  preferredLocale,
  resolveLocale,
} from '../../src/lib/i18n/locale';
import { parseDefaultLocale } from '../../src/lib/server/db/preferences';
import {
  interpretLocalDateTime,
  resolveTimeZone,
  timeZones,
} from '../../src/lib/timezone/timezone';

function catalogShape(value: unknown): unknown {
  if (typeof value === 'string') {
    expect(value.trim()).not.toBe('');
    return 'text';
  }
  if (Array.isArray(value)) return value.map(catalogShape);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, catalogShape(child)]),
    );
  }
  return value;
}

describe('locale preferences', () => {
  it('prefers the user, then the cookie, then weighted languages', () => {
    expect(resolveLocale('ja', 'it', 'es')).toBe('ja');
    expect(resolveLocale(undefined, 'it', 'es')).toBe('it');
    expect(
      resolveLocale(undefined, undefined, 'es;q=0.4,zh-Hant-HK;q=0.9'),
    ).toBe('zh-TW');
    expect(resolveLocale(undefined, undefined, 'ja;q=0,nl;q=1')).toBe('en');
  });

  it('uses the matching regional catalog', () => {
    expect(resolveLocale(undefined, undefined, 'zh-Hans-SG')).toBe('zh-CN');
    expect(resolveLocale(undefined, undefined, 'es-MX')).toBe('es');
  });

  it('negotiates and persists the French locale', () => {
    expect(resolveLocale(undefined, undefined, 'FR-ca,en-US;q=0.8')).toBe('fr');
    expect(resolveLocale(undefined, undefined, 'fr-CH;q=0.4,it;q=1')).toBe(
      'it',
    );
    expect(resolveLocale(undefined, 'fr', 'ja')).toBe('fr');
    expect(resolveLocale('fr', 'it', 'en')).toBe('fr');
    expect(preferredLocale(undefined, undefined, 'fr-FR;q=0')).toBeUndefined();
    expect(parseDefaultLocale('"fr"')).toBe('fr');
  });

  it.each([
    ['de-AT', 'de'],
    ['DE-de', 'de'],
    ['ko-KR', 'ko'],
    ['pt-BR', 'pt'],
    ['pt-PT', 'pt'],
  ])('resolves %s to %s in locale preferences', (language, locale) => {
    expect(resolveLocale(undefined, undefined, `en;q=0.5,${language}`)).toBe(
      locale,
    );
    expect(resolveLocale(locale, 'en', 'fr')).toBe(locale);
    expect(resolveLocale(undefined, locale, 'fr')).toBe(locale);
    expect(parseDefaultLocale(JSON.stringify(locale))).toBe(locale);
  });

  it('has one complete catalog with the same message structure for every locale', () => {
    const catalogs = import.meta.glob('../../messages/*.json', {
      eager: true,
      import: 'default',
    });
    expect(Object.keys(catalogs).sort()).toEqual(
      locales.map((locale) => `../../messages/${locale}.json`).sort(),
    );
    const englishShape = catalogShape(en);
    for (const locale of locales) {
      const catalog = catalogs[`../../messages/${locale}.json`];
      expect(catalogShape(catalog), locale).toEqual(englishShape);
    }
  });
});

describe('timezone preferences', () => {
  it('includes UTC and timezones with fractional offsets', () => {
    expect(timeZones).toEqual(
      expect.arrayContaining(['UTC', 'Asia/Kolkata', 'Asia/Kathmandu']),
    );
    expect(resolveTimeZone('Not/AZone', 'Europe/Rome')).toBe('Europe/Rome');
    expect(resolveTimeZone(null, null)).toBe('UTC');
  });

  it('resolves exact wall clock times and identifies DST gaps and overlaps', () => {
    expect(
      interpretLocalDateTime('2026-11-22T12:00', 'Asia/Kathmandu'),
    ).toEqual({
      kind: 'exact',
      epochSeconds: Date.parse('2026-11-22T06:15:00Z') / 1000,
    });
    expect(
      interpretLocalDateTime('2026-03-08T02:30', 'America/New_York'),
    ).toEqual({ kind: 'gap' });
    expect(
      interpretLocalDateTime('2026-11-01T01:30', 'America/New_York'),
    ).toEqual({
      kind: 'overlap',
      earlier: Date.parse('2026-11-01T05:30:00Z') / 1000,
      later: Date.parse('2026-11-01T06:30:00Z') / 1000,
    });
  });
});
