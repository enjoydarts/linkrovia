import { createHash } from 'node:crypto';

export const demoGuardianLinkId = 'seed-link-003';

/** @param {string} token */
export function demoFixtures(token) {
  if (typeof token !== 'string' || !/^[0-9a-f]{64}$/u.test(token)) {
    throw new Error('The demo session token must be 64 lowercase hex digits.');
  }
  const tokenHash = createHash('sha256').update(token).digest('hex');

  return `
INSERT INTO users (id, email, password_hash, role, locale, timezone)
VALUES ('demo-owner', 'owner@example.com', 'disabled-demo-password', 'owner', 'en', 'UTC');

INSERT INTO sessions (id, user_id, token_hash, expires_at, last_seen_at)
VALUES ('demo-session', 'demo-owner', '${tokenHash}', unixepoch() + 3600, unixepoch());

UPDATE setup_state
SET completed_at = unixepoch(), owner_user_id = 'demo-owner', token_consumed_at = unixepoch()
WHERE singleton = 1;

INSERT INTO domains (id, hostname, connection_status, verified_at)
VALUES
  ('seed-domain-com', 'short.example.com', 'active', unixepoch()),
  ('seed-domain-net', 'short.example.net', 'active', unixepoch());

INSERT INTO links (id, domain_id, slug, destination_url, title, is_active, created_by, created_at)
VALUES
  ('seed-link-001', 'seed-domain-com', 'spring-launch', 'https://example.com/launch', 'Spring launch', 1, 'demo-owner', unixepoch() - 259200),
  ('seed-link-002', 'seed-domain-net', 'product-guide', 'https://example.net/guide', 'Product guide', 1, 'demo-owner', unixepoch() - 518400),
  ('${demoGuardianLinkId}', 'seed-domain-com', 'retired-webinar', 'https://example.com/webinar', 'Retired webinar', 0, 'demo-owner', unixepoch() - 777600);

INSERT INTO tags (id, name)
VALUES
  ('demo-tag-campaign', 'Campaign'),
  ('demo-tag-docs', 'Documentation'),
  ('demo-tag-archive', 'Archive');

INSERT INTO link_tags (link_id, tag_id)
VALUES
  ('seed-link-001', 'demo-tag-campaign'),
  ('seed-link-002', 'demo-tag-docs'),
  ('${demoGuardianLinkId}', 'demo-tag-archive');

INSERT INTO redirect_rules (id, link_id, rule_type, rule_value, destination_url, priority)
VALUES
  ('seed-rule-ios', 'seed-link-001', 'country', 'JP', 'https://example.com/ja/launch', 1),
  ('seed-rule-ipados', 'seed-link-001', 'device', 'tablet', 'https://example.com/launch/tablet', 2),
  ('seed-rule-android', 'seed-link-001', 'device', 'mobile', 'https://example.com/launch/mobile', 3),
  ('seed-rule-windows', 'seed-link-001', 'country', 'US', 'https://example.com/us/launch', 4),
  ('seed-rule-macos', 'seed-link-001', 'country', 'ES', 'https://example.com/es/launch', 5),
  ('seed-rule-linux', 'seed-link-001', 'country', 'CN', 'https://example.com/zh/launch', 6),
  ('seed-rule-other', 'seed-link-001', 'language', 'fr', 'https://example.com/fr/launch', 7);
`;
}
