import type { Handle } from '@sveltejs/kit';
import { localeCookie } from '$lib/i18n/cookie';
import { resolveLocale } from '$lib/i18n/locale';

export const handle: Handle = ({ event, resolve }) => {
  const locale = resolveLocale(
    undefined,
    event.cookies.get(localeCookie),
    event.request.headers.get('accept-language'),
  );
  event.locals.locale = locale;

  return resolve(event, {
    transformPageChunk: ({ html }) =>
      html.replace('%linkrovia.locale%', locale),
  });
};
