import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { getPlatformProxy, unstable_splitSqlQuery } from 'wrangler';
import { generateInsights } from '../../src/lib/server/ai/assistance';
import { setAiSettings } from '../../src/lib/server/ai/settings';
import { loadLatestWeeklyReport } from '../../src/lib/server/ai/weekly';
import { loadTrafficInsights } from '../../src/lib/server/analytics/insights';
import worker from '../../workers/rollup';

vi.mock('../../src/lib/server/ai/provider', async (importOriginal) => {
  const provider =
    await importOriginal<typeof import('../../src/lib/server/ai/provider')>();
  return {
    ...provider,
    validWorkersAiPricing: () =>
      provider.validWorkersAiPricing(new Date('2026-11-25T12:00:00Z')),
  };
});

vi.mock('../../src/lib/server/ai/budget', async (importOriginal) => {
  const budget =
    await importOriginal<typeof import('../../src/lib/server/ai/budget')>();
  return {
    ...budget,
    reserveAiUsage(
      db: D1Database,
      quote: Parameters<typeof budget.reserveAiUsage>[1],
    ) {
      // Run the real SQL reservation with the fixed clock of the Cron fixture.
      const now = quote.automatic
        ? new Date(`${quote.id.slice('ai-weekly:'.length)}T04:15:00Z`)
        : quote.now;
      return budget.reserveAiUsage(db, { ...quote, now });
    },
  };
});

let platform: Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>>;
let db: D1Database;
const monday = new Date('2026-11-30T04:15:00.000Z');
const lastMonday = new Date('2026-11-23T04:15:00.000Z');
const dayMs = 86_400_000;
const narrative = { headline: 'Traffic increased', summary: 'Review visits.' };
const providerCall = vi.fn(
  async (_model: string, _request: AiTextGenerationInput) => ({
    response: JSON.stringify(narrative),
    usage: { prompt_tokens: 120, completion_tokens: 20, total_tokens: 140 },
  }),
);
const ai = { run: providerCall } as unknown as Ai;
const analyticsQuery = vi.fn(
  async ({ params }: { params: { from: string } }) => ({
    data: Array.from({ length: 14 }, (_, index) => ({
      date: new Date(Date.parse(params.from) + index * dayMs)
        .toISOString()
        .slice(0, 10),
      clicks: index < 7 ? 64 : 96,
    })),
  }),
);
const analytics = { query: analyticsQuery } as unknown as AnalyticsSQLBinding;
const optIn = {
  enabled: true,
  weeklyEnabled: true,
  monthlyBudgetMicrousd: 10_000,
};

function invoke(time = monday) {
  return worker.scheduled(
    { cron: '15,45 * * * *', scheduledTime: time.getTime(), noRetry() {} },
    { DB: db, ANALYTICS_SQL: analytics, AI: ai },
  );
}

beforeAll(async () => {
  platform = await getPlatformProxy<{ DB: D1Database }>({
    configPath: 'wrangler.local.jsonc',
    persist: false,
  });
  db = platform.env.DB;
  for (const name of [
    '0001_initial.sql',
    '0015_ai.sql',
    '0016_ai_weekly.sql',
  ]) {
    const sql = await readFile(
      new URL(`../../migrations/${name}`, import.meta.url),
      'utf8',
    );
    await db.batch(
      unstable_splitSqlQuery(sql).map((statement) => db.prepare(statement)),
    );
  }
  await db
    .prepare(
      "INSERT INTO app_settings (key, json_value) VALUES ('default_locale', ?)",
    )
    .bind(JSON.stringify('ja'))
    .run();
}, 15_000);

beforeEach(async () => {
  providerCall.mockClear();
  analyticsQuery.mockClear();
  await db.batch([
    db.prepare('DELETE FROM ai_usage'),
    db.prepare('DELETE FROM ai_cache'),
    db.prepare('DELETE FROM ai_weekly_report'),
  ]);
  await setAiSettings(db, {
    enabled: false,
    weeklyEnabled: false,
    monthlyBudgetMicrousd: 0,
  });
});

afterAll(async () => platform?.dispose());

it('leaves the provider and analytics untouched outside the weekly slot or before opt-in', async () => {
  await setAiSettings(db, { ...optIn, weeklyEnabled: false });
  await invoke();
  await setAiSettings(db, { ...optIn, monthlyBudgetMicrousd: 0 });
  await invoke();
  await setAiSettings(db, optIn);
  await invoke(new Date(monday.getTime() + dayMs));

  expect(analyticsQuery).not.toHaveBeenCalled();
  expect(providerCall).not.toHaveBeenCalled();
  expect(await loadLatestWeeklyReport(db)).toBeNull();
});

it('skips a weekly report when the aggregate snapshot has no usable data', async () => {
  await setAiSettings(db, optIn);
  analyticsQuery.mockResolvedValueOnce({ data: [] });
  await invoke();
  expect(providerCall).not.toHaveBeenCalled();
  expect(await loadLatestWeeklyReport(db)).toBeNull();
});

it('stores one successful weekly report using the default locale and aggregate UTC snapshot', async () => {
  await setAiSettings(db, optIn);
  await invoke();
  await invoke();
  expect(providerCall).toHaveBeenCalledTimes(1);
  expect(providerCall.mock.calls[0][1].prompt).toContain('in ja.');
  expect(await loadLatestWeeklyReport(db)).toEqual({
    ...narrative,
    createdAt: expect.any(Number),
    startDate: '2026-11-23',
    endDate: '2026-11-29',
    locale: 'ja',
  });
  expect(
    await db
      .prepare('SELECT id, automatic FROM ai_usage')
      .all()
      .then(({ results }) => results),
  ).toEqual([{ id: 'ai-weekly:2026-11-30', automatic: 1 }]);
});

it('publishes a cached report and preserves the newer snapshot during older retries', async () => {
  await setAiSettings(db, optIn);
  const env = { ANALYTICS_SQL: analytics };
  for (const now of [lastMonday, monday]) {
    const insights = await loadTrafficInsights(env, { now });
    expect(await generateInsights(db, ai, insights, 'ja')).toMatchObject({
      code: 'generated',
    });
  }
  await invoke();
  const report = await loadLatestWeeklyReport(db);
  expect(report).toMatchObject({ endDate: '2026-11-29' });
  await invoke(lastMonday);
  expect(await loadLatestWeeklyReport(db)).toEqual(report);
  expect(providerCall).toHaveBeenCalledTimes(2);
});
