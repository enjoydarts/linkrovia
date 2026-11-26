import { dev } from '$app/env';
import { requireDemoView } from '$lib/server/demo/view';
import { getDb } from '$lib/server/db/client';
import { getEffectiveTimeZone } from '$lib/server/db/preferences';
import type { LayoutServerLoad } from './$types';

export const load = (async (event) => {
  const { session, db } = requireDemoView(event);
  const { locals } = event;
  const user = session?.user;
  return {
    locale: locals.locale,
    demoGuest: locals.demoGuest === true,
    user: user
      ? { email: user.email, role: user.role }
      : { email: '', role: 'guest' as const },
    csrfToken: session?.csrfToken ?? '',
    timeZone: await getEffectiveTimeZone(getDb(db), user?.timezone ?? null),
    analyticsDeferred: !dev && !locals.env.CLICKS && !locals.env.ANALYTICS_SQL,
  };
}) satisfies LayoutServerLoad;
