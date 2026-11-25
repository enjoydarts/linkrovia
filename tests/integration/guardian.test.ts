import { readFile, readdir } from 'node:fs/promises';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { getPlatformProxy, unstable_splitSqlQuery } from 'wrangler';
import { checkGuardianLink } from '../../src/lib/server/links/guardian';
import { getLink } from '../../src/lib/server/links/store';

let platform: Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>>;
let db: D1Database;

beforeAll(async () => {
  platform = await getPlatformProxy<{ DB: D1Database }>({
    configPath: 'wrangler.local.jsonc',
    persist: false,
  });
  db = platform.env.DB;
  const migrations = new URL('../../migrations/', import.meta.url);
  for (const name of (await readdir(migrations)).sort()) {
    const migration = await readFile(new URL(name, migrations), 'utf8');
    await db.batch(
      unstable_splitSqlQuery(migration).map((sql) => db.prepare(sql)),
    );
  }
  await db.batch([
    db.prepare(
      "INSERT INTO domains (id, hostname, is_primary, connection_status) VALUES ('domain', 'go.example.org', 1, 'active')",
    ),
    db.prepare(
      "INSERT INTO domains (id, hostname, connection_status) VALUES ('second', 'other.example.org', 'active')",
    ),
    db.prepare(
      `INSERT INTO links (id, domain_id, slug, destination_url, expires_at) VALUES
      ('first', 'domain', 'first', 'https://other.example.org/second?ignored=1#example', NULL),
      ('second', 'second', 'second', 'https://go.example.org/%66irst', NULL),
      ('external', 'domain', 'external', 'https://example.org/third', NULL),
      ('targeted', 'domain', 'targeted', 'https://example.org/', NULL),
      ('protected', 'domain', 'protected', 'https://go.example.org/protected', NULL),
      ('old', 'domain', 'old', 'https://go.example.org/old', 1),
      ('nonstandard', 'domain', 'nonstandard', 'https://go.example.org:8443/nonstandard', NULL),
      ('missing', 'domain', 'missing', 'https://go.example.org/not-saved', NULL)`,
    ),
    db.prepare(
      "UPDATE links SET protection_mode = 'one_time', gate_token = lower(hex(randomblob(32))) WHERE id = 'protected'",
    ),
    db.prepare(
      `INSERT INTO redirect_rules (id, link_id, rule_type, rule_value, destination_url, priority)
       VALUES ('generic-device', 'targeted', 'device', 'other', 'https://go.example.org/targeted', 0)`,
    ),
  ]);
}, 20_000);

afterAll(async () => platform?.dispose());

async function check(id: string) {
  const link = await getLink(db, id);
  if (!link) throw new Error('Missing fixture');
  return checkGuardianLink(db, link, async (hostname) => {
    expect(hostname).toBe('example.org');
    return 'dns_pending';
  });
}

it('finds a cross-domain loop through existing public routing', async () => {
  expect(await check('first')).toEqual({
    status: 'loop',
    checkedHops: 2,
    dns: null,
    loop: [
      { hostname: 'go.example.org', slug: 'first' },
      { hostname: 'other.example.org', slug: 'second' },
    ],
  });
});

it.each([
  ['old', 'expired'],
  ['protected', 'protected'],
  ['nonstandard', 'outside_local_chain'],
  ['missing', 'inactive_or_missing'],
])('classifies a stopped chain from %s', async (id, status) => {
  expect(await check(id)).toMatchObject({ status, loop: [] });
});

it('uses the public resolver targeting result for a generic visitor', async () => {
  expect(await check('targeted')).toEqual({
    status: 'loop',
    checkedHops: 1,
    loop: [{ hostname: 'go.example.org', slug: 'targeted' }],
    dns: null,
  });
});

it('checks only DNS for the terminal external hostname', async () => {
  expect(await check('external')).toEqual({
    status: 'outside_local_chain',
    checkedHops: 1,
    loop: [],
    dns: 'dns_pending',
  });
});
