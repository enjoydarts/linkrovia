import { dev } from '$app/env';
import {
  cachedInsights,
  generateInsights,
  getAssistanceStatus,
} from '$lib/server/ai/assistance';
import { loadLatestWeeklyReport } from '$lib/server/ai/weekly';
import { loadTrafficInsights } from '$lib/server/analytics/insights';
import { requireForm, requireSession } from '$lib/server/links/form';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load = (async (event) => {
  const { db } = requireSession(event);
  const { env, locale } = event.locals;
  event.setHeaders({ 'cache-control': 'private, no-store' });
  const [insights, assistance, weeklyReport] = await Promise.all([
    loadTrafficInsights(env, { development: dev }),
    getAssistanceStatus(db, env.AI),
    loadLatestWeeklyReport(db).catch(() => null),
  ]);
  const report = await cachedInsights(db, insights, locale).catch(() => null);
  return { insights, weeklyReport, assistance: { ...assistance, report } };
}) satisfies PageServerLoad;

export const actions = {
  generate: async (event) => {
    const { db } = await requireForm(event);
    const { env, locale } = event.locals;
    const operation = 'generate' as const;
    try {
      const insights = await loadTrafficInsights(env, { development: dev });
      const { code } = await generateInsights(db, env.AI, insights, locale);
      if (code === 'generated' || code === 'cached') return { operation, code };
      return fail(409, { operation, code });
    } catch {
      return fail(503, { operation, code: 'failed' as const });
    }
  },
} satisfies Actions;
