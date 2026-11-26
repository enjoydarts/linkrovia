import { fail } from '@sveltejs/kit';
import { loadTrafficInsights } from '$lib/server/analytics/insights';
import { requireDemoView } from '$lib/server/demo/view';
import { requireForm } from '$lib/server/links/form';
import { checkGuardianLink } from '$lib/server/links/guardian';
import { getLink, listLinks } from '$lib/server/links/store';
import { allowAuthAttempt } from '$lib/server/security/rate-limit';
import type { Actions, PageServerLoad } from './$types';

export const load = (async (event) => {
  const { db, session, unprotectedOnly } = requireDemoView(event);
  event.setHeaders({ 'cache-control': 'private, no-store' });
  const cursor = event.url.searchParams.get('cursor')?.slice(0, 100);
  const [{ links, nextCursor }, traffic] = await Promise.all([
    listLinks(db, { cursor, unprotectedOnly }),
    loadTrafficInsights(event.locals.env),
  ]);
  return {
    links: links.map(({ id, hostname, slug, title }) => ({
      id,
      hostname,
      slug,
      title,
    })),
    nextCursor,
    traffic,
    csrfToken: session?.csrfToken ?? '',
  };
}) satisfies PageServerLoad;

export const actions = {
  check: async (event) => {
    const { db, session, form } = await requireForm(event, 2048);
    const [linkId, duplicate] = form.getAll('linkId');
    if (
      !linkId ||
      duplicate !== undefined ||
      !/^[a-z0-9_-]{1,100}$/i.test(linkId)
    )
      return fail(400, { code: 'invalid' as const });
    try {
      if (!(await allowAuthAttempt(event, `guardian-check:${session.user.id}`)))
        return fail(429, { code: 'rate_limit' as const });
      const link = await getLink(db, linkId);
      if (!link) return fail(404, { code: 'missing' as const });
      return {
        code: 'checked' as const,
        linkId,
        result: await checkGuardianLink(db, link),
      };
    } catch {
      return fail(503, { code: 'unavailable' as const });
    }
  },
} satisfies Actions;
