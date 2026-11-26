import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { getPlatformProxy, unstable_splitSqlQuery } from 'wrangler';
import {
  getAiUsage,
  reserveAiUsage,
  settleAiUsage,
} from '../../src/lib/server/ai/budget';
import {
  getAiCache,
  makeAiCacheKey,
  putAiCache,
} from '../../src/lib/server/ai/cache';
import { getAiSettings, setAiSettings } from '../../src/lib/server/ai/settings';

let platform: Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>>;
let db: D1Database;
const now = new Date('2026-11-30T23:59:59.000Z');
const nextMonth = new Date('2026-12-01T00:00:00.000Z');

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
      "INSERT INTO users (id, email, password_hash, role) VALUES ('admin', 'admin@example.com', 'fixture', 'owner')",
    )
    .run();
}, 15_000);

beforeEach(async () => {
  await db.batch([
    db.prepare('DELETE FROM ai_usage'),
    db.prepare('DELETE FROM ai_cache'),
    db.prepare(
      'UPDATE ai_settings SET enabled = 0, monthly_budget_microusd = 0, weekly_enabled = 0, revision = 0',
    ),
  ]);
});

afterAll(async () => {
  await platform?.dispose();
});

function quote(id: string, settingsRevision: number) {
  return {
    id,
    feature: 'smart-create' as const,
    provider: 'test',
    model: 'test-model',
    inputTokens: 400,
    outputTokens: 100,
    neurons: 0,
    costMicrousd: 60,
    now,
    settingsRevision,
  };
}

it('starts disabled with a zero monthly budget', async () => {
  expect(await getAiSettings(db)).toEqual({
    enabled: false,
    monthlyBudgetMicrousd: 0,
    weeklyEnabled: false,
    revision: 0,
  });
  expect(await reserveAiUsage(db, quote('first', 0))).toEqual({
    ok: false,
    reason: 'disabled',
  });
});

it('does not admit a quote from settings superseded by a budget change', async () => {
  const settings = await setAiSettings(db, {
    enabled: true,
    monthlyBudgetMicrousd: 100,
  });
  const current = await setAiSettings(db, {
    enabled: true,
    monthlyBudgetMicrousd: 0,
  });
  expect(await reserveAiUsage(db, quote('stale', settings.revision))).toEqual({
    ok: false,
    reason: 'settings_changed',
  });
  expect(await reserveAiUsage(db, quote('fresh', current.revision))).toEqual({
    ok: false,
    reason: 'budget',
  });
});

it('admits only one of 100 concurrent requests and rejects duplicate execution after settlement', async () => {
  const settings = await setAiSettings(db, {
    enabled: true,
    monthlyBudgetMicrousd: 10_000,
  });
  const ids = Array.from({ length: 100 }, (_, index) => String(index));
  // Wrangler passes prepared statements to Miniflare by reference. Keep the
  // handles alive until each concurrent batch returns from the test proxy.
  const pendingBatches = new Set<D1PreparedStatement[]>();
  const retainedDb = new Proxy(db, {
    get(target, key) {
      if (key !== 'batch') return Reflect.get(target, key);
      return async <T>(statements: D1PreparedStatement[]) => {
        pendingBatches.add(statements);
        try {
          return await target.batch<T>(statements);
        } finally {
          pendingBatches.delete(statements);
        }
      };
    },
  });
  const results = await Promise.all(
    ids.map((id) => reserveAiUsage(retainedDb, quote(id, settings.revision))),
  );
  expect(results.filter(({ ok }) => ok)).toHaveLength(1);
  expect(
    results.filter((result) => !result.ok && result.reason === 'busy'),
  ).toHaveLength(99);
  const accepted = ids[results.findIndex(({ ok }) => ok)];
  await settleAiUsage(db, accepted, {
    status: 'succeeded',
    inputTokens: 80,
    outputTokens: 20,
    neurons: 0,
    costMicrousd: 10,
  });
  expect(await reserveAiUsage(db, quote(accepted, settings.revision))).toEqual({
    ok: false,
    reason: 'duplicate',
  });
});

