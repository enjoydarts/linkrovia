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
const call = vi.fn(
  async (
    _model: string,
    _request: AiTextGenerationInput,
  ): Promise<{
    response: string | Record<string, unknown>;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens?: number;
    };
  }> => ({
    response:
      '{"title":"Release notes","slug":"release-notes","tags":["release"]}',
    usage: { prompt_tokens: 120, completion_tokens: 20, total_tokens: 140 },
  }),
);
const ai = { run: call } as unknown as Ai;

beforeAll(async () => {
  platform = await getPlatformProxy<{ DB: D1Database }>({
    configPath: 'wrangler.local.jsonc',
    persist: false,
  });
  db = platform.env.DB;
  for (const name of ['0015_ai.sql', '0016_ai_weekly.sql']) {
    const sql = await readFile(
      new URL(`../../migrations/${name}`, import.meta.url),
      'utf8',
    );
    await db.batch(
      unstable_splitSqlQuery(sql).map((statement) => db.prepare(statement)),
    );
  }
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

it('accepts an object response and derives candidates from a destination without sending its query or fragment', async () => {
  call.mockClear().mockResolvedValueOnce({
    response: { title: '夏祭り', slug: '夏祭り', tags: ['夏'] },
    usage: { prompt_tokens: 120, completion_tokens: 20 },
  });
  await setAiSettings(db, { enabled: true, monthlyBudgetMicrousd: 10_000 });
  expect(
    await suggestLinkDetails(
      db,
      ai,
      'owner',
      'ja',
      '',
      '',
      'https://www.example.com/summer-festival?token=private#fragment',
    ),
  ).toEqual({
    code: 'generated',
    result: { title: '夏祭り', slug: 'summer-festival', tags: ['夏'] },
  });
  const prompt = call.mock.calls[0][1].prompt;
  expect(prompt).toContain('summer festival');
  expect(prompt).not.toMatch(/token|private|fragment/);
});

it('retrieves page metadata on suggestion requests with consent and budget', async () => {
  const fetch = vi.fn(async (_input: string | Request, _init?: RequestInit) =>
    Response.json({
      title: 'Public article title',
      description: 'A useful summary of the source.',
    }),
  );
  const destination = 'https://example.org/article?ref=routing-test#heading';
  const suggest = () =>
    suggestLinkDetails(db, ai, 'owner', 'en', '', '', destination, { fetch });
  await setAiSettings(db, { enabled: true, monthlyBudgetMicrousd: 0 });
  expect(await suggest()).toEqual({ code: 'budget' });
  expect(fetch).not.toHaveBeenCalled();

  await setAiSettings(db, { enabled: true, monthlyBudgetMicrousd: 10_000 });
  call.mockClear();
  expect((await suggest()).code).toBe('generated');
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toBe('https://page-metadata.internal/head');
  expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual({
    url: 'https://example.org/article?ref=routing-test',
  });
  const prompt = call.mock.calls[0][1].prompt;
  expect(prompt).toContain('Public article title');
  expect(prompt).toContain('A useful summary of the source.');
  expect(prompt).not.toMatch(/routing-test|#heading/);

  fetch.mockResolvedValueOnce(new Response(null, { status: 503 }));
  call.mockClear();
  expect((await suggest()).code).toBe('generated');
  expect(call.mock.calls[0][1].prompt).toContain('example.org');
  expect(call.mock.calls[0][1].prompt).not.toContain('Public article title');
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
