import { requireSession, shortUrl } from '$lib/server/links/form';
import { listLinks } from '$lib/server/links/store';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
  const { db } = requireSession(event);
  const { links } = await listLinks(db, { limit: 5 });
  return {
    recentLinks: links.map((link) => ({
      id: link.id,
      title: link.title,
      shortUrl: shortUrl(link, event.url),
      isActive: link.isActive,
    })),
  };
}) satisfies PageServerLoad;
