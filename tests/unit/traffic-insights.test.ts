import { describe, expect, it } from 'vitest';
import { loadTrafficInsights } from '../../src/lib/server/analytics/insights';

const now = new Date('2026-03-02T02:10:00+09:00');
const days = [
  '2026-02-15',
  '2026-02-16',
  '2026-02-17',
  '2026-02-18',
  '2026-02-19',
  '2026-02-20',
  '2026-02-21',
  '2026-02-22',
  '2026-02-23',
  '2026-02-24',
  '2026-02-25',
  '2026-02-26',
  '2026-02-27',
  '2026-02-28',
];

function fixture(previous: number, current: number) {
  return days.map((date, index) => ({
    date,
    clicks: index < 7 ? previous : current,
    destination: 'https://private.example/?token=secret',
    cookie: 'secret',
  }));
}

function insights(rows: ReturnType<typeof fixture>) {
  const queries: AnalyticsSQLQuery[] = [];
  const env = {
    ANALYTICS_SQL: {
      async query(query: AnalyticsSQLQuery) {
        queries.push(query);
        return {
          data: rows,
          rows: rows.length,
          statistics: {
            elapsed_ms: 1,
            rows_read: rows.length,
            bytes_read: 500,
          },
        };
      },
    },
  } as unknown as App.Locals['env'];
  return { result: loadTrafficInsights(env, { now }), queries };
}

describe('traffic insights', () => {
  it('reads a fixed UTC interval once and summarizes severe drops from aggregates', async () => {
    const { result, queries } = insights(fixture(30, 10));
    const summary = await result;
    expect(queries).toHaveLength(1);
    expect(queries[0].params).toMatchObject({
      from: '2026-02-15T00:00:00.000Z',
      to: '2026-03-01T00:00:00.000Z',
      timezone: 'UTC',
    });
    expect(summary).toEqual({
      status: 'ready',
      periods: {
        current: { startDate: '2026-02-22', endDate: '2026-02-28' },
        previous: { startDate: '2026-02-15', endDate: '2026-02-21' },
      },
      current: { visits: 70, daysWithData: 7, estimated: true },
      previous: { visits: 210, daysWithData: 7, estimated: true },
      changePercent: -66.7,
      anomalies: [{ kind: 'traffic_drop', changePercent: -66.7 }],
      warnings: ['estimated'],
    });
  });

  it('keeps incomplete periods out of totals and anomaly detection', async () => {
    const { result } = insights(fixture(30, 10).slice(0, 13));
    expect(await result).toMatchObject({
      status: 'insufficient',
      current: { visits: null, daysWithData: 6 },
      previous: { visits: 210, daysWithData: 7 },
      changePercent: null,
      anomalies: [],
      warnings: ['missing_days', 'estimated'],
    });
  });

  it('suppresses totals below the minimum and compares neither window', async () => {
    const { result } = insights(fixture(30, 2));
    expect(await result).toMatchObject({
      status: 'insufficient',
      current: { visits: null, daysWithData: 7 },
      changePercent: null,
      anomalies: [],
      warnings: ['low_volume', 'estimated'],
    });
  });

  it('requires a large enough difference for a traffic spike', async () => {
    const { result } = insights(fixture(3, 5));
    expect(await result).toMatchObject({
      status: 'ready',
      changePercent: 66.7,
      anomalies: [],
    });
  });

  it('does not leak provider errors when analytics is unavailable', async () => {
    const env = {
      ANALYTICS_SQL: {
        query() {
          throw new Error('private.example or secret-token');
        },
      },
    } as unknown as App.Locals['env'];
    expect(await loadTrafficInsights(env, { now })).toMatchObject({
      status: 'unavailable',
      current: { visits: null, daysWithData: 0, estimated: false },
      previous: { visits: null, daysWithData: 0, estimated: false },
      changePercent: null,
      anomalies: [],
      warnings: ['analytics_unavailable'],
    });
  });
});
