import { CloudflareAnalyticsRepository } from './cloudflare';
import { MockAnalyticsRepository } from './mock';

const daySeconds = 86_400;
const periodDays = 7;
const minimumVisits = 20;
const minimumRelativeChange = 0.5;
const deviationThreshold = 3;

interface Period {
  /** Inclusive UTC dates. */
  startDate: string;
  endDate: string;
}

interface PeriodTraffic {
  visits: number | null;
  daysWithData: number;
  estimated: boolean;
}

type TrafficWarning =
  'analytics_unavailable' | 'missing_days' | 'low_volume' | 'estimated';

interface TrafficAnomaly {
  kind: 'traffic_drop' | 'traffic_spike';
  changePercent: number;
}

export interface TrafficInsights {
  status: 'ready' | 'insufficient' | 'unavailable';
  periods: { current: Period; previous: Period };
  current: PeriodTraffic;
  previous: PeriodTraffic;
  changePercent: number | null;
  anomalies: TrafficAnomaly[];
  warnings: TrafficWarning[];
}

function dateLabel(seconds: number) {
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

function summarizePeriod(
  from: number,
  counts: ReadonlyMap<string, number>,
  estimated: boolean,
): PeriodTraffic {
  let total = 0;
  let daysWithData = 0;
  for (let offset = 0; offset < periodDays; offset++) {
    const count = counts.get(dateLabel(from + offset * daySeconds));
    if (count === undefined) continue;
    total += count;
    daysWithData++;
  }
  if (!Number.isSafeInteger(total))
    throw new Error('Invalid analytics period total');
  return {
    visits:
      daysWithData === periodDays && total >= minimumVisits ? total : null,
    daysWithData,
    estimated: daysWithData > 0 && estimated,
  };
}

export async function loadTrafficInsights(
  env: Pick<App.Locals['env'], 'ANALYTICS_SQL' | 'LINKROVIA_CLICKS_DATASET'>,
  {
    now = new Date(),
    development = false,
  }: { now?: Date; development?: boolean } = {},
): Promise<TrafficInsights> {
  const end = Math.floor(now.getTime() / 1000 / daySeconds) * daySeconds;
  const duration = periodDays * daySeconds;
  const currentStart = end - duration;
  const previousStart = currentStart - duration;
  const periods = {
    current: {
      startDate: dateLabel(currentStart),
      endDate: dateLabel(end - daySeconds),
    },
    previous: {
      startDate: dateLabel(previousStart),
      endDate: dateLabel(currentStart - daySeconds),
    },
  };
  const empty = { visits: null, daysWithData: 0, estimated: false };
  const unavailable: TrafficInsights = {
    status: 'unavailable',
    periods,
    current: empty,
    previous: empty,
    changePercent: null,
    anomalies: [],
    warnings: ['analytics_unavailable'],
  };

  try {
    const repository = development
      ? new MockAnalyticsRepository(end)
      : env.ANALYTICS_SQL
        ? new CloudflareAnalyticsRepository(
            env.ANALYTICS_SQL,
            env.LINKROVIA_CLICKS_DATASET,
          )
        : null;
    if (!repository) return unavailable;
    const { meta, series } = await repository.getClickTrend({
      from: previousStart,
      to: end,
      timezone: 'UTC',
      granularity: 'day',
    });
    const counts = new Map(series.map(({ date, clicks }) => [date, clicks]));
    if (
      counts.size !== series.length ||
      series.length > periodDays * 2 ||
      series.some(
        ({ date }) =>
          date < periods.previous.startDate || date > periods.current.endDate,
      )
    )
      return unavailable;

    // A missing live bucket can represent zero visits or missing collection.
    const current = summarizePeriod(currentStart, counts, meta.estimated);
    const previous = summarizePeriod(previousStart, counts, meta.estimated);
    const warnings: TrafficWarning[] = [];
    if (
      [current, previous].some(({ daysWithData }) => daysWithData < periodDays)
    )
      warnings.push('missing_days');
    if (
      [current, previous].some(
        ({ daysWithData, visits }) =>
          daysWithData === periodDays && visits === null,
      )
    )
      warnings.push('low_volume');
    if (current.estimated || previous.estimated) warnings.push('estimated');

    const baseline = previous.visits;
    const observed = current.visits;
    const anomalies: TrafficAnomaly[] = [];
    let changePercent = null;
    if (baseline !== null && observed !== null) {
      const difference = observed - baseline;
      const relativeChange = difference / baseline;
      changePercent = Number((relativeChange * 100).toFixed(1));

      // Use a conservative count-noise heuristic with a separate effect-size floor.
      if (
        Math.abs(relativeChange) >= minimumRelativeChange &&
        Math.abs(difference) >=
          deviationThreshold * Math.sqrt(observed + baseline)
      ) {
        anomalies.push({
          kind: difference < 0 ? 'traffic_drop' : 'traffic_spike',
          changePercent,
        });
      }
    }

    return {
      status: changePercent === null ? 'insufficient' : 'ready',
      periods,
      current,
      previous,
      changePercent,
      anomalies,
      warnings,
    };
  } catch {
    return unavailable;
  }
}
