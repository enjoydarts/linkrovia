import { MAX_AI_MONTHLY_BUDGET_MICROUSD } from './settings';

const USAGE_RETENTION_SECONDS = 90 * 86_400;
const STALE_RESERVATION_SECONDS = 60;
const MAX_RECLAIM_ROWS = 16;

export type AiFeature = 'smart-create' | 'insights';

export const AI_LIMITS = {
  callsPerDay: 10,
  callsPerMonth: 100,
  inputTokens: 4_096,
  outputTokens: 512,
  tokensPerDay: 25_000,
  tokensPerMonth: 200_000,
  neuronsPerDay: 2_000,
} as const;

type Metering = {
  inputTokens: number;
  outputTokens: number;
  neurons: number;
  costMicrousd: number;
};

type Quote = Metering & {
  id: string;
  feature: AiFeature;
  provider: string;
  model: string;
  settingsRevision: number;
  zeroCostGuaranteed?: boolean;
  cacheKey?: string;
  now?: Date;
};

type Rejection =
  | 'disabled'
  | 'settings_changed'
  | 'duplicate'
  | 'cached'
  | 'busy'
  | 'limit'
  | 'budget';
type Reservation = { ok: true } | { ok: false; reason: Rejection };
type ActiveStatus = 'reserved' | 'unknown_charge';
type Settlement =
  | { status: 'unknown_charge' }
  | (Metering & { status: 'succeeded' | 'failed' });

type UsageTotals = Metering & {
  calls: number;
  reservedCostMicrousd: number;
  usedCostMicrousd: number;
};

function within(value: number, maximum: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= maximum;
}

function validMetering(usage: Metering): boolean {
  return (
    within(usage.inputTokens, AI_LIMITS.inputTokens) &&
    within(usage.outputTokens, AI_LIMITS.outputTokens) &&
    within(usage.neurons, AI_LIMITS.neuronsPerDay) &&
    within(usage.costMicrousd, MAX_AI_MONTHLY_BUDGET_MICROUSD)
  );
}

// D1 serializes the conditional write with settings updates and other requests.
// The active partial unique index also protects against a second active row.
const eligibility = `
  WITH period AS (
    SELECT COALESCE(?1, unixepoch()) AS quoted_at
  ), totals AS (
    SELECT COUNT(*) AS month_calls,
           COALESCE(SUM(input_tokens + output_tokens), 0) AS month_tokens,
           COALESCE(SUM(cost_microusd), 0) AS month_cost,
           COUNT(*) FILTER (WHERE started_at >= unixepoch(period.quoted_at, 'unixepoch', 'start of day'))
             AS day_calls,
           COALESCE(SUM(input_tokens + output_tokens) FILTER (
             WHERE started_at >= unixepoch(period.quoted_at, 'unixepoch', 'start of day')
           ), 0) AS day_tokens,
           COALESCE(SUM(neurons) FILTER (
             WHERE started_at >= unixepoch(period.quoted_at, 'unixepoch', 'start of day')
           ), 0) AS day_neurons
    FROM period CROSS JOIN ai_usage
    WHERE started_at >= unixepoch(period.quoted_at, 'unixepoch', 'start of month')
      AND started_at < unixepoch(period.quoted_at, 'unixepoch', 'start of month', '+1 month')
  ), decision AS (
    SELECT period.quoted_at AS started_at, CASE
      WHEN enabled <> 1 THEN 'disabled'
      WHEN revision <> ?2 THEN 'settings_changed'
      WHEN EXISTS (SELECT 1 FROM ai_usage WHERE id = ?3) THEN 'duplicate'
      WHEN EXISTS (
        SELECT 1 FROM ai_cache WHERE cache_key = ?8 AND expires_at > period.quoted_at * 1000
      ) THEN 'cached'
      WHEN EXISTS (SELECT 1 FROM ai_usage WHERE status IN ('reserved', 'unknown_charge')) THEN 'busy'
      WHEN day_calls >= ${AI_LIMITS.callsPerDay} OR month_calls >= ${AI_LIMITS.callsPerMonth}
        OR day_tokens + ?4 + ?5 > ${AI_LIMITS.tokensPerDay}
        OR month_tokens + ?4 + ?5 > ${AI_LIMITS.tokensPerMonth}
        OR day_neurons + ?6 > ${AI_LIMITS.neuronsPerDay}
        THEN 'limit'
      WHEN month_cost + ?7 > monthly_budget_microusd THEN 'budget'
      ELSE NULL END AS reason
    FROM period CROSS JOIN totals CROSS JOIN ai_settings
    WHERE singleton = 1
  )
`;

