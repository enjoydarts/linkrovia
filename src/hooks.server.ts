import { env } from 'cloudflare:workers';
import { dev } from '$app/env';
import type { Handle } from '@sveltejs/kit/hooks';
import { localeCookie } from '$lib/i18n/cookie';
import { resolveLocale } from '$lib/i18n/locale';
import { getSession, sessionCookie } from '$lib/server/auth/session';
import { normalizeHostname } from '$lib/server/security/url-policy';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.env = env;
  const id = event.route.id;
  const management =
    id === '/setup' ||
    id === '/login' ||
    id === '/logout' ||
    id === '/admin' ||
    id?.startsWith('/admin/');
  if (management && event.locals.env.DB) {
    try {
      const host = await event.locals.env.DB.prepare(
        'SELECT hostname FROM domains WHERE is_primary = 1',
      ).first<string>('hostname');
      if (
        host &&
        host !== normalizeHostname(event.url.hostname, { allowLoopback: dev })
      ) {
        return new Response(null, {
          status: 404,
          headers: { 'cache-control': 'no-store' },
        });
      }
    } catch {
      return new Response(null, {
        status: 503,
        headers: { 'cache-control': 'no-store' },
      });
    }
  }
  const token = management ? event.cookies.get(sessionCookie) : undefined;
  const db = token && event.locals.env.DB;
  event.locals.session = db ? await getSession(db, token) : null;
  const locale = resolveLocale(
    event.locals.session?.user.locale,
    event.cookies.get(localeCookie),
    event.request.headers.get('accept-language'),
  );
  event.locals.locale = locale;
  const response = await resolve(event, {
    transformPageChunk: ({ html }) =>
      html.replace('%linkrovia.locale%', locale),
  });
  if (!management) return response;
  const protectedResponse = new Response(response.body, response);
  protectedResponse.headers.set('cache-control', 'private, no-store');
  protectedResponse.headers.set('x-robots-tag', 'noindex, nofollow');
  protectedResponse.headers.set('referrer-policy', 'same-origin');
  return protectedResponse;
};
