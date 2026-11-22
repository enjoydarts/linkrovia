import { dayBuckets } from './date-buckets';
import {
  breakdownLimit,
  compareKeys,
  type AnalyticsDimension,
  type AnalyticsRepository,
  type BreakdownResult,
  type Device,
  type StatsQuery,
  type TrendQuery,
  type TrendResult,
} from './repository';

const dataset = 'events.analyticsEngine.linkrovia_clicks';
const columns = {
  country: 'blob2',
  region: 'blob3',
  referrer: 'blob4',
  device: 'blob5',
  os: 'blob6',
  browser: 'blob7',
  rule: 'blob8',
  source: 'blob9',
  traffic: 'blob10',
  link: 'index1',
} as const satisfies Record<AnalyticsDimension, string>;

function dimensionColumn(dimension: AnalyticsDimension) {
  if (!Object.hasOwn(columns, dimension)) {
    throw new Error('Invalid analytics SQL dimension');
  }
  return columns[dimension];
}

function whereClause(query: StatsQuery): {
  where: string;
  params: Record<string, AnalyticsSQLParameter>;
} {
  const params: Record<string, AnalyticsSQLParameter> = {
    from: new Date(query.from * 1000).toISOString(),
    to: new Date(query.to * 1000).toISOString(),
  };
  const predicates = ['timestamp >= $from', 'timestamp < $to'];
  const filters = [
    ['blob1', 'domainId', query.domainId],
    ['index1', 'linkId', query.linkId],
    ['blob8', 'ruleId', query.ruleId],
    ['blob9', 'source', query.source],
  ] as const;
  for (const [column, parameter, value] of filters) {
    if (value === undefined) continue;
    predicates.push(`${column} = $${parameter}`);
    params[parameter] = value;
  }
  if (query.dimension !== 'traffic' || query.key === undefined) {
    predicates.push("blob10 NOT IN ('bot', 'preview')");
  }
  if (query.dimension !== undefined && query.key !== undefined) {
    predicates.push(`${dimensionColumn(query.dimension)} = $key`);
    params.key = query.key;
  }
  return { where: predicates.join(' AND '), params };
}

function clicksFrom(value: unknown): number {
  const clicks =
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (
    typeof clicks !== 'number' ||
    !Number.isSafeInteger(clicks) ||
    clicks < 0
  ) {
    throw new Error('Invalid analytics SQL click count');
  }
  return clicks;
}

function stringFrom(value: unknown): string {
  if (typeof value !== 'string')
    throw new Error('Invalid analytics SQL dimension value');
  return value;
}

function deviceFrom(value: unknown): Device {
  switch (value) {
    case 'mobile':
    case 'tablet':
    case 'desktop':
    case 'other':
      return value;
    default:
      throw new Error('Invalid analytics SQL device');
  }
}

// Analytics SQL weights COUNT(*) automatically, including Workers Analytics Engine datasets.
// https://developers.cloudflare.com/analytics/sql-api/datasets/#workers-analytics-engine-datasets
export class CloudflareAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly binding: AnalyticsSQLBinding) {}

  async getClickTrend(query: TrendQuery): Promise<TrendResult> {
    const { where, params } = whereClause(query);
    const { timezone, dateBasis } = dayBuckets(query.timezone);
    const { data } = await this.binding.query({
      query: `SELECT formatDateTime(timestamp, '%Y-%m-%d', $timezone) AS date, COUNT(*) AS clicks
FROM ${dataset} WHERE ${where}
GROUP BY date ORDER BY date ASC`,
      params: { ...params, timezone },
    });
    const series = data.map(({ date, clicks }) => {
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error('Invalid analytics SQL date');
      }
      return { date, clicks: clicksFrom(clicks) };
    });
    return {
      meta: {
        from: query.from,
        to: query.to,
        timezone: query.timezone,
        granularity: 'day',
        dateBasis,
        source: 'analytics-engine',
        // The binding result does not identify whether represented events were sampled.
        estimated: series.length > 0,
      },
      series,
    };
  }

  async getBreakdown(
    query: StatsQuery,
    dimension: AnalyticsDimension,
  ): Promise<BreakdownResult> {
    const column = dimensionColumn(dimension);
    const { where, params } = whereClause(query);
    const { data } = await this.binding.query({
      query: `SELECT ${column} AS dimension_key, COUNT(*) AS clicks
FROM ${dataset} WHERE ${where}
GROUP BY ${column} ORDER BY clicks DESC, dimension_key ASC LIMIT ${breakdownLimit}`,
      params,
    });
    const breakdown = data
      .map(({ dimension_key, clicks }) => ({
        key: stringFrom(dimension_key),
        clicks: clicksFrom(clicks),
      }))
      .sort((a, b) => b.clicks - a.clicks || compareKeys(a.key, b.key))
      .slice(0, breakdownLimit);
    return { breakdown, estimated: breakdown.length > 0 };
  }

  async getCountries(query: StatsQuery) {
    const { breakdown } = await this.getBreakdown(query, 'country');
    return breakdown.map(({ key, clicks }) => ({ country: key, clicks }));
  }

  async getReferrers(query: StatsQuery) {
    const { breakdown } = await this.getBreakdown(query, 'referrer');
    return breakdown.map(({ key, clicks }) => ({ host: key, clicks }));
  }

  async getDevices(query: StatsQuery) {
    const { where, params } = whereClause(query);
    const { data } = await this.binding.query({
      query: `SELECT blob5 AS device, blob6 AS os, blob7 AS browser, COUNT(*) AS clicks
FROM ${dataset} WHERE ${where}
GROUP BY blob5, blob6, blob7 ORDER BY clicks DESC, device ASC, os ASC, browser ASC LIMIT ${breakdownLimit}`,
      params,
    });
    return data
      .slice(0, breakdownLimit)
      .map(({ device, os, browser, clicks }) => ({
        device: deviceFrom(device),
        os: stringFrom(os),
        browser: stringFrom(browser),
        clicks: clicksFrom(clicks),
      }));
  }
}
