import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { getPlatformProxy, unstable_splitSqlQuery } from 'wrangler';
import {
  isPageMetadataEnabled,
  setPageMetadataEnabled,
} from '../../src/lib/server/db/preferences';

let platform: Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>>;
let db: D1Database;

beforeAll(async () => {
  platform = await getPlatformProxy<{ DB: D1Database }>({
    configPath: 'wrangler.local.jsonc',
    persist: false,
  });
  db = platform.env.DB;
  const migration = await readFile(
    new URL('../../migrations/0001_initial.sql', import.meta.url),
    'utf8',
  );
  await db.batch(
    unstable_splitSqlQuery(migration).map((statement) => db.prepare(statement)),
  );
  await db
    .prepare(
      "INSERT INTO users (id, email, password_hash, role) VALUES ('owner', 'owner@example.com', '', 'owner')",
    )
    .run();
}, 15_000);

afterAll(async () => platform?.dispose());

it('preserves the default and persists each explicit choice with its audit event', async () => {
  expect(await isPageMetadataEnabled(db)).toBe(true);
  await setPageMetadataEnabled(db, 'owner', false);
  expect(await isPageMetadataEnabled(db)).toBe(false);
  await setPageMetadataEnabled(db, 'owner', true);
  expect(await isPageMetadataEnabled(db)).toBe(true);
  const audit = await db
    .prepare('SELECT action, user_id FROM audit_events ORDER BY rowid')
    .all();
  expect(audit.results).toEqual([
    { action: 'page_metadata.disabled', user_id: 'owner' },
    { action: 'page_metadata.enabled', user_id: 'owner' },
  ]);
});
