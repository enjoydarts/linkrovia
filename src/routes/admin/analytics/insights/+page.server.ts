import { dev } from '$app/env';
import {
  cachedInsights,
  generateInsights,
  getAssistanceStatus,
} from '$lib/server/ai/assistance';
import {
  AiSettingsConflictError,
  MAX_AI_MONTHLY_BUDGET_MICROUSD,
  setAiSettings,
} from '$lib/server/ai/settings';
import { loadTrafficInsights } from '$lib/server/analytics/insights';
import { requireForm, requireSession } from '$lib/server/links/form';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load = (async (event) => {
  const { db } = requireSession(event);
  const { env, locale } = event.locals;
  event.setHeaders({ 'cache-control': 'private, no-store' });
  const [insights, assistance] = await Promise.all([
    loadTrafficInsights(env, { development: dev }),
    getAssistanceStatus(db, env.AI),
  ]);
  const report = await cachedInsights(db, insights, locale).catch(() => null);
  return { insights, assistance: { ...assistance, report } };
}) satisfies PageServerLoad;

function budgetMicrousd(value: string | null) {
  if (!value || !/^\d{1,4}(?:\.\d{1,2})?$/.test(value)) return null;
  const [dollars, cents = ''] = value.split('.');
  const micros =
    Number(dollars) * 1_000_000 + Number(cents.padEnd(2, '0')) * 10_000;
  return micros <= MAX_AI_MONTHLY_BUDGET_MICROUSD ? micros : null;
}

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
  updateSettings: async (event) => {
    const { db, form, session } = await requireForm(event);
    if (session.user.role !== 'owner') error(403, 'Forbidden');
    const operation = 'settings' as const;
    const monthlyBudgetMicrousd = budgetMicrousd(form.get('monthlyBudget'));
    const revisionText = form.get('revision') ?? '';
    const revision = Number(revisionText);
    if (
      monthlyBudgetMicrousd === null ||
      !/^\d+$/.test(revisionText) ||
      !Number.isSafeInteger(revision)
    )
      return fail(400, { operation, code: 'invalid' as const });
    try {
      await setAiSettings(
        db,
        {
          enabled: form.get('enabled') === 'yes',
          monthlyBudgetMicrousd,
        },
        session.user.id,
        revision,
      );
      return { operation, code: 'saved' as const };
    } catch (cause) {
      if (cause instanceof AiSettingsConflictError)
        return fail(409, { operation, code: 'settings_changed' as const });
      return fail(503, { operation, code: 'failed' as const });
    }
  },
} satisfies Actions;
