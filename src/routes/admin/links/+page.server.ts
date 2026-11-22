import { listDomains, listLinks } from '$lib/server/links/store';
import { requireSession, shortUrl } from '$lib/server/links/form';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
  const { db } = requireSession(event);
  const filters = Object.fromEntries(
    ['q', 'domain', 'tag', 'status'].map((key) => [
      key,
      (event.url.searchParams.get(key) ?? '').slice(0, 200),
    ]),
  ) as Record<'q' | 'domain' | 'tag' | 'status', string>;
  const [result, domains] = await Promise.all([
    listLinks(db, {
      ...filters,
      cursor: event.url.searchParams.get('cursor') ?? '',
    }),
    listDomains(db),
  ]);
  event.setHeaders({ 'cache-control': 'private, no-store' });
  return {
    locale: event.locals.locale,
    domains,
    filters,
    links: result.links.map((link) => ({
      ...link,
      shortUrl: shortUrl(link, event.url),
    })),
    nextCursor: result.nextCursor,
  };
}) satisfies PageServerLoad;
