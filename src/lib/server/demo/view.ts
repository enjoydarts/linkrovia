import { messagesFor } from '$lib/i18n/locale';
import { error, redirect, type RequestEvent } from '@sveltejs/kit';

export function requireDemoView(event: RequestEvent) {
  const { session, demoGuest, env } = event.locals;
  if (!session && !demoGuest) redirect(303, '/login');
  if (!env.DB)
    error(503, messagesFor(event.locals.locale)['error.unavailable']);
  return { session, db: env.DB, unprotectedOnly: demoGuest };
}
