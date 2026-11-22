import { dev } from '$app/env';
import { requireSession, effectiveTimeZone } from '$lib/server/links/form';
import { listDomains } from '$lib/server/links/store';
import {
  AnalyticsInputError,
  parseAnalyticsQuery,
  loadAnalyticsReport,
} from '$lib/server/analytics/report';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
  const { db, session } = requireSession(event);
  const [timezone, domains] = await Promise.all([
    effectiveTimeZone(db, session.user.timezone),
    listDomains(db),
  ]);
  event.setHeaders({ 'cache-control': 'private, no-store' });
  const requestedFilters = Object.fromEntries(event.url.searchParams);
  let filters: Record<string, string> = { ...requestedFilters, tz: timezone };
  try {
    const parsed = parseAnalyticsQuery(event.url.searchParams, timezone, {
      allowArchived: true,
    });
    filters = {
      ...requestedFilters,
      from: parsed.from,
      to: parsed.to,
      dimension: parsed.dimension,
      granularity: parsed.granularity,
      tz: parsed.query.timezone,
    };
    const report = await loadAnalyticsReport(event.locals.env, parsed, {
      development: dev,
    });
    return {
      domains,
      report,
      failed: false,
      filters,
    };
  } catch (cause) {
    return {
      domains,
      report: null,
      failed:
        cause instanceof AnalyticsInputError &&
        cause.code === 'unsupported_archive_filters'
          ? ('unsupported_archive_filters' as const)
          : true,
      filters,
    };
  }
}) satisfies PageServerLoad;
