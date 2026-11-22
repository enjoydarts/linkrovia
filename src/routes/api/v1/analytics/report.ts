import { dev } from '$app/env';
import { getLink } from '$lib/server/links/store';
import { getDb } from '$lib/server/db/client';
import { getEffectiveTimeZone } from '$lib/server/db/preferences';
import {
  AnalyticsInputError,
  analyticsCsv,
  loadAnalyticsReport,
  parseAnalyticsQuery,
} from '$lib/server/analytics/report';
import type { RequestEvent } from '@sveltejs/kit';
import { missingLink, payload, problem, withScope } from '../http';

export function analyticsResponse(
  event: RequestEvent,
  linkId?: string,
  csv = false,
) {
  return withScope(event, 'analytics:read', async (db) => {
    if (linkId !== undefined && !(await getLink(db, linkId)))
      return missingLink();
    try {
      const timezone = await getEffectiveTimeZone(getDb(db));
      const parsed = parseAnalyticsQuery(event.url.searchParams, timezone, {
        linkId,
        allowArchived: true,
      });
      const report = await loadAnalyticsReport(event.locals.env, parsed, {
        development: dev,
      });
      return csv ? analyticsCsv(report, parsed.bom) : payload(report);
    } catch (cause) {
      if (cause instanceof AnalyticsInputError)
        return problem(
          400,
          cause.code,
          cause.code === 'unsupported_archive_filters'
            ? 'Archived reports support one stored breakdown filter at a time. Change the breakdown or remove the additional filter.'
            : 'Check the report dates, time zone, and filters.',
        );
      return problem(
        503,
        'analytics_unavailable',
        'Click statistics are temporarily unavailable.',
      );
    }
  });
}