it('counts a successful settlement once against the UTC month in which it started', async () => {
  const settings = await setAiSettings(db, {
    enabled: true,
    monthlyBudgetMicrousd: 100,
  });
  expect(await reserveAiUsage(db, quote('one', settings.revision))).toEqual({
    ok: true,
  });
  const actual = {
    status: 'succeeded' as const,
    inputTokens: 100,
    outputTokens: 25,
    neurons: 0,
    costMicrousd: 40,
  };
  await settleAiUsage(db, 'one', actual);
  await settleAiUsage(db, 'one', { ...actual, costMicrousd: 0 });
  expect((await getAiUsage(db, now)).month).toMatchObject({
    calls: 1,
    costMicrousd: 40,
  });
  expect((await getAiUsage(db, nextMonth)).month).toMatchObject({
    calls: 0,
    costMicrousd: 0,
  });
  expect(
    await reserveAiUsage(db, {
      ...quote('two', settings.revision),
      costMicrousd: 61,
    }),
  ).toEqual({
    ok: false,
    reason: 'budget',
  });
});

it('holds the concurrency slot indefinitely and charges the full quote on an ambiguous result', async () => {
  const settings = await setAiSettings(db, {
    enabled: true,
    monthlyBudgetMicrousd: 100,
  });
  await reserveAiUsage(db, quote('one', settings.revision));
  await settleAiUsage(db, 'one', { status: 'unknown_charge' });
  expect(await getAiUsage(db, now)).toMatchObject({
    activeStatus: 'unknown_charge',
    month: { calls: 1, costMicrousd: 60 },
  });
  expect(
    await reserveAiUsage(db, {
      ...quote('two', settings.revision),
      now: nextMonth,
    }),
  ).toEqual({
    ok: false,
    reason: 'busy',
  });
});

it('expires a Smart Create result after 30 days', async () => {
  const key = await makeAiCacheKey({
    feature: 'smart-create',
    inputHash: 'fixture',
    provider: 'test',
    model: 'test-model',
    version: '1',
    locale: 'en',
    scope: 'instance',
  });
  await putAiCache(db, key, 'smart-create', { title: 'A sample' }, now);
  expect(await getAiCache(db, key, now)).toEqual({
    value: { title: 'A sample' },
    createdAt: now.getTime(),
  });
  expect(
    await getAiCache(db, key, new Date(now.getTime() + 30 * 86_400_000)),
  ).toBeNull();
});

it('treats unknown free pricing as a budget rejection', async () => {
  const settings = await setAiSettings(db, {
    enabled: true,
    monthlyBudgetMicrousd: 0,
  });
  const freeQuote = { ...quote('free', settings.revision), costMicrousd: 0 };
  expect(await reserveAiUsage(db, freeQuote)).toEqual({
    ok: false,
    reason: 'budget',
  });
  expect(
    await reserveAiUsage(db, { ...freeQuote, zeroCostGuaranteed: true }),
  ).toEqual({ ok: true });
});

it('charges completed failures against the daily call count', async () => {
  const settings = await setAiSettings(db, {
    enabled: true,
    monthlyBudgetMicrousd: 10_000,
  });
  for (let index = 0; index < 10; index++) {
    const request = quote(String(index), settings.revision);
    expect(await reserveAiUsage(db, request)).toEqual({ ok: true });
    await settleAiUsage(db, request.id, { ...request, status: 'failed' });
  }
  expect(
    await reserveAiUsage(db, quote('daily-cap', settings.revision)),
  ).toEqual({ ok: false, reason: 'limit' });
});

it('stops at the daily token limit before reaching the daily call limit', async () => {
  const settings = await setAiSettings(db, {
    enabled: true,
    monthlyBudgetMicrousd: 10_000,
  });
  for (let index = 0; index < 5; index++) {
    const request = {
      ...quote(String(index), settings.revision),
      inputTokens: 4_096,
      outputTokens: 512,
    };
    expect(await reserveAiUsage(db, request)).toEqual({ ok: true });
    await settleAiUsage(db, request.id, { ...request, status: 'succeeded' });
  }
  expect(
    await reserveAiUsage(db, {
      ...quote('token-cap', settings.revision),
      inputTokens: 2_000,
    }),
  ).toEqual({
    ok: false,
    reason: 'limit',
  });
  expect(
    await reserveAiUsage(db, quote('below-cap', settings.revision)),
  ).toEqual({ ok: true });
});

it('stops at the daily Neurons limit even with a budget and tokens remaining', async () => {
  const settings = await setAiSettings(db, {
    enabled: true,
    monthlyBudgetMicrousd: 10_000,
  });
  const request = { ...quote('first', settings.revision), neurons: 2_000 };
  expect(await reserveAiUsage(db, request)).toEqual({ ok: true });
  await settleAiUsage(db, request.id, { ...request, status: 'succeeded' });
  expect(
    await reserveAiUsage(db, { ...request, id: 'excess', neurons: 1 }),
  ).toEqual({ ok: false, reason: 'limit' });
});

