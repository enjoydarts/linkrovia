import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db/client';
import { setupState } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  const headers = { 'cache-control': 'no-store' };
  try {
    if (locals.env.DB) {
      const db = getDb(locals.env.DB);
      const row = await db
        .select({ singleton: setupState.singleton })
        .from(setupState)
        .get();
      if (row?.singleton === 1) return json({ status: 'ok' }, { headers });
    }
  } catch {
    console.error('D1 readiness check failed');
  }
  return json({ status: 'unavailable' }, { status: 503, headers });
};
