import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { getPlatformProxy, unstable_splitSqlQuery } from 'wrangler';
import {
  loadAnalyticsReport,
  parseAnalyticsQuery,
} from '../../src/lib/server/analytics/report';
import { loadTrafficInsights } from '../../src/lib/server/analytics/insights';

let platform: Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>>;
const now = Date.parse('2026-10-25T12:00:00Z') / 1000;
const demoId = 'demo-sample-link-001';
const options = { development: false };

beforeAll(async () => {
  platform = await getPlatformProxy<{ DB: D1Database }>({
    configPath: 'wrangler.local.jsonc',
    persist: false,
  });
  const migration = await readFile(
    new URL('../../migrations/0001_initial.sql', import.meta.url),
    'utf8',
  );
  const { DB } = platform.env;
  await DB.batch(
    unstable_splitSqlQuery(migration).map((statement) => DB.prepare(statement)),
  );
  await DB.batch([
    DB.prepare(
      "INSERT INTO domains (id, hostname) VALUES ('demo', 'demo.linkrovia.com'), ('other', 'go.example.com')",
    ),
    DB.prepare(
      `INSERT INTO links (id, domain_id, slug, destination_url, created_at)
      VALUES (?, 'demo', 'public-docs', 'https://developers.cloudflare.com/workers/', ?),
             ('visitor-link', 'demo', 'new', 'https://example.com', ?),
             ('demo-sample-link-002', 'other', 'outside', 'https://example.com', ?)`,
    ).bind(demoId, now - 60 * 86_400, now, now - 60 * 86_400),
  ]);
}, 15_000);

afterAll(async () => platform?.dispose());

it('serves labeled sample charts for the demo domain and its sample links', async () => {
  const env = { ...platform.env, LINKROVIA_DEMO_MODE: 'true' };
  const parsed = parseAnalyticsQuery(
    new URLSearchParams('range=30d&dimension=link'),
    'UTC',
    { allowArchived: true, now },
  );
  const report = await loadAnalyticsReport(env, parsed, options);
  expect(report.meta.source).toBe('fixture');
  expect(report.series).toHaveLength(30);
  expect(report.totalClicks).toBeGreaterThan(0);
  expect(report.breakdown).toEqual([
    { key: demoId, clicks: report.totalClicks },
  ]);

  const linkQuery = parseAnalyticsQuery(
    new URLSearchParams('range=7d&dimension=country'),
    'UTC',
    { linkId: demoId, allowArchived: true, now },
  );
  const detail = await loadAnalyticsReport(env, linkQuery, options);
  expect(detail.series).toHaveLength(7);
  expect(detail.breakdown.length).toBeGreaterThan(1);
  const insights = await loadTrafficInsights(env, {
    now: new Date(now * 1000),
  });
  expect(insights.current.daysWithData).toBeGreaterThan(0);
});

it('keeps the live analytics provider for regular deployments and newly created links', async () => {
  const parsed = parseAnalyticsQuery(new URLSearchParams(), 'UTC', { now });
  const env = { ...platform.env, LINKROVIA_DEMO_MODE: 'true' };
  const noProvider = /Analytics SQL binding is unavailable/;
  await expect(
    loadAnalyticsReport(platform.env, parsed, options),
  ).rejects.toThrow(noProvider);
  for (const linkId of ['visitor-link', 'demo-sample-link-002']) {
    await expect(
      loadAnalyticsReport(
        env,
        { ...parsed, query: { ...parsed.query, linkId } },
        options,
      ),
    ).rejects.toThrow(noProvider);
  }
});
