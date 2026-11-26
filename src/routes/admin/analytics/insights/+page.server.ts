import { dev } from '$app/env';
import {
  cachedInsights,
  generateInsights,
  getAssistanceStatus,
} from '$lib/server/ai/assistance';
import { loadLatestWeeklyReport } from '$lib/server/ai/weekly';
import { loadTrafficInsights } from '$lib/server/analytics/insights';
import { requireDemoView } from '$lib/server/demo/view';
import { requireForm } from '$lib/server/links/form';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load = (async (event) => {
  const { db } = requireDemoView(event);
  const { demoGuest, env, locale } = event.locals;
  event.setHeaders({ 'cache-control': 'private, no-store' });
  const [insights, assistance, weeklyReport] = await Promise.all([
    loadTrafficInsights(env, { development: dev }),
    demoGuest ? null : getAssistanceStatus(db, env.AI),
    loadLatestWeeklyReport(db).catch(() => null),
  ]);
  const report = await cachedInsights(db, insights, locale).catch(() => null);
  if (!assistance) {
    const demoReport = report
      ? { ...report, ...insights.periods.current, locale }
      : weeklyReport;
    return { insights, demoReport, weeklyReport: null, assistance: null };
  }
  return {
    insights,
    demoReport: null,
    weeklyReport,
    assistance: { ...assistance, report },
  };
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
