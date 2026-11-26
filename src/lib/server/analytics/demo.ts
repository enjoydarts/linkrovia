import type { ClickAnalyticsEnv } from './cloudflare';
import { InMemoryAnalyticsRepository, type ClickSample } from './in-memory';
import type { StatsQuery } from './repository';

const daySeconds = 86_400;
const historyDays = 90;
const sampleId = /^demo-sample-link-[0-9]{3}$/;
const profiles = [
  {
    country: 'US',
    region: 'California',
    device: 'desktop',
    os: 'macos',
    browser: 'chrome',
    referrer: 'example.com',
  },
  {
    country: 'JP',
    region: 'Tokyo',
    device: 'mobile',
    os: 'ios',
    browser: 'safari',
    referrer: 'direct',
  },
  {
    country: 'FR',
    region: 'Île-de-France',
    device: 'mobile',
    os: 'android',
    browser: 'chrome',
    referrer: 'example.org',
  },
  {
    country: 'DE',
    region: 'Berlin',
    device: 'desktop',
    os: 'windows',
    browser: 'firefox',
    referrer: 'example.net',
  },
  {
    country: 'KR',
    region: 'Seoul',
    device: 'tablet',
    os: 'ipados',
    browser: 'safari',
    referrer: 'direct',
  },
  {
    country: 'BR',
    region: 'São Paulo',
    device: 'mobile',
    os: 'android',
    browser: 'chrome',
    referrer: 'example.com',
  },
] as const;

interface SampleLink {
  id: string;
  domain_id: string;
  created_at: number;
  starts_at: number | null;
  expires_at: number | null;
  japanese_rule: string | null;
  mobile_rule: string | null;
}

export async function demoAnalyticsRepository(
  env: ClickAnalyticsEnv,
  query: Pick<StatsQuery, 'linkId' | 'dimension' | 'key' | 'domainId'> = {},
  now = Math.floor(Date.now() / 1000),
) {
  if (env.LINKROVIA_DEMO_MODE !== 'true' || !env.DB) return null;
  const linkId =
    query.linkId ?? (query.dimension === 'link' ? query.key : undefined);
  if (linkId !== undefined && !sampleId.test(linkId)) return null;

  const { results } = await env.DB.prepare(
    `SELECT l.id, l.domain_id, l.created_at, l.starts_at, l.expires_at,
            japan.id AS japanese_rule, mobile.id AS mobile_rule
       FROM links l
       JOIN domains d ON d.id = l.domain_id
       LEFT JOIN redirect_rules japan ON japan.link_id = l.id
         AND japan.id = 'demo-sample-rule-' || substr(l.id, -3) || '-ja' AND japan.is_active = 1
       LEFT JOIN redirect_rules mobile ON mobile.link_id = l.id
         AND mobile.id = 'demo-sample-rule-' || substr(l.id, -3) || '-mobile' AND mobile.is_active = 1
      WHERE d.hostname = 'demo.linkrovia.com'
        AND l.id GLOB 'demo-sample-link-[0-9][0-9][0-9]' AND l.deleted_at IS NULL
        AND (?1 IS NULL OR l.id = ?1) AND (?2 IS NULL OR l.domain_id = ?2)
      ORDER BY l.id LIMIT 180`,
  )
    .bind(linkId ?? null, query.domainId ?? null)
    .all<SampleLink>();
  if (results.length === 0) return null;

  const lastDay = Math.floor(now / daySeconds);
  const firstDay = lastDay - historyDays + 1;
  const samples: ClickSample[] = [];
  for (const link of results) {
    const index = Number(link.id.slice(-3));
    const activeAt = Math.max(link.created_at, link.starts_at ?? 0);
    const earliest = Math.max(firstDay, Math.floor(activeAt / daySeconds));
    for (let day = earliest; day <= lastDay; day++) {
      if ((day + index) % 3 === 0) continue;
      const timestamp = day * daySeconds + ((index + day) % 24) * 3600;
      if (
        timestamp < activeAt ||
        timestamp >= Math.min(link.expires_at ?? now, now)
      )
        continue;
      const profile = profiles[(index + Math.floor(day / 3)) % profiles.length];
      const ruleId =
        (profile.country === 'JP' && link.japanese_rule) ||
        (profile.device === 'mobile' && link.mobile_rule) ||
        'default';
      const weekday = (day + 4) % 7;
      const campaignLift = day % 30 >= 23 ? 9 : 0;
      samples.push({
        ...profile,
        timestamp,
        domainId: link.domain_id,
        linkId: link.id,
        ruleId,
        source: (day + index) % 5 === 0 ? 'qr' : 'link',
        traffic: (day + index) % 19 === 0 ? 'preview' : 'human',
        clicks:
          3 +
          ((index * 31 + day * (5 + (index % 23))) % 70) +
          weekday * 2 +
          campaignLift,
      });
    }
  }
  return {
    repository: new InMemoryAnalyticsRepository(samples, 'fixture'),
    firstDay: new Date(firstDay * daySeconds * 1000).toISOString().slice(0, 10),
  };
}
