import { AnalyticsInputError } from '$lib/server/analytics/report';
import { conversionSummary } from '$lib/server/conversions/events';
import { parseConversionReport } from '$lib/server/conversions/report';
import { getDb } from '$lib/server/db/client';
import { getEffectiveTimeZone } from '$lib/server/db/preferences';
import { payload, problem, withScope } from '../../http';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) =>
  withScope(event, 'analytics:read', async (db) => {
    try {
      const timezone = await getEffectiveTimeZone(getDb(db));
      const period = parseConversionReport(event.url.searchParams, timezone);
      const { from, to, query } = period;
      return payload({
        meta: {
          from,
          to,
          timezone: period.timezone,
          dateBasis: period.timezone === 'UTC' ? 'UTC' : 'local',
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
