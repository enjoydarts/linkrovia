import { json } from '@sveltejs/kit';
import { setupOpen } from '$lib/server/auth/setup';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  const headers = { 'cache-control': 'no-store' };
  try {
    if (locals.env.DB) {
      const pending = await locals.env.DB.prepare(
        `SELECT (${setupOpen}) AS pending FROM setup_state WHERE singleton = 1`,
      ).first<number>('pending');
      if (pending !== null) {
        return json(
          { status: 'ok' },
          {
            headers: {
              ...headers,
              'x-linkrovia-setup': pending === 1 ? 'pending' : 'complete',
            },
          },
        );
      }
    }
  } catch {
    console.error('D1 readiness check failed');
  }
  return json({ status: 'unavailable' }, { status: 503, headers });
};
