import { expect, it } from 'vitest';
import {
  analyticsCsv,
  loadAnalyticsReport,
  parseAnalyticsQuery,
} from '../../src/lib/server/analytics/report';

const now = Date.parse('2026-11-12T12:00:00Z') / 1000;

it('uses the local civil dates and a half-open interval on a 25-hour day', () => {
  const params = new URLSearchParams({
    from: '2026-11-01',
    to: '2026-11-01',
    tz: 'America/New_York',
    dimension: 'source',
    source: 'qr',
  });
  const report = parseAnalyticsQuery(params, 'UTC', { now, linkId: 'fixture' });
  expect(report).toMatchObject({
    from: '2026-11-01',
    to: '2026-11-01',
    dimension: 'source',
    query: {
      from: Date.parse('2026-11-01T04:00:00Z') / 1000,
      to: Date.parse('2026-11-02T05:00:00Z') / 1000,
      linkId: 'fixture',
      source: 'qr',
    },
  });
});

it('bounds retention and rejects invalid dates or filter combinations', () => {
  for (const [query, reason] of [
    ['from=2026-02-30', 'invalid_dates'],
    ['from=2026-01-01', 'out_of_range'],
    ['to=2026-12-01', 'invalid_dates'],
    ['dimension=unknown', 'invalid_filters'],
    ['filter=traffic', 'invalid_filters'],
    ['source=qr&source=link', 'invalid_filters'],
    ['tz=Invalid/Zone', 'invalid_timezone'],
  ]) {
    expect(() =>
      parseAnalyticsQuery(new URLSearchParams(query), 'UTC', { now }),
    ).toThrow(reason);
  }
});

it('uses a local fixture and exposes a production provider failure', async () => {
  let calls = 0;
  const env = {
    ANALYTICS_SQL: {
      query: async () => {
        calls++;
        throw new Error('provider unavailable');
      },
    },
  };
  const query = parseAnalyticsQuery(new URLSearchParams(), 'UTC', {
    linkId: 'missing',
  });
  const stats = await loadAnalyticsReport(env, query, { development: true });
  expect(stats.meta.source).toBe('mock');
  expect(stats.series).toHaveLength(14);
  expect(stats.totalClicks).toBe(0);
  expect(calls).toBe(0);
  await expect(
    loadAnalyticsReport(env, query, { development: false }),
  ).rejects.toThrow('provider unavailable');
  expect(calls).toBe(2);
});

it('escapes spreadsheet values and marks date basis and sampling in CSV', async () => {
  const response = analyticsCsv(
    {
      meta: {
        from: '2026-11-01',
        to: '2026-11-01',
        source: 'analytics-engine',
        dateBasis: 'UTC',
        timezone: 'UTC',
        estimated: true,
        completeThrough: null,
        gaps: [],
      },
      totalClicks: 2,
      series: [{ date: '2026-11-01', clicks: 2 }],
      dimension: 'referrer',
      breakdown: [{ key: '＝SUM(1)', clicks: 2 }],
    },
    true,
  );
  const bytes = new Uint8Array(await response.arrayBuffer());
  expect([...bytes.slice(0, 3)]).toEqual([239, 187, 191]);
  expect(new TextDecoder().decode(bytes)).toContain(
    `"'＝SUM(1)","2","UTC","UTC","true","analytics-engine"`,
  );
  expect(response.headers.get('content-disposition')).toContain('attachment');
});
