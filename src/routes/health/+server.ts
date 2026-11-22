import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db/client';
import { setupState } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
  const headers = { 'cache-control': 'no-store' };
  try {
    if (platform?.env.DB) {
      const db = getDb(platform.env.DB);
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
