import { dev } from '$app/env';
import {
  requireSession,
  shortUrl,
  effectiveTimeZone,
} from '$lib/server/links/form';
import { getLink, listLinks } from '$lib/server/links/store';
import {
  loadAnalyticsReport,
  parseAnalyticsQuery,
  type AnalyticsReport,
} from '$lib/server/analytics/report';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
  const { db, session } = requireSession(event);
  const [{ links }, timezone] = await Promise.all([
    listLinks(db, { limit: 5 }),
    effectiveTimeZone(db, session.user.timezone),
  ]);
  event.setHeaders({ 'cache-control': 'private, no-store' });
  let report: AnalyticsReport | null = null;
  let popularLinks: Array<{
    key: string;
    clicks: number;
    title: string | null;
    url: string | null;
    id: string | null;
  }> = [];
  try {
    const parsed = parseAnalyticsQuery(
      new URLSearchParams({ dimension: 'link' }),
      timezone,
    );
    report = await loadAnalyticsReport(event.locals.env, parsed, {
      development: dev,
    });
    popularLinks = await Promise.all(
      report.breakdown.slice(0, 5).map(async (row) => {
        // Sample identifiers must never be presented as real links.
        const link =
          report?.meta.source === 'analytics-engine'
            ? await getLink(db, row.key)
            : null;
        return {
          ...row,
          id: link?.id ?? null,
          title: link?.title ?? null,
          url: link ? shortUrl(link, event.url) : null,
        };
      }),
    );
  } catch {
    report = null;
    popularLinks = [];
  }
  return {
    report,
    popularLinks,
    recentLinks: links.map((link) => ({
      id: link.id,
      title: link.title,
      shortUrl: shortUrl(link, event.url),
      isActive: link.isActive,
    })),
  };
}) satisfies PageServerLoad;
