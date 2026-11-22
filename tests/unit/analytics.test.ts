import { describe, expect, it } from 'vitest';
import { MockAnalyticsRepository } from '../../src/lib/server/analytics/mock';
import { FixtureAnalyticsRepository } from '../fixtures/analytics';

const today = Date.parse('2026-11-22T00:00:00Z') / 1000;
const day = 86_400;

describe('development analytics', () => {
  it('covers exactly the 90 preceding UTC days with stable demo data', async () => {
    const query = {
      from: today - 91 * day,
      to: today + day,
      timezone: 'Asia/Tokyo',
    };
    const trend = await new MockAnalyticsRepository(today).getClickTrend(query);

    expect(trend.series).toHaveLength(90);
    expect(trend.series.at(0)?.date).toBe('2026-08-24');
    expect(trend.series.at(-1)?.date).toBe('2026-11-21');
    expect(trend.meta).toEqual({
      ...query,
      granularity: 'day',
      dateBasis: 'UTC',
      source: 'mock',
      estimated: false,
    });
    expect(
      await new MockAnalyticsRepository(today + 3600).getClickTrend(query),
    ).toEqual(trend);
  });

  it('uses half-open ranges and filters QR traffic and matched rules', async () => {
    const repository = new FixtureAnalyticsRepository();
    const query = {
      from: today - day,
      to: today,
      timezone: 'UTC',
      source: 'qr' as const,
      ruleId: 'seed-rule-ios',
    };

    expect((await repository.getClickTrend(query)).series).toEqual([
      { date: '2026-11-21', clicks: 3 },
    ]);
    expect(await repository.getCountries(query)).toEqual([
      { country: 'JP', clicks: 3 },
    ]);
    expect(await repository.getReferrers(query)).toEqual([
      { host: 'direct', clicks: 3 },
    ]);
    expect(await repository.getDevices(query)).toEqual([
      { device: 'mobile', os: 'ios', browser: 'safari', clicks: 3 },
    ]);
  });
});
