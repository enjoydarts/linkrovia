import { requireDemoView } from '$lib/server/demo/view';
import {
  listDomains,
  listLinksPage,
  type LinkSort,
} from '$lib/server/links/store';
import { shortUrl } from '$lib/server/links/form';
import { parseDestinationUrl } from '$lib/server/security/url-policy';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
  const { db, unprotectedOnly } = requireDemoView(event);
  const filters = Object.fromEntries(
    ['q', 'domain', 'tag', 'status'].map((key) => [
      key,
      (event.url.searchParams.get(key) ?? '').slice(0, 200),
    ]),
  ) as Record<'q' | 'domain' | 'tag' | 'status', string>;
  const requestedSort = event.url.searchParams.get('sort');
  const sort: LinkSort =
    requestedSort === 'created_asc' || requestedSort === 'updated_desc'
      ? requestedSort
      : 'created_desc';
  const [result, domains] = await Promise.all([
    listLinksPage(db, {
      ...filters,
      unprotectedOnly,
      sort,
      page: event.url.searchParams.get('page'),
    }),
    listDomains(db),
  ]);
  event.setHeaders({ 'cache-control': 'private, no-store' });
  return {
    locale: event.locals.locale,
    domains,
    filters,
    sort,
    links: result.links.map((link) => ({
      ...link,
      shortUrl: shortUrl(link, event.url),
      destinationHref: parseDestinationUrl(link.destinationUrl)?.href ?? null,
    })),
    pagination: result.pagination,
  };
}) satisfies PageServerLoad;
