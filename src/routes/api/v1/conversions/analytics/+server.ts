import { Temporal } from '@js-temporal/polyfill';
import {
  AnalyticsInputError,
  parseAnalyticsQuery,
} from '$lib/server/analytics/report';
import { conversionSummary } from '$lib/server/conversions/events';
import { getDb } from '$lib/server/db/client';
import { getEffectiveTimeZone } from '$lib/server/db/preferences';
import { payload, problem, withScope } from '../../http';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) =>
  withScope(event, 'analytics:read', async (db) => {
    try {
      const params = event.url.searchParams;
      if ([...params.keys()].some((key) => !['from', 'to', 'tz'].includes(key)))
        throw new AnalyticsInputError('invalid_filters');
      const timezone = await getEffectiveTimeZone(getDb(db));
      const { from, to, query } = parseAnalyticsQuery(params, timezone);
      if (Temporal.PlainDate.from(from).until(to).days >= 30)
        throw new AnalyticsInputError('out_of_range');
      return payload({
        meta: {
          from,
          to,
          timezone: query.timezone,
          rateBasis: 'recorded_click_cohort',
        },
        data: await conversionSummary(db, query.from, query.to),
      });
    } catch (cause) {
      if (cause instanceof AnalyticsInputError)
        return problem(
          400,
          cause.code,
          'Choose a valid date range of up to 30 days and a supported time zone.',
        );
      return problem(
        503,
        'conversions_unavailable',
        'Conversion statistics are temporarily unavailable.',
      );
    }
  });
