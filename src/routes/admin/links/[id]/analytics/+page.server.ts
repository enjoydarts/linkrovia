import { dev } from '$app/env';
import { error } from '@sveltejs/kit';
import { getLink } from '$lib/server/links/store';
import { requireSession, effectiveTimeZone } from '$lib/server/links/form';
import {
  parseAnalyticsQuery,
  loadAnalyticsReport,
} from '$lib/server/analytics/report';
import type { PageServerLoad } from './$types';
export const load = (async (event) => {
  const { db, session } = requireSession(event);
  if (!(await getLink(db, event.params.id))) error(404, 'Not found');
  const timezone = await effectiveTimeZone(db, session.user.timezone);
  event.setHeaders({ 'cache-control': 'private, no-store' });
  try {
    const parsed = parseAnalyticsQuery(event.url.searchParams, timezone, {
      linkId: event.params.id,
    });
    const report = await loadAnalyticsReport(event.locals.env, parsed, {
      development: dev,
    });
    return {
      report,
      failed: false,
      filters: {
        ...Object.fromEntries(event.url.searchParams),
        from: parsed.from,
        to: parsed.to,
        dimension: parsed.dimension,
        tz: parsed.query.timezone,
      },
      linkId: event.params.id,
    };
  } catch {
    return {
      report: null,
      failed: true,
      filters: { ...Object.fromEntries(event.url.searchParams), tz: timezone },
      linkId: event.params.id,
    };
  }
}) satisfies PageServerLoad;