export async function reserveAiUsage(
  db: D1Database,
  quote: Quote,
): Promise<Reservation> {
  if (!validMetering(quote)) return { ok: false, reason: 'limit' };
  if (quote.costMicrousd === 0 && quote.zeroCostGuaranteed !== true) {
    return { ok: false, reason: 'budget' };
  }

  const timestamp = quote.now ? Math.floor(quote.now.getTime() / 1000) : null;
  const bindings = [
    timestamp,
    quote.settingsRevision,
    quote.id,
    quote.inputTokens,
    quote.outputTokens,
    quote.neurons,
    quote.costMicrousd,
    quote.cacheKey ?? null,
  ];
  const insert = db
    .prepare(
      `${eligibility}
       INSERT INTO ai_usage (id, feature, provider, model, started_at, status,
                             input_tokens, output_tokens, neurons, cost_microusd)
       SELECT ?3, ?9, ?10, ?11, started_at, 'reserved', ?4, ?5, ?6, ?7
       FROM decision WHERE reason IS NULL RETURNING id`,
    )
    .bind(...bindings, quote.feature, quote.provider, quote.model);

  // Reclaim completed metadata in bounded batches, only after a successful insert.
  // Keep active records indefinitely until the provider outcome can be reconciled.
  const [inserted] = await db.batch<{ id: string }>([
    insert,
    db
      .prepare(
        `DELETE FROM ai_usage WHERE changes() = 1 AND id IN (
           SELECT id FROM ai_usage
           WHERE status IN ('succeeded', 'failed')
             AND started_at < COALESCE(?1, unixepoch()) - ?2
           ORDER BY started_at
           LIMIT ?3
         )`,
      )
      .bind(timestamp, USAGE_RETENTION_SECONDS, MAX_RECLAIM_ROWS),
  ]);
  if (inserted.results.length === 1) return { ok: true };

  // Diagnostics are advisory when another request changes state after the write.
  const reason = await db
    .prepare(`${eligibility} SELECT reason FROM decision`)
    .bind(...bindings)
    .first<Rejection | null>('reason');
  return { ok: false, reason: reason ?? 'settings_changed' };
}

export async function settleAiUsage(
  db: D1Database,
  id: string,
  settlement: Settlement,
): Promise<void> {
  // Unknown charges keep the complete reservation and the global slot.
  // No timeout or period rollover is evidence that a provider request ended.
  if (settlement.status === 'unknown_charge' || !validMetering(settlement)) {
    await db
      .prepare(
        "UPDATE ai_usage SET status = 'unknown_charge' WHERE id = ? AND status = 'reserved'",
      )
      .bind(id)
      .run();
    return;
  }

  const result = await db
    .prepare(
      `WITH actual(status, input, output, neurons, cost) AS (VALUES (?2, ?3, ?4, ?5, ?6))
       UPDATE ai_usage
       SET status = actual.status, input_tokens = actual.input, output_tokens = actual.output,
           neurons = actual.neurons, cost_microusd = actual.cost
       FROM actual
       WHERE id = ?1 AND ai_usage.status = 'reserved'
         AND actual.input <= input_tokens AND actual.output <= output_tokens
         AND actual.neurons <= ai_usage.neurons AND actual.cost <= cost_microusd
       RETURNING id`,
    )
    .bind(
      id,
      settlement.status,
      settlement.inputTokens,
      settlement.outputTokens,
      settlement.neurons,
      settlement.costMicrousd,
    )
    .first<{ id: string }>();
  if (!result) {
    await db
      .prepare(
        "UPDATE ai_usage SET status = 'unknown_charge' WHERE id = ? AND status = 'reserved'",
      )
      .bind(id)
      .run();
  }
}

export async function getAiUsage(
  db: D1Database,
  now = new Date(),
): Promise<{
  day: UsageTotals;
  month: UsageTotals;
  activeStatus: ActiveStatus | null;
}> {
  const timestamp = Math.floor(now.getTime() / 1000);
  const statements = (period: 'day' | 'month') =>
    db
      .prepare(
        `SELECT COUNT(*) AS calls, COALESCE(SUM(input_tokens), 0) AS inputTokens,
                COALESCE(SUM(output_tokens), 0) AS outputTokens, COALESCE(SUM(neurons), 0) AS neurons,
                COALESCE(SUM(cost_microusd), 0) AS costMicrousd,
                COALESCE(SUM(cost_microusd) FILTER (WHERE status = 'reserved'), 0) AS reservedCostMicrousd,
                COALESCE(SUM(cost_microusd) FILTER (WHERE status <> 'reserved'), 0) AS usedCostMicrousd
         FROM ai_usage
         WHERE started_at >= unixepoch(?1, 'unixepoch', 'start of ${period}')
           AND started_at < unixepoch(?1, 'unixepoch', 'start of ${period}', '+1 ${period}')`,
      )
      .bind(timestamp);
  const [day, month, active] = await db.batch<
    UsageTotals | { status: ActiveStatus }
  >([
    statements('day'),
    statements('month'),
    db
      .prepare(
        `SELECT CASE WHEN started_at < ? THEN 'unknown_charge' ELSE status END AS status
         FROM ai_usage WHERE status IN ('reserved', 'unknown_charge')`,
      )
      .bind(timestamp - STALE_RESERVATION_SECONDS),
  ]);
  return {
    day: day.results[0] as UsageTotals,
    month: month.results[0] as UsageTotals,
    activeStatus:
      (active.results[0] as { status: ActiveStatus } | undefined)?.status ??
      null,
  };
}
