import { error } from '@sveltejs/kit';
import { requireSession } from '$lib/server/links/form';
import {
  managementHostname,
  readDomainConnection,
} from '$lib/server/domains/connection';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
  const { db, session } = requireSession(event);
  event.setHeaders({ 'cache-control': 'private, no-store' });
  const [domain, primary] = await Promise.all([
    readDomainConnection(db, event.params.id),
    managementHostname(db),
  ]);
  if (!domain) error(404, 'Domain not found');
  return {
    locale: event.locals.locale,
    domain,
    managementHostname: primary ?? null,
    isOwner: session.user.role === 'owner',
  };
}) satisfies PageServerLoad;
