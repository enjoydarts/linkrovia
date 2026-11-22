import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import {
  createLink,
  getLink,
  listLinks,
  listLinkRules,
  updateLink,
} from '../../src/lib/server/links/store';
import { resolveShortLink } from '../../src/lib/server/links/redirect';

let platform: Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>>;
const draft = {
  domainId: 'a',
  slug: 'AbC',
  destinationUrl: 'https://example.com/a?selected=1#more',
  title: null,
  redirectType: 302 as const,
  isActive: true,
  startsAt: null,
  expiresAt: null,
  tags: ['demo', 'release'],
};

beforeAll(async () => {
  platform = await getPlatformProxy<{ DB: D1Database }>({
    configPath: 'wrangler.local.jsonc',
    persist: false,
  });
  for (const name of ['0001_initial.sql', '0002_domain_connections.sql']) {
    const sql = await readFile(
      new URL('../../migrations/' + name, import.meta.url),
      'utf8',
    );
    const statements = sql
      .replace(/--.*$/gm, '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean);
    await platform.env.DB.batch(
      statements.map((statement) => platform.env.DB.prepare(statement)),
    );
  }
  await platform.env.DB.batch([
    platform.env.DB.prepare(
      "INSERT INTO domains(id,hostname,connection_status) VALUES('a','go.example.com','active')",
    ),
    platform.env.DB.prepare(
      "INSERT INTO domains(id,hostname,connection_status) VALUES('b','links.example.org','active')",
    ),
    platform.env.DB.prepare(
      "INSERT INTO domains(id,hostname,connection_status) VALUES('draft','draft.example.net','draft')",
    ),
  ]);
}, 15_000);

afterAll(async () => platform?.dispose());

describe('link management and delivery', () => {
  it('enforces domain-scoped uniqueness and case-sensitive lookup', async () => {
    const db = platform.env.DB;
    const first = await createLink(db, null, draft);
    expect(first).toMatchObject({ ok: true });
    expect(await createLink(db, null, draft)).toEqual({
      ok: false,
      code: 'slug_conflict',
    });
    expect(
      await createLink(db, null, { ...draft, domainId: 'b' }),
    ).toMatchObject({ ok: true });
    expect(
      await resolveShortLink(
        db,
        'go.example.com',
        'abc',
        new Request('https://go.example.com/abc'),
      ),
    ).toEqual({ status: 404 });
    expect(
      await resolveShortLink(
        db,
        'go.example.com',
        'AbC',
        new Request('https://go.example.com/AbC?private=1'),
      ),
    ).toMatchObject({
      status: 302,
      location: draft.destinationUrl,
    });
  });

  it('rejects concurrent stale edits without replacing their tags', async () => {
    const db = platform.env.DB;
    const created = await createLink(db, null, { ...draft, slug: 'edit-me' });
    if (!created.ok) throw new Error(created.code);
    const link = await getLink(db, created.id);
    if (!link) throw new Error('missing link');
    const edited = {
      ...draft,
      slug: 'edit-me',
      tags: ['latest'],
      redirectType: 307 as const,
    };
    expect(
      await updateLink(db, null, link.id, link.updatedAt, edited),
    ).toMatchObject({ ok: true });
    expect(
      await updateLink(db, null, link.id, link.updatedAt, {
        ...edited,
        tags: ['stale'],
      }),
    ).toEqual({ ok: false, code: 'stale_link' });
    expect(await getLink(db, link.id)).toMatchObject({
      tags: ['latest'],
      redirectType: 307,
    });
    expect(
      (await listLinks(db, { tag: 'latest' })).links.map(({ id }) => id),
    ).toEqual([link.id]);
  });

  it('applies snapshotted UTM values to the selected destination without forwarding visitor query parameters', async () => {
    const db = platform.env.DB;
    const created = await createLink(db, null, {
      ...draft,
      slug: 'utm-snapshot',
      utmConfigJson: JSON.stringify({ default: { utm_source: 'original' } }),
      rules: [
        {
          priority: 0,
          isActive: true,
          conditions: [{ type: 'country', operator: 'eq', value: 'JP' }],
          destinationUrl: 'https://example.org/jp?label=a%20b#section',
        },
      ],
    });
    if (!created.ok) throw new Error(created.code);
    const [rule] = await listLinkRules(db, created.id);
    const link = await getLink(db, created.id);
    if (!link || !rule) throw new Error('Missing test link or rule');
    expect(
      await updateLink(db, null, link.id, link.updatedAt, {
        ...draft,
        slug: 'utm-snapshot',
        utmConfigJson: JSON.stringify({
          default: { utm_source: 'release' },
          rules: { [rule.id]: { utm_source: 'japan' } },
        }),
      }),
    ).toMatchObject({ ok: true });

    const request = new Request(
      'https://go.example.com/utm-snapshot?utm_source=visitor&other=private',
    );
    expect(
      await resolveShortLink(db, 'go.example.com', 'utm-snapshot', request),
    ).toMatchObject({
      status: 302,
      location: 'https://example.com/a?selected=1&utm_source=release#more',
    });
    expect(
      await resolveShortLink(db, 'go.example.com', 'utm-snapshot', request, {
        country: 'JP',
      }),
    ).toMatchObject({
      status: 302,
      location: 'https://example.org/jp?label=a%20b&utm_source=japan#section',
      matchedRuleId: rule.id,
    });
  });

  it('serves expired links as 410 and keeps draft domains and protected links private', async () => {
    const db = platform.env.DB;
    const now = Math.floor(Date.now() / 1000);
    await createLink(db, null, { ...draft, slug: 'expired', expiresAt: now });
    await createLink(db, null, {
      ...draft,
      domainId: 'draft',
      slug: 'pending',
    });
    expect(
      await resolveShortLink(
        db,
        'go.example.com',
        'expired',
        new Request('https://go.example.com/expired'),
      ),
    ).toEqual({ status: 410 });
    expect(
      await resolveShortLink(
        db,
        'draft.example.net',
        'pending',
        new Request('https://draft.example.net/pending'),
      ),
    ).toEqual({ status: 404 });
  });
});
