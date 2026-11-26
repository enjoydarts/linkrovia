import { fail, redirect } from '@sveltejs/kit';
import {
  getAssistanceStatus,
  readLinkSuggestions,
  suggestLinkDetails,
} from '$lib/server/ai/assistance';
import { createLink, listDomains } from '$lib/server/links/store';
import {
  effectiveTimeZone,
  formValues,
  parseLinkForm,
  requireForm,
  requireSession,
} from '$lib/server/links/form';
import { parseDestinationUrl } from '$lib/server/security/url-policy';
import { allowAuthAttempt } from '$lib/server/security/rate-limit';
import type { Actions, PageServerLoad } from './$types';

export const load = (async (event) => {
  const { db, session } = requireSession(event);
  event.setHeaders({ 'cache-control': 'private, no-store' });
  return {
    metadataAvailable: Boolean(event.locals.env.PAGE_METADATA),
    locale: event.locals.locale,
    domains: await listDomains(db),
    link: null,
    timeZone: await effectiveTimeZone(db, session.user.timezone),
    assistance: await getAssistanceStatus(db, event.locals.env.AI),
  };
}) satisfies PageServerLoad;
export const actions = {
  create: async (event) => {
    const { db, session, form } = await requireForm(event);
    const parsed = await parseLinkForm(
      form,
      db,
      await effectiveTimeZone(db, session.user.timezone),
      false,
    );
    if ('code' in parsed) return fail(400, parsed);
    const result = await createLink(db, session.user.id, parsed.input);
    if (!result.ok)
      return fail(400, { code: result.code, values: parsed.values });
    redirect(303, `/admin/links/${result.id}`);
  },
  suggest: async (event) => {
    const { db, session, form } = await requireForm(event);
    const { env, locale } = event.locals;
    const values = formValues(form);
    const description = form.get('aiDescription') ?? '';
    const destination = values.destinationUrl.trim();
    if (!parseDestinationUrl(destination))
      return fail(400, {
        values,
        suggestion: {
          code: 'missing_destination' as const,
          description: description.slice(0, 700),
        },
      });
    try {
      const metadata =
        env.PAGE_METADATA &&
        (await allowAuthAttempt(event, `page-metadata:${session.user.id}`, {
          byAddress: false,
        }))
          ? env.PAGE_METADATA
          : undefined;
      const { code, result } = await suggestLinkDetails(
        db,
        env.AI,
        session.user.id,
        locale,
        form.get('title') ?? '',
        description,
        destination,
        metadata,
      );
      const suggestion = {
        code,
        result,
        description: description.slice(0, 700),
      };
      if (result) return { values, suggestion };
      return fail(409, { values, suggestion });
    } catch {
      return fail(503, {
        values,
        suggestion: {
          code: 'failed' as const,
          description: description.slice(0, 700),
        },
      });
    }
  },
  applySuggestions: async (event) => {
    const { form } = await requireForm(event);
    const values = formValues(form);
    const result = readLinkSuggestions(form.get('aiSuggestions'));
    if (!result)
      return fail(400, {
        values,
        suggestion: { code: 'failed' as const, description: '' },
      });
    const { title, slug, tags } = result;
    return {
      values: { ...values, title, slug, tags: tags.join(', ') },
      applied: true,
    };
  },
} satisfies Actions;
