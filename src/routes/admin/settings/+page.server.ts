import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { isLocale } from '$lib/i18n/locale';
import { checkCsrfToken } from '$lib/server/auth/session';
import { readSmallForm, requireSameOrigin } from '$lib/server/security/request';
import { isTimeZone, timeZones } from '$lib/timezone/timezone';
import type { Actions, PageServerLoad } from './$types';

function authorize(event: RequestEvent) {
  if (!event.locals.session) redirect(303, '/login');
  if (!event.locals.env?.DB) error(503, 'Database unavailable');
  return { session: event.locals.session, db: event.locals.env.DB };
}
async function authorizeForm(event: RequestEvent) {
  const auth = authorize(event);
  if (!requireSameOrigin(event.request, event.url)) error(403, 'Forbidden');
  const form = await readSmallForm(event.request);
  if (!form) error(400, 'Invalid form');
  if (!checkCsrfToken(form.get('csrfToken'), auth.session.csrfToken))
    error(403, 'Forbidden');
  return { ...auth, form };
}
export const load = (async (event) => {
  const { db, session } = authorize(event);
  const row = await db
    .prepare(
      "SELECT json_value FROM app_settings WHERE key = 'default_timezone'",
    )
    .first<{ json_value: string }>();
  let defaultZone: unknown;
  try {
    defaultZone = JSON.parse(row?.json_value ?? 'null');
  } catch {
    defaultZone = null;
  }
  event.setHeaders({ 'cache-control': 'private, no-store' });
  return {
    locale: event.locals.locale,
    userZone: session.user.timezone ?? '',
    defaultZone: isTimeZone(defaultZone) ? defaultZone : 'UTC',
    timeZones,
    isOwner: session.user.role === 'owner',
    saved: event.url.searchParams.get('saved'),
  };
}) satisfies PageServerLoad;
export const actions = {
  personal: async (event) => {
    const { session, db, form } = await authorizeForm(event);
    const locale = form.get('locale');
    const timezone = form.get('timezone')?.trim() ?? '';
    if (!isLocale(locale) || (timezone !== '' && !isTimeZone(timezone)))
      return fail(400, { code: 'invalid', section: 'personal' });
    await db
      .prepare(
        'UPDATE users SET locale = ?, timezone = ?, updated_at = unixepoch() WHERE id = ? AND disabled_at IS NULL',
      )
      .bind(locale, timezone || null, session.user.id)
      .run();
    redirect(303, '/admin/settings?saved=personal');
  },
  defaultZone: async (event) => {
    const { session, db, form } = await authorizeForm(event);
    if (session.user.role !== 'owner') error(403, 'Forbidden');
    const timezone = form.get('timezone')?.trim() ?? '';
    if (!isTimeZone(timezone))
      return fail(400, { code: 'invalid', section: 'global' });
    await db
      .prepare(
        "INSERT INTO app_settings (key, json_value) VALUES ('default_timezone', ?) ON CONFLICT(key) DO UPDATE SET json_value = excluded.json_value, updated_at = unixepoch()",
      )
      .bind(JSON.stringify(timezone))
      .run();
    redirect(303, '/admin/settings?saved=global');
  },
} satisfies Actions;
