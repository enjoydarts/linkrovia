import { error, fail, type RequestEvent } from '@sveltejs/kit';
import { requireDemoView } from '$lib/server/demo/view';
import { readSmallForm, requireSameOrigin } from '$lib/server/security/request';
import { requireForm } from '$lib/server/links/form';
import { simulateLink } from '$lib/server/links/simulation';
import { getLink } from '$lib/server/links/store';
import { parseSimulationForm, simulationFields } from './form';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { linkContext } = await parent();
  if (!linkContext) error(404, 'Not found');
  return { limits: simulationFields };
};

async function requireSimulationForm(event: RequestEvent) {
  const { db } = requireDemoView(event);
  if (!requireSameOrigin(event.request, event.url)) error(403, 'Forbidden');
  const form = await readSmallForm(event.request);
  if (!form) error(400, 'Invalid form');
  return { db, form };
}

export const actions = {
  default: async (event) => {
    const { db, form } = event.locals.demoGuest
      ? await requireSimulationForm(event)
      : await requireForm(event);
    const parsed = parseSimulationForm(form);
    if (!parsed.input) return fail(400, parsed);

    const id = event.params.id;
    const visibility = { unprotectedOnly: event.locals.demoGuest };
    const result = await simulateLink(db, id, parsed.input, visibility);
    if (!result) error(404, 'Not found');
    const link = result.destinationUrl
      ? await getLink(db, id, visibility)
      : null;
    if (result.destinationUrl && !link) error(404, 'Not found');
    return {
      values: parsed.values,
      result,
      redirectStatus: link?.redirectType ?? null,
    };
  },
} satisfies Actions;
