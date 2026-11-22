import { fail, redirect } from '@sveltejs/kit';
import { listDomains, addDraftDomain } from '$lib/server/links/store';
import { requireForm, requireSession } from '$lib/server/links/form';
import { normalizeHostname } from '$lib/server/security/url-policy';
import type { Actions, PageServerLoad } from './$types';

export const load = (async (event) => {
  const { db } = requireSession(event);
  event.setHeaders({ 'cache-control': 'private, no-store' });
  return { locale: event.locals.locale, domains: await listDomains(db) };
}) satisfies PageServerLoad;
export const actions = {
  default: async (event) => {
    const { db, form } = await requireForm(event);
    const raw = (form.get('hostname') ?? '').trim().slice(0, 1024);
    const hostname = normalizeHostname(raw);
    if (!hostname || raw.includes(':'))
      return fail(400, { code: 'invalid_input', hostname: raw });
    if (!(await addDraftDomain(db, hostname)))
      return fail(400, { code: 'duplicate', hostname: raw });
    redirect(303, '/admin/domains');
  },
} satisfies Actions;
