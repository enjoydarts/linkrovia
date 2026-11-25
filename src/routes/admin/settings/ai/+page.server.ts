import { getAssistanceStatus } from '$lib/server/ai/assistance';
import { getAiCostHistory } from '$lib/server/ai/cost-history';
import {
  AiSettingsConflictError,
  MAX_AI_MONTHLY_BUDGET_MICROUSD,
  setAiSettings,
} from '$lib/server/ai/settings';
import { requireForm, requireSession } from '$lib/server/links/form';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load = (async (event) => {
  const { db } = requireSession(event);
  event.setHeaders({ 'cache-control': 'private, no-store' });
  const [assistance, costHistory] = await Promise.all([
    getAssistanceStatus(db, event.locals.env.AI),
    getAiCostHistory(db),
  ]);
  return {
    assistance,
    costHistory,
    weeklyEnabled: assistance.weeklyEnabled,
    maxBudgetUsd: MAX_AI_MONTHLY_BUDGET_MICROUSD / 1_000_000,
  };
}) satisfies PageServerLoad;

function budgetMicrousd(value: string | null) {
  if (!value || !/^\d{1,4}(?:\.\d{1,2})?$/.test(value)) return null;
  const [dollars, cents = ''] = value.split('.');
  const micros =
    Number(dollars) * 1_000_000 + Number(cents.padEnd(2, '0')) * 10_000;
  return micros <= MAX_AI_MONTHLY_BUDGET_MICROUSD ? micros : null;
}

export const actions = {
  default: async (event) => {
    const { db, form, session } = await requireForm(event);
    if (session.user.role !== 'owner') error(403, 'Forbidden');
    const monthlyBudgetMicrousd = budgetMicrousd(form.get('monthlyBudget'));
    const revisionText = form.get('revision') ?? '';
    const revision = Number(revisionText);
    if (
      monthlyBudgetMicrousd === null ||
      !/^\d+$/.test(revisionText) ||
      !Number.isSafeInteger(revision)
    )
      return fail(400, { code: 'invalid' as const });
    try {
      await setAiSettings(
        db,
        {
          enabled: form.get('enabled') === 'yes',
          weeklyEnabled: form.get('weeklyEnabled') === 'yes',
          monthlyBudgetMicrousd,
        },
        session.user.id,
        revision,
      );
      return { code: 'saved' as const };
    } catch (cause) {
      if (cause instanceof AiSettingsConflictError)
        return fail(409, { code: 'settings_changed' as const });
      return fail(503, { code: 'failed' as const });
    }
  },
} satisfies Actions;
