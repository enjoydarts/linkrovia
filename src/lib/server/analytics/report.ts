import { Temporal } from '@js-temporal/polyfill';
import { csvCell } from '../../csv';
import { isTimeZone } from '../../timezone/timezone';
import { CloudflareAnalyticsRepository } from './cloudflare';
import { MockAnalyticsRepository } from './mock';
import type { AnalyticsDimension, StatsQuery, TrendResult } from './repository';

const analyticsDimensions = [
  'country',
  'region',
  'referrer',
  'device',
  'os',
  'browser',
  'rule',
  'source',
  'traffic',
  'link',
] as const satisfies readonly AnalyticsDimension[];
const queryFields = new Set([
  'from',
  'to',
  'tz',
  'granularity',
  'domainId',
  'ruleId',
  'source',
  'dimension',
  'filter',
  'key',
  'bom',
]);

export class AnalyticsInputError extends Error {
  constructor(
    readonly code:
      'invalid_filters' | 'invalid_dates' | 'invalid_timezone' | 'out_of_range',
  ) {
    super(code);
  }
}

function isDimension(value: string): value is AnalyticsDimension {
  return analyticsDimensions.some((dimension) => dimension === value);
}

function civilDay(value: string | undefined, fallback: Temporal.PlainDate) {
  if (!value) return fallback;
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value))
      return Temporal.PlainDate.from(value);
  } catch {
    // An invalid calendar date is not clamped.
  }
  throw new AnalyticsInputError('invalid_dates');
}

export function parseAnalyticsQuery(
  params: URLSearchParams,
  defaultTimezone: string,
  {
    linkId,
    now = Math.floor(Date.now() / 1000),
  }: { linkId?: string; now?: number } = {},
) {
  for (const key of params.keys()) {
    if (!queryFields.has(key) || params.getAll(key).length !== 1)
      throw new AnalyticsInputError('invalid_filters');
  }
  const get = (key: string) => params.get(key) || undefined;
  const timezone = get('tz') ?? defaultTimezone;
  if (!isTimeZone(timezone)) throw new AnalyticsInputError('invalid_timezone');
  const today = Temporal.Instant.fromEpochMilliseconds(now * 1000)
    .toZonedDateTimeISO(timezone)
    .toPlainDate();
  const to = civilDay(get('to'), today);
  const from = civilDay(get('from'), to.subtract({ days: 13 }));
  if (
    Temporal.PlainDate.compare(from, to) > 0 ||
    Temporal.PlainDate.compare(to, today) > 0
  )
    throw new AnalyticsInputError('invalid_dates');
  const retention = today.subtract({ months: 3 }).add({ days: 1 });
  if (
    Temporal.PlainDate.compare(from, retention) < 0 ||
    from.until(to).days >= 90
  )
    throw new AnalyticsInputError('out_of_range');

  const dimension = get('dimension') ?? 'country';
  const filter = get('filter');
  const key = get('key');
  const source = get('source');
  const domainId = get('domainId');
  const ruleId = get('ruleId');
  const bom = get('bom');
  const validId = (value?: string) =>
    value === undefined || /^[a-z0-9][a-z0-9_-]{0,95}$/i.test(value);
  if (
    !isDimension(dimension) ||
    (source !== undefined && source !== 'link' && source !== 'qr') ||
    !validId(domainId) ||
    !validId(ruleId) ||
    (bom !== undefined && bom !== '0' && bom !== '1') ||
    (get('granularity') ?? 'day') !== 'day' ||
    ((key !== undefined || filter !== undefined) &&
      (!filter ||
        !isDimension(filter) ||
        !key ||
        key.length > 255 ||
        !key.isWellFormed() ||
        /\p{Cc}/u.test(key)))
  )
    throw new AnalyticsInputError('invalid_filters');

  const midnight = (date: Temporal.PlainDate) =>
    date.toZonedDateTime(timezone).epochMilliseconds / 1000;
  const query: StatsQuery = {
    from: midnight(from),
    to: midnight(to.add({ days: 1 })),
    timezone,
    domainId,
    linkId,
    ruleId,
    source,
    ...(filter && isDimension(filter) ? { dimension: filter, key } : {}),
  };
  if (query.from >= query.to) throw new AnalyticsInputError('invalid_dates');
  return {
    query,
    dimension,
    bom: bom === '1',
    from: from.toString(),
    to: to.toString(),
  };
}

export type AnalyticsQuery = ReturnType<typeof parseAnalyticsQuery>;

export type AnalyticsReport = {
  meta: Pick<
    TrendResult['meta'],
    'timezone' | 'source' | 'estimated' | 'dateBasis'
  > & {
    from: string;
    to: string;
    completeThrough: string | null;
    gaps: string[];
  };
  totalClicks: number;
  series: TrendResult['series'];
  dimension: AnalyticsDimension;
  breakdown: Array<{ key: string; clicks: number }>;
};

export async function loadAnalyticsReport(
  env: Pick<Cloudflare.Env, 'ANALYTICS_SQL'>,
  { query, dimension, from, to }: AnalyticsQuery,
  { development }: { development: boolean },
): Promise<AnalyticsReport> {
  const repository = development
    ? new MockAnalyticsRepository()
    : new CloudflareAnalyticsRepository(env.ANALYTICS_SQL);
  const [trend, result] = await Promise.all([
    repository.getClickTrend(query),
    repository.getBreakdown(query, dimension),
  ]);
  const { timezone, source, dateBasis } = trend.meta;
  const fromDay =
    dateBasis === 'UTC'
      ? new Date(query.from * 1000).toISOString().slice(0, 10)
      : from;
  const toDay =
    dateBasis === 'UTC'
      ? new Date((query.to - 1) * 1000).toISOString().slice(0, 10)
      : to;
  const series = [];
  const byDay = new Map(trend.series.map(({ date, clicks }) => [date, clicks]));
  for (
    let date = Temporal.PlainDate.from(fromDay);
    Temporal.PlainDate.compare(date, toDay) <= 0;
    date = date.add({ days: 1 })
  ) {
    const key = date.toString();
    series.push({ date: key, clicks: byDay.get(key) ?? 0 });
  }
  return {
    meta: {
      from,
      to,
      timezone,
      source,
      dateBasis,
      estimated: trend.meta.estimated || result.estimated,
      completeThrough: null,
      gaps: [],
    },
    totalClicks: series.reduce((total, row) => total + row.clicks, 0),
    series,
    dimension,
    breakdown: result.breakdown,
  };
}

export function analyticsCsv(report: AnalyticsReport, bom: boolean): Response {
  const { dateBasis, estimated, source, timezone } = report.meta;
  const metadata = [dateBasis, timezone, String(estimated), source];
  const rows = [
    [
      'type',
      'date',
      'dimension',
      'key',
      'clicks',
      'date_basis',
      'timezone',
      'estimated',
      'source',
    ],
    ...report.series.map((row) => [
      'daily',
      row.date,
      '',
      '',
      String(row.clicks),
      ...metadata,
    ]),
    ...report.breakdown.map((row) => [
      'breakdown',
      '',
      report.dimension,
      row.key,
      String(row.clicks),
      ...metadata,
    ]),
  ];
  return new Response(
    (bom ? '\ufeff' : '') +
      rows.map((row) => row.map(csvCell).join(',')).join('\r\n') +
      '\r\n',
    {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="linkrovia-analytics.csv"',
        'cache-control': 'private, no-store',
        'x-content-type-options': 'nosniff',
      },
    },
  );
}
