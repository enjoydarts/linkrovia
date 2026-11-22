import type {
  AnalyticsRepository,
  ClickSource,
  Device,
  StatsQuery,
  TrendQuery,
  TrendResult,
} from './repository';

export interface ClickSample {
  timestamp: number;
  domainId: string;
  linkId: string;
  country: string;
  referrer: string;
  device: Device;
  os: string;
  browser: string;
  ruleId: string;
  source: ClickSource;
  clicks: number;
}

/** Shared by the local demo and the test fixture. */
export class InMemoryAnalyticsRepository implements AnalyticsRepository {
  constructor(
    private readonly samples: readonly ClickSample[],
    private readonly source: 'mock' | 'fixture',
  ) {}

  private groupBy<T extends Record<string, string>>(
    query: StatsQuery,
    dimensions: (sample: ClickSample) => T,
  ) {
    const groups = new Map<string, T & { clicks: number }>();
    for (const sample of this.samples) {
      if (
        sample.timestamp < query.from ||
        sample.timestamp >= query.to ||
        (query.linkId !== undefined && sample.linkId !== query.linkId) ||
        (query.domainId !== undefined && sample.domainId !== query.domainId) ||
        (query.ruleId !== undefined && sample.ruleId !== query.ruleId) ||
        (query.source !== undefined && sample.source !== query.source)
      ) {
        continue;
      }

      const group = dimensions(sample);
      const key = JSON.stringify(group);
      groups.set(key, {
        ...group,
        clicks: (groups.get(key)?.clicks ?? 0) + sample.clicks,
      });
    }
    return [...groups.values()];
  }

  async getClickTrend(query: TrendQuery): Promise<TrendResult> {
    const { from, to, timezone, granularity = 'day' } = query;
    const series = this.groupBy(query, (sample) => ({
      date: new Date(sample.timestamp * 1000).toISOString().slice(0, 10),
    }));
    series.sort((a, b) => a.date.localeCompare(b.date));
    return {
      meta: {
        from,
        to,
        timezone,
        granularity,
        dateBasis: 'UTC',
        source: this.source,
        estimated: false,
      },
      series,
    };
  }

  async getCountries(query: StatsQuery) {
    return this.groupBy(query, ({ country }) => ({ country }));
  }

  async getReferrers(query: StatsQuery) {
    return this.groupBy(query, ({ referrer }) => ({ host: referrer }));
  }

  async getDevices(query: StatsQuery) {
    return this.groupBy(query, ({ device, os, browser }) => ({
      device,
      os,
      browser,
    }));
  }
}
