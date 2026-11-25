import { isLocale, type Locale } from '../../i18n/locale';
import type { ClickAnalyticsEnv } from '../analytics/cloudflare';
import { loadTrafficInsights } from '../analytics/insights';
import { getDefaultLocale } from '../db/preferences';
import { generateInsights } from './assistance';
import { validWorkersAiPricing } from './provider';
import { getAiSettings } from './settings';

type WeeklyReportEnv = ClickAnalyticsEnv & { DB: D1Database; AI?: Ai };

type WeeklyReport = {
  headline: string;
  summary: string;
  createdAt: number;
  startDate: string;
  endDate: string;
  locale: Locale;
};

export async function loadLatestWeeklyReport(
  db: D1Database,
): Promise<WeeklyReport | null> {
  const row = await db
    .prepare(
      `SELECT headline, summary, created_at AS createdAt,
              start_date AS startDate, end_date AS endDate, locale
       FROM ai_weekly_report WHERE singleton = 1`,
    )
    .first<WeeklyReport>();
  return row && isLocale(row.locale) ? row : null;
}

export async function runWeeklyAiReport(
  env: WeeklyReportEnv,
  scheduledAt: Date,
): Promise<void> {
  if (!env.AI || !env.ANALYTICS_SQL || !validWorkersAiPricing(new Date()))
    return;

  const settings = await getAiSettings(env.DB);
  if (
    !settings.enabled ||
    !settings.weeklyEnabled ||
    settings.monthlyBudgetMicrousd <= 0
  )
    return;

  const insights = await loadTrafficInsights(env, { now: scheduledAt });
  if (insights.status !== 'ready') return;
  const { startDate, endDate } = insights.periods.current;
  const locale = await getDefaultLocale(env.DB);
  const id = `ai-weekly:${scheduledAt.toISOString().slice(0, 10)}`;
  const outcome = await generateInsights(env.DB, env.AI, insights, locale, {
    id,
    automatic: true,
  });
  if (!outcome.result) return;
  const { headline, summary } = outcome.result;

  await env.DB.prepare(
    `INSERT INTO ai_weekly_report
       (singleton, headline, summary, created_at, start_date, end_date, locale)
     SELECT 1, ?1, ?2, ?3, ?4, ?5, ?6 FROM ai_settings
     WHERE singleton = 1 AND enabled = 1 AND weekly_enabled = 1
       AND monthly_budget_microusd > 0
     ON CONFLICT(singleton) DO UPDATE SET
       headline = excluded.headline, summary = excluded.summary,
       created_at = excluded.created_at, start_date = excluded.start_date,
       end_date = excluded.end_date, locale = excluded.locale
     WHERE excluded.end_date > ai_weekly_report.end_date`,
  )
    .bind(headline, summary, Date.now(), startDate, endDate, locale)
    .run();
}
