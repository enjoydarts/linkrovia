export type ClickSource = 'link' | 'qr';
export type Device = 'mobile' | 'tablet' | 'desktop' | 'other';

export interface StatsQuery {
  /** Inclusive Unix timestamp in seconds. */
  from: number;
  /** Exclusive Unix timestamp in seconds. */
  to: number;
  /** IANA time zone for display. */
  timezone: string;
  domainId?: string;
  linkId?: string;
  ruleId?: string;
  source?: ClickSource;
}

export interface TrendQuery extends StatsQuery {
  granularity?: 'day';
}

export interface TrendResult {
  meta: Pick<StatsQuery, 'from' | 'to' | 'timezone'> & {
    granularity: 'day';
    dateBasis: 'UTC' | 'local';
    source: 'analytics-engine' | 'mock' | 'fixture';
    estimated: boolean;
  };
  series: Array<{ date: string; clicks: number }>;
}

export interface CountryStat {
  country: string;
  clicks: number;
}

export interface ReferrerStat {
  host: string;
  clicks: number;
}

export interface DeviceStat {
  device: Device;
  os: string;
  browser: string;
  clicks: number;
}

export interface AnalyticsRepository {
  getClickTrend(query: TrendQuery): Promise<TrendResult>;
  getCountries(query: StatsQuery): Promise<CountryStat[]>;
  getReferrers(query: StatsQuery): Promise<ReferrerStat[]>;
  getDevices(query: StatsQuery): Promise<DeviceStat[]>;
}
