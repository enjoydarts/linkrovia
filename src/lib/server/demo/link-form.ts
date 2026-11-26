import { error, type RequestEvent } from '@sveltejs/kit';
import { requireForm } from '$lib/server/links/form';
import { listDomains, type DemoLinkScope } from '$lib/server/links/store';
import { allowAuthAttempt } from '$lib/server/security/rate-limit';
import { readSmallForm, requireSameOrigin } from '$lib/server/security/request';
import { requireDemoView } from './view';

export function demoLinkScope(event: RequestEvent): DemoLinkScope | undefined {
  return event.locals.demoGuest ? { hostname: event.url.hostname } : undefined;
}

export async function linkFormDomains(event: RequestEvent, db: D1Database) {
  const domains = await listDomains(db);
  const scope = demoLinkScope(event);
  return scope
    ? domains.filter(({ hostname }) => hostname === scope.hostname)
    : domains;
}

export async function requireLinkForm(event: RequestEvent, maxBytes?: number) {
  if (!event.locals.demoGuest) {
    const { db, session, form } = await requireForm(event, maxBytes);
    return {
      db,
      form,
      actorId: session.user.id,
      userTimezone: session.user.timezone,
      demo: undefined,
    };
  }
  if (!requireSameOrigin(event.request, event.url)) error(403, 'Forbidden');
  const { db } = requireDemoView(event);
  if (!(await allowAuthAttempt(event, 'demo-link-write')))
    error(429, 'Too many link changes. Try again in a minute.');
  const form = await readSmallForm(event.request, maxBytes);
  if (!form) error(400, 'Invalid form');
  return {
    db,
    form,
    actorId: null,
    userTimezone: null,
    demo: demoLinkScope(event),
  };
}