it('keeps the full reservation and active slot if actual usage exceeds the quote', async () => {
  const settings = await setAiSettings(db, {
    enabled: true,
    monthlyBudgetMicrousd: 100,
  });
  const request = quote('over-quote', settings.revision);
  await reserveAiUsage(db, request);
  await settleAiUsage(db, request.id, {
    ...request,
    status: 'succeeded',
    inputTokens: 401,
  });
  expect(await getAiUsage(db, now)).toMatchObject({
    activeStatus: 'unknown_charge',
    month: { calls: 1, reservedCostMicrousd: 0, usedCostMicrousd: 60 },
  });
});

it('bounds the number of cached results and rejects oversized UTF-8 payloads', async () => {
  await expect(
    putAiCache(db, 'too-large', 'insights', 'あ'.repeat(6_000), now),
  ).rejects.toThrow(RangeError);
  await putAiCache(db, 'oldest', 'insights', { index: -1 }, now);
  const later = new Date(now.getTime() + 1);
  await Promise.all(
    Array.from({ length: 128 }, (_, index) =>
      putAiCache(db, String(index), 'insights', { index }, later),
    ),
  );
  expect(await getAiCache(db, 'oldest', later)).toBeNull();
  expect(await getAiCache(db, '0', later)).not.toBeNull();
  expect(
    await getAiCache(db, '0', new Date(later.getTime() + 7 * 86_400_000)),
  ).toBeNull();
});

it('audits a settings change with the authenticated actor and rejects stale settings writes', async () => {
  const initial = await getAiSettings(db);
  const update = { enabled: true, monthlyBudgetMicrousd: 100 };
  await setAiSettings(db, update, 'admin', initial.revision);
  await expect(
    setAiSettings(
      db,
      { enabled: false, monthlyBudgetMicrousd: 0 },
      'admin',
      initial.revision,
    ),
  ).rejects.toThrow('AI settings changed');
  expect(await getAiSettings(db)).toMatchObject(update);
  const audit = await db
    .prepare(
      "SELECT user_id, entity_type, metadata_json FROM audit_events WHERE action = 'ai.settings.updated'",
    )
    .all();
  expect(audit.results).toEqual([
    {
      user_id: 'admin',
      entity_type: 'integration',
      metadata_json: JSON.stringify(update),
    },
  ]);
});

it('rolls back a settings change when its audit event cannot be recorded', async () => {
  await expect(
    setAiSettings(
      db,
      { enabled: true, monthlyBudgetMicrousd: 100 },
      'missing-actor',
    ),
  ).rejects.toThrow();
  expect(await getAiSettings(db)).toEqual({
    enabled: false,
    monthlyBudgetMicrousd: 0,
    weeklyEnabled: false,
    revision: 0,
  });
});

it('rechecks the cache in the reservation after a concurrent request has settled', async () => {
  const settings = await setAiSettings(db, {
    enabled: true,
    monthlyBudgetMicrousd: 100,
  });
  const cacheKey = 'result-from-another-request';
  const request = { ...quote('first', settings.revision), cacheKey };
  const duplicate = { ...request, id: 'second' };
  expect(await getAiCache(db, cacheKey, now)).toBeNull();
  await reserveAiUsage(db, request);
  await putAiCache(db, cacheKey, 'smart-create', { title: 'Cached' }, now);
  await settleAiUsage(db, request.id, {
    ...request,
    status: 'succeeded',
    costMicrousd: 20,
  });
  expect(await reserveAiUsage(db, duplicate)).toEqual({
    ok: false,
    reason: 'cached',
  });
  expect(
    await reserveAiUsage(db, {
      ...duplicate,
      now: new Date(now.getTime() + 30 * 86_400_000),
    }),
  ).toEqual({ ok: true });
});

it('enforces the monthly call limit across different UTC days', async () => {
  const settings = await setAiSettings(db, {
    enabled: true,
    monthlyBudgetMicrousd: 10_000,
  });
  for (let index = 0; index < 100; index++) {
    const request = {
      ...quote(String(index), settings.revision),
      now: new Date(Date.UTC(2026, 10, 1 + Math.floor(index / 10))),
    };
    expect(await reserveAiUsage(db, request)).toEqual({ ok: true });
    await settleAiUsage(db, request.id, { ...request, status: 'succeeded' });
  }
  expect(
    await reserveAiUsage(db, quote('monthly-cap', settings.revision)),
  ).toEqual({ ok: false, reason: 'limit' });
  expect(
    await reserveAiUsage(db, {
      ...quote('next-month', settings.revision),
      now: nextMonth,
    }),
  ).toEqual({ ok: true });
});

