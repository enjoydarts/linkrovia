import { readdir, readFile } from 'node:fs/promises';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { getPlatformProxy, unstable_splitSqlQuery } from 'wrangler';
import worker from '../../workers/rollup';

let platform: Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>>;

beforeAll(async () => {
  platform = await getPlatformProxy<{ DB: D1Database }>({
    configPath: 'wrangler.local.jsonc',
    persist: false,
  });
  const directory = new URL('../../migrations/', import.meta.url);
  for (const file of (await readdir(directory)).sort()) {
    const sql = await readFile(new URL(file, directory), 'utf8');
    await platform.env.DB.batch(
      unstable_splitSqlQuery(sql).map((statement) =>
        platform.env.DB.prepare(statement),
      ),
    );
  }
}, 15_000);

afterAll(async () => {
  await platform?.dispose();
});

it('rolls up yesterday and reconciles a previously uncovered day on the hourly schedule', async () => {
  const { DB } = platform.env;
  const query = vi.fn(async () => ({
    rows: 0,
    statistics: { elapsed_ms: 0, rows_read: 0, bytes_read: 0 },
    data: [],
  }));
  const env = { DB, ANALYTICS_SQL: { query } as AnalyticsSQLBinding };
  const scheduledTime = Date.now();
  const controller = { scheduledTime, noRetry() {} };
  const yesterday = new Date(scheduledTime - 86_400_000)
    .toISOString()
    .slice(0, 10);
  const previous = new Date(scheduledTime - 2 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  await worker.scheduled({ ...controller, cron: '15 3 * * *' }, env);
  await worker.scheduled({ ...controller, cron: '45 * * * *' }, env);
  await worker.scheduled({ ...controller, cron: '45 * * * *' }, env);

  const { results } = await DB.prepare(
    'SELECT day_utc, status, attempt_count FROM rollup_jobs ORDER BY day_utc DESC',
  ).all();
  expect(results).toHaveLength(3);
  expect(results.slice(0, 2)).toEqual([
    { day_utc: yesterday, status: 'completed', attempt_count: 1 },
    { day_utc: previous, status: 'completed', attempt_count: 1 },
  ]);
});
