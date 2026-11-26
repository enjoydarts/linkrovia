import { error } from '@sveltejs/kit';
import { requireDemoView } from '$lib/server/demo/view';
import { shortUrl } from '$lib/server/links/form';
import { getLink } from '$lib/server/links/store';
import { parseDestinationUrl } from '$lib/server/security/url-policy';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  const { id } = event.params;
  if (typeof id !== 'string') return { linkContext: null };
  const { db, unprotectedOnly } = requireDemoView(event);
  const link = await getLink(db, id, { unprotectedOnly });
  if (unprotectedOnly && !link) error(404, 'Not found');
  return {
    linkContext: link
      ? {
          title: link.title,
          shortUrl: shortUrl(link, event.url),
          destinationHref:
            parseDestinationUrl(link.destinationUrl)?.href ?? null,
        }
      : null,
  };
};