it('enforces the monthly token limit across different UTC days', async () => {
  const settings = await setAiSettings(db, {
    enabled: true,
    monthlyBudgetMicrousd: 10_000,
  });
  for (let index = 0; index < 43; index++) {
    const request = {
      ...quote(String(index), settings.revision),
      inputTokens: 4_096,
      outputTokens: 512,
      now: new Date(Date.UTC(2026, 10, 1 + Math.floor(index / 5))),
    };
    expect(await reserveAiUsage(db, request)).toEqual({ ok: true });
    await settleAiUsage(db, request.id, { ...request, status: 'succeeded' });
  }
  expect(
    await reserveAiUsage(db, {
      ...quote('monthly-cap', settings.revision),
      inputTokens: 1_900,
    }),
  ).toEqual({
    ok: false,
    reason: 'limit',
  });
  expect(
    await reserveAiUsage(db, quote('below-cap', settings.revision)),
  ).toEqual({ ok: true });
});

it('purges settled usage older than 90 days on successful reservations', async () => {
  const settings = await setAiSettings(db, {
    enabled: true,
    monthlyBudgetMicrousd: 10_000,
  });
  for (const [id, daysAgo, status] of [
    ['old-succeeded', 91, 'succeeded'],
    ['old-failed', 91, 'failed'],
    ['recent', 89, 'succeeded'],
  ] as const) {
    const request = {
      ...quote(id, settings.revision),
      now: new Date(now.getTime() - daysAgo * 86_400_000),
    };
    await reserveAiUsage(db, request);
    await settleAiUsage(db, id, { ...request, status });
  }
  await reserveAiUsage(db, quote('current', settings.revision));
  const rows = await db
    .prepare('SELECT id FROM ai_usage ORDER BY id')
    .all<{ id: string }>();
  expect(rows.results).toEqual([{ id: 'current' }, { id: 'recent' }]);
});

it('surfaces an abandoned reservation as unknown without releasing its concurrency slot', async () => {
  const settings = await setAiSettings(db, {
    enabled: true,
    monthlyBudgetMicrousd: 10_000,
  });
  await reserveAiUsage(db, quote('abandoned', settings.revision));
  expect((await getAiUsage(db, now)).activeStatus).toBe('reserved');
  const later = new Date(now.getTime() + 91 * 86_400_000);
  expect((await getAiUsage(db, later)).activeStatus).toBe('unknown_charge');
  expect(
    await reserveAiUsage(db, {
      ...quote('replacement', settings.revision),
      now: later,
    }),
  ).toEqual({
    ok: false,
    reason: 'busy',
  });
});

it('preserves weekly consent when a settings update omits it', async () => {
  expect((await getAiSettings(db)).weeklyEnabled).toBe(false);
  const enabled = await setAiSettings(db, {
    enabled: true,
    weeklyEnabled: true,
    monthlyBudgetMicrousd: 100,
  });
  const unchanged = await setAiSettings(db, {
    enabled: true,
    monthlyBudgetMicrousd: 100,
  });
  expect(unchanged).toEqual(enabled);
  const disabled = await setAiSettings(db, {
    enabled: true,
    weeklyEnabled: false,
    monthlyBudgetMicrousd: 100,
  });
  expect(disabled).toMatchObject({
    weeklyEnabled: false,
    revision: enabled.revision + 1,
  });
});

it('admits only opted-in automatic reservations for their scheduled UTC Monday', async () => {
  const monday = new Date('2026-11-30T04:15:00.000Z');
  const automaticQuote = (revision: number) => ({
    ...quote('ai-weekly:2026-11-30', revision),
    feature: 'insights' as const,
    automatic: true,
    now: monday,
  });
  const base = { enabled: true, monthlyBudgetMicrousd: 100 };
  const initial = await setAiSettings(db, base);
  expect(await reserveAiUsage(db, automaticQuote(initial.revision))).toEqual({
    ok: false,
    reason: 'disabled',
  });
  const consent = await setAiSettings(db, { ...base, weeklyEnabled: true });
  expect(
    await reserveAiUsage(db, {
      ...automaticQuote(consent.revision),
      now: nextMonth,
    }),
  ).toEqual({ ok: false, reason: 'limit' });
  const reservation = automaticQuote(consent.revision);
  expect(await reserveAiUsage(db, reservation)).toEqual({ ok: true });
  await settleAiUsage(db, reservation.id, {
    status: 'failed',
    inputTokens: 0,
    outputTokens: 0,
    neurons: 0,
    costMicrousd: 0,
  });
  expect(await reserveAiUsage(db, reservation)).toEqual({
    ok: false,
    reason: 'duplicate',
  });
});
