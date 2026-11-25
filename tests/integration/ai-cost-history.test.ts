import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { getPlatformProxy, unstable_splitSqlQuery } from 'wrangler';
import { getAiCostHistory } from '../../src/lib/server/ai/cost-history';

let platform: Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>>;
let db: D1Database;

beforeAll(async () => {
  platform = await getPlatformProxy<{ DB: D1Database }>({
    configPath: 'wrangler.local.jsonc',
    persist: false,
  });
  db = platform.env.DB;
  const migration = new URL('../../migrations/0015_ai.sql', import.meta.url);
  const sql = await readFile(migration, 'utf8');
  await db.batch(
    unstable_splitSqlQuery(sql).map((statement) => db.prepare(statement)),
  );
}, 15_000);

beforeEach(async () => {
  await db.prepare('DELETE FROM ai_usage').run();
});

afterAll(async () => {
  await platform?.dispose();
});

const now = new Date('2026-12-03T08:00:00.000Z');

function usage(
  time: string,
  status: 'succeeded' | 'failed' | 'reserved' | 'unknown_charge',
  cost: number,
) {
  return db
    .prepare(
      `INSERT INTO ai_usage (id, feature, provider, model, started_at, status,
                             input_tokens, output_tokens, neurons, cost_microusd)
       VALUES (?, 'smart-create', 'test', 'test', unixepoch(?), ?, 0, 0, 0, ?)`,
    )
    .bind(time, time, status, cost);
}

it('fills elapsed UTC days and excludes prior-month and future usage', async () => {
  await db.batch([
    usage('2026-11-30T23:59:59Z', 'succeeded', 100),
    usage('2026-12-01T00:00:00Z', 'succeeded', 10),
    usage('2026-12-01T00:00:01Z', 'failed', 20),
    usage('2026-12-03T08:00:00Z', 'unknown_charge', 40),
    usage('2026-12-03T08:00:01Z', 'succeeded', 80),
    usage('2026-12-04T00:00:00Z', 'succeeded', 90),
  ]);

  expect(await getAiCostHistory(db, now)).toEqual({
    days: [
      { date: '2026-12-01', settledMicrousd: 30, pendingMicrousd: 0, calls: 2 },
      { date: '2026-12-02', settledMicrousd: 0, pendingMicrousd: 0, calls: 0 },
      { date: '2026-12-03', settledMicrousd: 0, pendingMicrousd: 40, calls: 1 },
    ],
    settledMicrousd: 30,
    pendingMicrousd: 40,
  });
});

it('reports a reservation as pending', async () => {
  await usage('2026-12-03T07:59:59Z', 'reserved', 15).run();
  expect(await getAiCostHistory(db, now)).toMatchObject({
    settledMicrousd: 0,
    pendingMicrousd: 15,
  });
});

it('reports zero usage on the first day of an empty month', async () => {
  expect(
    await getAiCostHistory(db, new Date('2026-12-01T00:00:00.000Z')),
  ).toEqual({
    days: [
      { date: '2026-12-01', settledMicrousd: 0, pendingMicrousd: 0, calls: 0 },
    ],
    settledMicrousd: 0,
    pendingMicrousd: 0,
  });
});
