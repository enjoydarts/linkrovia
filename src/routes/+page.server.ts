import { fail, redirect } from '@sveltejs/kit';
import { localeCookie } from '$lib/i18n/cookie';
import { isLocale } from '$lib/i18n/locale';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, setHeaders }) => {
  setHeaders({
    'cache-control': 'private, no-store',
    vary: 'Cookie, Accept-Language',
  });
  return { locale: locals.locale };
};

export const actions: Actions = {
  default: async ({ request, cookies, url }) => {
    const locale = (await request.formData()).get('locale');
    if (!isLocale(locale)) return fail(400, { invalidLocale: true });

    cookies.set(localeCookie, locale, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: url.protocol === 'https:',
      maxAge: 60 * 60 * 24 * 365,
    });

    redirect(303, '/');
  },
};
