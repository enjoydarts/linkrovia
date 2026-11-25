import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { getPlatformProxy, unstable_splitSqlQuery } from 'wrangler';
import { suggestLinkDetails } from '../../src/lib/server/ai/assistance';
import { getAiUsage } from '../../src/lib/server/ai/budget';
import { setAiSettings } from '../../src/lib/server/ai/settings';

vi.mock('../../src/lib/server/ai/provider', async (importOriginal) => {
  const provider =
    await importOriginal<typeof import('../../src/lib/server/ai/provider')>();
  return {
    ...provider,
    validWorkersAiPricing: () =>
      provider.validWorkersAiPricing(new Date('2026-11-25T12:00:00Z')),
  };
});

let platform: Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>>;
let db: D1Database;
const call = vi.fn(async (_model: string, _request: AiTextGenerationInput) => ({
  response:
    '{"title":"Release notes","slug":"release-notes","tags":["release"]}',
  usage: { prompt_tokens: 120, completion_tokens: 20, total_tokens: 140 },
}));
const ai = { run: call } as unknown as Ai;

beforeAll(async () => {
  platform = await getPlatformProxy<{ DB: D1Database }>({
    configPath: 'wrangler.local.jsonc',
    persist: false,
  });
  db = platform.env.DB;
  const sql = await readFile(
    new URL('../../migrations/0015_ai.sql', import.meta.url),
    'utf8',
  );
  await db.batch(
    unstable_splitSqlQuery(sql).map((statement) => db.prepare(statement)),
  );
}, 15_000);

afterAll(async () => platform?.dispose());

it('runs AI only after opt-in and budget approval, redacts input, and reuses cached results', async () => {
  const suggest = () =>
    suggestLinkDetails(
      db,
      ai,
      'owner',
      'en',
      'Release notes',
      'A summary from person@example.com at https://example.com/private?token=secret',
    );
  expect(await suggest()).toEqual({ code: 'disabled' });
  await setAiSettings(db, { enabled: true, monthlyBudgetMicrousd: 0 });
  expect(await suggest()).toEqual({ code: 'budget' });
  expect(call).not.toHaveBeenCalled();
  await setAiSettings(db, { enabled: true, monthlyBudgetMicrousd: 10_000 });
  const generated = await suggest();
  expect(generated).toEqual({
    code: 'generated',
    result: {
      title: 'Release notes',
      slug: 'release-notes',
      tags: ['release'],
    },
  });
  expect(call).toHaveBeenCalledTimes(1);
  const prompt = call.mock.calls[0][1].prompt;
  expect(prompt).toContain('A summary from at');
  expect(prompt).not.toMatch(/example\.com|token=|secret/);
  expect((await getAiUsage(db)).month.calls).toBe(1);
  await setAiSettings(db, { enabled: false, monthlyBudgetMicrousd: 0 });
  expect(await suggest()).toEqual({ code: 'cached', result: generated.result });
  expect(call).toHaveBeenCalledTimes(1);
});

it('keeps the reservation and sends no follow-up after an ambiguous provider error', async () => {
  call.mockClear().mockRejectedValueOnce(new Error('Connection lost'));
  await setAiSettings(db, { enabled: true, monthlyBudgetMicrousd: 10_000 });
  const suggest = () =>
    suggestLinkDetails(db, ai, 'owner', 'en', 'Docs', 'A new document');
  expect(await suggest()).toEqual({ code: 'blocked' });
  expect(await suggest()).toEqual({ code: 'blocked' });
  expect(call).toHaveBeenCalledTimes(1);
  expect((await getAiUsage(db)).activeStatus).toBe('unknown_charge');
});
