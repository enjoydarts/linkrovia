import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { parseConditions } from '../../src/lib/server/targeting';
import { parseUtmConfig } from '../../src/lib/server/utm';
import { demoSampleSql } from '../../scripts/demo-sample-data.mjs';

const hostname = 'demo.linkrovia.com';

function database() {
  const db = new DatabaseSync(':memory:');
  const migrations = new URL('../../migrations/', import.meta.url);
  for (const filename of readdirSync(migrations).sort()) {
    db.exec(readFileSync(new URL(filename, migrations), 'utf8'));
  }
  return db;
}

describe('demo sample SQL', () => {
  it('requires the public demo hostname and does nothing without an active matching domain', () => {
    expect(() => demoSampleSql('go.example.com')).toThrow();
    using db = database();
    db.exec(`INSERT INTO domains (id, hostname, is_active) VALUES
      ('elsewhere', 'go.example.com', 1), ('demo', '${hostname}', 0)`);
    db.exec(demoSampleSql(hostname));
    expect(db.prepare('SELECT id FROM links').all()).toEqual([]);
    expect(db.prepare('SELECT id FROM tags').all()).toEqual([]);
    expect(db.prepare('SELECT id FROM utm_templates').all()).toEqual([]);
  });

  it('adds varied demo data while preserving existing rows, including on a rerun', () => {
    using db = database();
    db.exec(`INSERT INTO domains (id, hostname, is_active) VALUES
      ('demo', '${hostname}', 1);
      INSERT INTO links (id, domain_id, slug, destination_url) VALUES
      ('existing-slug', 'demo', 'aurora-launch', 'https://example.org/existing'),
      ('demo-sample-link-002', 'demo', 'my-existing-link', 'https://example.org/other');
      INSERT INTO tags (id, name) VALUES ('existing-tag', 'Demo sample')`);
    const sql = demoSampleSql(hostname);
    db.exec(sql);
    const links = db.prepare('SELECT * FROM links ORDER BY id').all();
    const rules = db.prepare('SELECT * FROM redirect_rules').all();
    const goals = db.prepare('SELECT * FROM conversion_goals').all();
    expect(links).toHaveLength(180);
    expect(
      links.filter(
        (link) =>
          link.id === 'existing-slug' || link.id === 'demo-sample-link-002',
      ),
    ).toMatchObject([
      {
        slug: 'my-existing-link',
        destination_url: 'https://example.org/other',
      },
      {
        slug: 'aurora-launch',
        destination_url: 'https://example.org/existing',
      },
    ]);
    expect(rules.length).toBeGreaterThan(10);
    expect(goals.length).toBeGreaterThan(5);
    const conversionHistory = db
      .prepare(
        `
      SELECT events.*, cohort.eligible_clicks, cohort.converted_clicks
      FROM conversion_rollups AS events
      JOIN conversion_cohort_rollups AS cohort USING (day_utc, goal_id)
      JOIN conversion_goals AS goal ON goal.id = events.goal_id
      JOIN links AS link ON link.id = goal.link_id
      WHERE events.link_id = link.id
        AND events.day_utc >= date(link.created_at, 'unixepoch')
        AND events.day_utc < date('now')
        AND events.attributed > 0 AND events.conversions > events.attributed
        AND cohort.converted_clicks = events.attributed
        AND cohort.eligible_clicks > cohort.converted_clicks
      ORDER BY events.goal_id, events.day_utc
    `,
      )
      .all();
    expect(conversionHistory).toHaveLength(goals.length * 6);
    expect(rules.every((rule) => parseConditions(rule.conditions_json))).toBe(
      true,
    );
    const tracked = links.filter(
      (link) => typeof link.utm_config_json === 'string',
    );
    expect(tracked.length).toBeGreaterThan(40);
    expect(
      tracked.every((link) =>
        parseUtmConfig(JSON.parse(String(link.utm_config_json))),
      ),
    ).toBe(true);
    expect(links.filter((link) => link.is_active === 0).length).toBeGreaterThan(
      5,
    );
    expect(
      links.filter((link) => link.expires_at !== null).length,
    ).toBeGreaterThan(5);
    expect(
      [...links, ...rules]
        .filter(
          (row) =>
            row.id !== 'existing-slug' && row.id !== 'demo-sample-link-002',
        )
        .every((row) => {
          const url = new URL(String(row.destination_url));
          return (
            url.protocol === 'https:' &&
            [
              'developer.mozilla.org',
              'developers.cloudflare.com',
              'docs.github.com',
              'www.w3.org',
            ].includes(url.hostname)
          );
        }),
    ).toBe(true);
    expect(
      db
        .prepare(
          "SELECT * FROM link_tags WHERE link_id IN ('existing-slug', 'demo-sample-link-002') OR tag_id = 'existing-tag'",
        )
        .all(),
    ).toEqual([]);

    db.exec(sql);
    expect(db.prepare('SELECT * FROM links ORDER BY id').all()).toEqual(links);
    expect(db.prepare('SELECT * FROM redirect_rules').all()).toEqual(rules);
    expect(db.prepare('SELECT * FROM conversion_goals').all()).toEqual(goals);
    expect(
      db.prepare('SELECT count(*) AS count FROM conversion_rollups').get(),
    ).toEqual({ count: conversionHistory.length });
    expect(
      db
        .prepare('SELECT count(*) AS count FROM conversion_cohort_rollups')
        .get(),
    ).toEqual({ count: conversionHistory.length });
    expect(db.prepare('SELECT * FROM users').all()).toEqual([]);
    expect(db.prepare('SELECT completed_at FROM setup_state').get()).toEqual({
      completed_at: null,
    });
  });
});
