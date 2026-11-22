import { InMemoryAnalyticsRepository, type ClickSample } from './in-memory';

const daySeconds = 86_400;
const profiles = [
  {
    os: 'ios',
    device: 'mobile',
    browser: 'safari',
    country: 'JP',
    referrer: 'direct',
  },
  {
    os: 'ipados',
    device: 'tablet',
    browser: 'safari',
    country: 'IT',
    referrer: 'example.com',
  },
  {
    os: 'android',
    device: 'mobile',
    browser: 'chrome',
    country: 'TW',
    referrer: 'example.org',
  },
  {
    os: 'windows',
    device: 'desktop',
    browser: 'edge',
    country: 'US',
    referrer: 'example.net',
  },
  {
    os: 'macos',
    device: 'desktop',
    browser: 'safari',
    country: 'ES',
    referrer: 'direct',
  },
  {
    os: 'linux',
    device: 'desktop',
    browser: 'firefox',
    country: 'CN',
    referrer: 'example.com',
  },
  {
    os: 'other',
    device: 'other',
    browser: 'unknown',
    country: 'XX',
    referrer: 'unknown',
  },
] as const satisfies readonly Pick<
  ClickSample,
  'os' | 'device' | 'browser' | 'country' | 'referrer'
>[];

function demoSamples(referenceTime: number): ClickSample[] {
  const today = Math.floor(referenceTime / daySeconds);
  return Array.from({ length: 90 }, (_, index) => today - 90 + index).flatMap(
    (utcDay) =>
      profiles.map((profile, index) => {
        const usesRule = profile.os !== 'other' || utcDay % 2 === 0;
        return {
          ...profile,
          timestamp: utcDay * daySeconds + (index + 8) * 3600,
          domainId: usesRule ? 'seed-domain-com' : 'seed-domain-net',
          linkId: usesRule ? 'seed-link-001' : 'seed-link-002',
          ruleId: usesRule ? `seed-rule-${profile.os}` : 'default',
          source: (utcDay + index) % 3 === 0 ? 'qr' : 'link',
          clicks: 1 + (Math.abs(utcDay * (index + 3)) % 29),
        };
      }),
  );
}

export class MockAnalyticsRepository extends InMemoryAnalyticsRepository {
  /** The reference is a Unix timestamp in seconds. */
  constructor(referenceTime = Date.now() / 1000) {
    super(demoSamples(referenceTime), 'mock');
  }
}
