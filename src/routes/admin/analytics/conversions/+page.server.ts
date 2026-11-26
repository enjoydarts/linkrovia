import { redirect } from '@sveltejs/kit';
import { requireDemoView } from '$lib/server/demo/view';
import {
  conversionActions,
  loadConversions,
  requestedLinkConversions,
} from '$lib/server/conversions/admin';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  if (event.url.searchParams.has('linkId')) {
    const { db } = requireDemoView(event);
    redirect(303, await requestedLinkConversions(db, event.url.searchParams));
  }
  return loadConversions(event);
};

export const actions: Actions = conversionActions;
