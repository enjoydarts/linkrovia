import { uuidV7 } from '../auth/crypto';
import { generateSlug } from '../security/slug';
import type { TargetingCondition, TargetingRule } from '../targeting';
import type { ProtectionMode } from './protection';

export type RedirectType = 301 | 302 | 307 | 308;
export type LinkRuleInput = {
  conditions: TargetingCondition[];
  priority: number;
  destinationUrl: string;
  isActive: boolean;
};
export type LinkInput = {
  domainId: string;
  slug: string | null;
  destinationUrl: string;
  title: string | null;
  redirectType: RedirectType;
  isActive: boolean;
  startsAt: number | null;
  expiresAt: number | null;
  tags: string[];
  rules?: LinkRuleInput[];
  utmConfigJson?: string | null;
};

export type LinkSummary = Omit<
  LinkInput,
  'slug' | 'rules' | 'utmConfigJson'
> & {
  id: string;
  hostname: string;
  slug: string;
  createdAt: number;
  updatedAt: number;
  utmConfigJson: string | null;
  protectionMode: ProtectionMode;
  consumedAt: number | null;
};

type LinkRow = Omit<LinkSummary, 'isActive' | 'tags'> & {
  isActive: number;
  tags: string;
};
type MutationResult =
  | { ok: true; id: string }
  | { ok: false; code: 'slug_conflict' | 'missing_domain' | 'stale_link' };
type UpdateMutationResult =
  MutationResult | { ok: false; code: 'temporary_redirect' };
type DemoCreateMutationResult =
  MutationResult | { ok: false; code: 'demo_limit' };

export type DemoLinkScope = { hostname: string };
export type LinkVisibility = { unprotectedOnly?: boolean };
type LinkCriteria = LinkVisibility & {
  q?: string;
  domain?: string;
  tag?: string;
  status?: string;
  sort?: LinkSort;
};
export type LinkFilter = LinkCriteria & {
  cursor?: string;
  limit?: number;
};
export type LinkSort = 'created_desc' | 'created_asc' | 'updated_desc';
export type DomainSummary = {
  id: string;
  hostname: string;
  isActive: boolean;
  connectionStatus: string;
};

const linkFields = `
  l.id, l.domain_id AS domainId, d.hostname, l.slug, l.destination_url AS destinationUrl,
  l.title, l.redirect_type AS redirectType, l.is_active AS isActive,
  l.created_at AS createdAt, l.updated_at AS updatedAt, l.starts_at AS startsAt,
  l.expires_at AS expiresAt, l.utm_config_json AS utmConfigJson,
  l.protection_mode AS protectionMode, l.consumed_at AS consumedAt,
  (SELECT json_group_array(t.name ORDER BY t.name COLLATE NOCASE)
   FROM link_tags lt JOIN tags t ON t.id = lt.tag_id WHERE lt.link_id = l.id) AS tags
`;
const linkSource = 'FROM links l JOIN domains d ON d.id = l.domain_id';
const defaultPageSize = 30;
const guestLinkPrefix = 'demo-guest-link-';
const demoGuestLinkLimit = 100;
const availableDomain = 'backup_archived_at IS NULL';
const demoDomain = `${availableDomain} AND hostname = ? AND is_active = 1 AND connection_status = 'active'`;
const demoEditable = `
  created_by IS NULL AND protection_mode = 'none'
  AND (id GLOB 'demo-sample-link-[0-9][0-9][0-9]' OR id GLOB '${guestLinkPrefix}*')
  AND EXISTS (SELECT 1 FROM domains WHERE id = links.domain_id AND ${demoDomain})
`;
const demoBelowLimit = `(
  SELECT COUNT(*) FROM links
  WHERE id GLOB '${guestLinkPrefix}*' AND domain_id = ? AND deleted_at IS NULL
) < ?`;

function mapLink(row: LinkRow): LinkSummary {
  return {
    ...row,
    isActive: row.isActive === 1,
    tags: JSON.parse(row.tags) as string[],
  };
}

export async function getLink(
  db: D1Database,
  id: string,
  { unprotectedOnly }: LinkVisibility = {},
): Promise<LinkSummary | null> {
  const row = await db
    .prepare(
      `SELECT ${linkFields} ${linkSource} WHERE l.id = ? AND l.deleted_at IS NULL
       ${unprotectedOnly ? "AND l.protection_mode = 'none'" : ''}`,
    )
    .bind(id)
    .first<LinkRow>();
  return row ? mapLink(row) : null;
}

export async function isDemoEditableLink(
  db: D1Database,
  id: string,
  demo: DemoLinkScope,
): Promise<boolean> {
  return (
    (await db
      .prepare(
        `SELECT 1 FROM links WHERE id = ? AND deleted_at IS NULL AND ${demoEditable}`,
      )
      .bind(id, demo.hostname)
      .first()) !== null
  );
}

function linkConditions(filter: LinkCriteria) {
  const clauses = ['l.deleted_at IS NULL'];
  if (filter.unprotectedOnly) clauses.push("l.protection_mode = 'none'");
  const parameters: (number | string)[] = [];
  if (filter.q) {
    const term = '%' + filter.q.slice(0, 200).replace(/[!%_]/g, '!$&') + '%';
    clauses.push(
      "(l.slug LIKE ? ESCAPE '!' OR l.title LIKE ? ESCAPE '!' OR l.destination_url LIKE ? ESCAPE '!')",
    );
    parameters.push(term, term, term);
  }
  if (filter.domain) {
    clauses.push('l.domain_id = ?');
    parameters.push(filter.domain);
  }
  if (filter.tag) {
    clauses.push(
      'EXISTS (SELECT 1 FROM link_tags lt JOIN tags t ON t.id = lt.tag_id WHERE lt.link_id = l.id AND t.name = ? COLLATE NOCASE)',
    );
    parameters.push(filter.tag);
  }
  if (filter.status === 'active' || filter.status === 'inactive') {
    clauses.push('l.is_active = ?');
    parameters.push(filter.status === 'active' ? 1 : 0);
  }
  return { clauses, parameters };
}

function linkOrder(requestedSort: LinkSort | undefined) {
  const sort =
    requestedSort === 'created_asc' || requestedSort === 'updated_desc'
      ? requestedSort
      : 'created_desc';
  const ascending = sort === 'created_asc';
  const direction = ascending ? 'ASC' : 'DESC';
  const field = sort === 'updated_desc' ? 'l.updated_at' : 'l.created_at';
  const resultField = sort === 'updated_desc' ? 'updatedAt' : 'createdAt';
  return { sort, ascending, direction, field, resultField };
}

export async function listLinks(db: D1Database, filter: LinkFilter = {}) {
  const pageSize =
    Number.isSafeInteger(filter.limit) && filter.limit! > 0
      ? Math.min(filter.limit!, 100)
      : defaultPageSize;
  const { clauses, parameters } = linkConditions(filter);
  const { sort, ascending, direction, field } = linkOrder(filter.sort);
  const cursorValue = filter.cursor ?? '';
  // Keep accepting the original cursor for API/MCP clients using the default order.
  const legacyCursor =
    sort === 'created_desc'
      ? /^(\d{1,12}):((?:demo-guest-link-)?[0-9a-f-]{36}|demo-sample-link-\d{3})$/i.exec(
          cursorValue,
        )
      : null;
  const sortedCursor =
    /^v1\.(created_desc|created_asc|updated_desc)\.(\d{1,12})\.((?:demo-guest-link-)?[0-9a-f-]{36}|demo-sample-link-\d{3})$/i.exec(
      cursorValue,
    );
  const cursor = legacyCursor
    ? { timestamp: Number(legacyCursor[1]), id: legacyCursor[2] }
    : sortedCursor?.[1] === sort
      ? { timestamp: Number(sortedCursor[2]), id: sortedCursor[3] }
      : null;
  if (cursor) {
    clauses.push(`(${field}, l.id) ${ascending ? '>' : '<'} (?, ?)`);
    parameters.push(cursor.timestamp, cursor.id);
  }
  const result = await db
    .prepare(
      `SELECT ${linkFields} ${linkSource} WHERE ${clauses.join(' AND ')}
     ORDER BY ${field} ${direction}, l.id ${direction} LIMIT ?`,
    )
    .bind(...parameters, pageSize + 1)
    .all<LinkRow>();
  const links = result.results.slice(0, pageSize).map(mapLink);
  const last = links.at(-1);
  return {
    links,
    nextCursor:
      last && result.results.length > pageSize
        ? sort === 'created_desc'
          ? `${last.createdAt}:${last.id}`
          : `v1.${sort}.${sort === 'updated_desc' ? last.updatedAt : last.createdAt}.${last.id}`
        : null,
  };
}

export async function listLinksPage(
  db: D1Database,
  filter: LinkCriteria & { page: string | null },
) {
  const { clauses, parameters } = linkConditions(filter);
  const { field, direction, resultField } = linkOrder(filter.sort);
  const requestedPage =
    filter.page && /^\d+$/.test(filter.page)
      ? Math.max(1, Math.min(Number(filter.page), Number.MAX_SAFE_INTEGER))
      : 1;
  const where = clauses.join(' AND ');

  // Count and read the clamped page in the same database snapshot.
  const { results } = await db
    .prepare(
      `WITH totals AS (
        SELECT (COUNT(*) + ${defaultPageSize - 1}) / ${defaultPageSize} AS totalPages
        ${linkSource} WHERE ${where}
      ), pagination AS (
        SELECT MIN(?, MAX(totalPages, 1)) AS page, totalPages FROM totals
      ), pageLinks AS (
        SELECT ${linkFields} ${linkSource} WHERE ${where}
        ORDER BY ${field} ${direction}, l.id ${direction}
        LIMIT ${defaultPageSize}
        OFFSET ((SELECT page FROM pagination) - 1) * ${defaultPageSize}
      )
      SELECT pagination.*, pageLinks.* FROM pagination LEFT JOIN pageLinks ON TRUE
      ORDER BY pageLinks.${resultField} ${direction}, pageLinks.id ${direction}`,
    )
    .bind(...parameters, requestedPage, ...parameters)
    .all<{ page: number; totalPages: number } & (LinkRow | { id: null })>();
  const { page, totalPages } = results[0];
  return {
    pagination: { page, totalPages },
    links: results.flatMap(
      ({ page: _page, totalPages: _totalPages, ...row }) =>
        row.id === null ? [] : [mapLink(row)],
    ),
  };
}

export async function listDomains(
  db: D1Database,
  page?: { limit: number; offset: number },
): Promise<DomainSummary[]> {
  const statement = db.prepare(
    `SELECT id, hostname, is_active AS isActive, connection_status AS connectionStatus
     FROM domains WHERE backup_archived_at IS NULL
     ORDER BY is_primary DESC, hostname ${page ? 'LIMIT ? OFFSET ?' : ''}`,
  );
  const { results } = await (
    page ? statement.bind(page.limit, page.offset) : statement
  ).all<Omit<DomainSummary, 'isActive'> & { isActive: number }>();
  return results.map((domain) => ({
    ...domain,
    isActive: domain.isActive === 1,
  }));
}

export async function addDraftDomain(
  db: D1Database,
  hostname: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `INSERT INTO domains (id, hostname, is_active, connection_status) VALUES (?, ?, 0, 'draft')
       ON CONFLICT(hostname) DO UPDATE SET backup_archived_at = NULL, updated_at = unixepoch()
       WHERE domains.backup_archived_at IS NOT NULL`,
    )
    .bind(uuidV7(), hostname)
    .run();
  return result.meta.changes > 0;
}

function writeAudit(
  db: D1Database,
  auditId: string,
  userId: string | null,
  action: string,
  id: string,
) {
  return db
    .prepare(
      "INSERT INTO audit_events (id, user_id, action, entity_type, entity_id) SELECT ?, ?, ?, 'link', ? WHERE changes() = 1",
    )
    .bind(auditId, userId, action, id);
}

function tagStatements(
  db: D1Database,
  auditId: string,
  linkId: string,
  tags: string[],
) {
  return tags.flatMap((tag) => [
    db
      .prepare(
        'INSERT INTO tags (id, name) SELECT ?, ? WHERE EXISTS (SELECT 1 FROM audit_events WHERE id = ?) ON CONFLICT(name) DO NOTHING',
      )
      .bind(uuidV7(), tag, auditId),
    db
      .prepare(
        'INSERT INTO link_tags (link_id, tag_id) SELECT ?, id FROM tags WHERE name = ? COLLATE NOCASE AND EXISTS (SELECT 1 FROM audit_events WHERE id = ?) ON CONFLICT DO NOTHING',
      )
      .bind(linkId, tag, auditId),
  ]);
}

export async function listLinkRulesForLinks(
  db: D1Database,
  ids: readonly string[],
  { unprotectedOnly }: LinkVisibility = {},
): Promise<(TargetingRule & { linkId: string })[]> {
  const uniqueIds = [...new Set(ids)];
  if (!uniqueIds.length) return [];
  if (uniqueIds.length > 100)
    throw new RangeError('Too many links in rule lookup');
  const placeholders = uniqueIds.map(() => '?').join(', ');
  const result = await db
    .prepare(
      `SELECT link_id AS linkId, id, priority, is_active AS isActive, conditions_json AS conditionsJson,
      rule_type AS ruleType, operator, rule_value AS ruleValue, destination_url AS destinationUrl
      FROM redirect_rules WHERE link_id IN (${placeholders})
      ${unprotectedOnly ? "AND link_id IN (SELECT id FROM links WHERE deleted_at IS NULL AND protection_mode = 'none')" : ''}
      ORDER BY link_id, priority, id`,
    )
    .bind(...uniqueIds)
    .all<TargetingRule & { linkId: string }>();
  return result.results;
}

export async function listLinkRules(
  db: D1Database,
  linkId: string,
  visibility?: LinkVisibility,
): Promise<TargetingRule[]> {
  return listLinkRulesForLinks(db, [linkId], visibility);
}

function writeRule(
  db: D1Database,
  auditId: string,
  linkId: string,
  id: string,
  rule: LinkRuleInput,
) {
  const [first] = rule.conditions;
  if (!first)
    throw new TypeError('A redirect rule must have at least one condition');
  return db
    .prepare(
      `INSERT INTO redirect_rules (id, link_id, rule_type, operator, rule_value, conditions_json, destination_url, priority, is_active)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM audit_events WHERE id = ?)
       ON CONFLICT (id) DO UPDATE SET
         rule_type = excluded.rule_type,
         operator = excluded.operator,
         rule_value = excluded.rule_value,
         conditions_json = excluded.conditions_json,
         destination_url = excluded.destination_url,
         priority = excluded.priority,
         is_active = excluded.is_active,
         updated_at = MAX(unixepoch(), redirect_rules.updated_at + 1)
       WHERE redirect_rules.link_id = excluded.link_id`,
    )
    .bind(
      id,
      linkId,
      first.type,
      first.operator,
      first.value,
      JSON.stringify(rule.conditions),
      rule.destinationUrl,
      rule.priority,
      Number(rule.isActive),
      auditId,
    );
}

function ruleStatements(
  db: D1Database,
  auditId: string,
  linkId: string,
  rules?: LinkRuleInput[],
) {
  if (rules === undefined) return [];
  return [
    db
      .prepare(
        'DELETE FROM redirect_rules WHERE link_id = ? AND EXISTS (SELECT 1 FROM audit_events WHERE id = ?)',
      )
      .bind(linkId, auditId),
    ...rules.map((rule) => writeRule(db, auditId, linkId, uuidV7(), rule)),
  ];
}

export async function updateLinkRules(
  db: D1Database,
  actorId: string | null,
  linkId: string,
  expected: number,
  rules: (LinkRuleInput & { id: string | null })[],
  demo?: DemoLinkScope,
): Promise<
  { ok: true; id: string } | { ok: false; code: 'stale_link' | 'invalid_input' }
> {
  const ids = rules.flatMap(({ id }) => (id === null ? [] : [id]));
  const retained = new Set(ids);
  if (retained.size !== ids.length) return { ok: false, code: 'invalid_input' };

  const audit = uuidV7();
  const retainedJson = JSON.stringify(ids);
  const [update] = await db.batch([
    db
      .prepare(
        `UPDATE links SET
          utm_config_json = CASE WHEN json_valid(utm_config_json) THEN
            CASE WHEN json_type(utm_config_json, '$.rules') = 'object' THEN
              json_set(utm_config_json, '$.rules', (
                SELECT json_group_object(tracking.key, utm_config_json -> tracking.fullkey)
                FROM json_each(utm_config_json, '$.rules') AS tracking
                WHERE NOT EXISTS (
                  SELECT 1 FROM redirect_rules
                  WHERE link_id = links.id AND id = tracking.key AND id NOT IN (SELECT value FROM json_each(?))
                )
              ))
            ELSE utm_config_json END
          ELSE utm_config_json END,
          conversion_tracking = 0,
          updated_at = MAX(unixepoch(), updated_at + 1)
        WHERE id = ? AND updated_at = ? AND deleted_at IS NULL
          ${demo ? `AND ${demoEditable}` : ''}
          AND NOT EXISTS (
            SELECT 1 FROM json_each(?) AS retained
            WHERE NOT EXISTS (
              SELECT 1 FROM redirect_rules WHERE link_id = links.id AND id = retained.value
            )
          )`,
      )
      .bind(
        retainedJson,
        linkId,
        expected,
        ...(demo ? [demo.hostname] : []),
        retainedJson,
      ),
    writeAudit(db, audit, demo ? null : actorId, 'link.updated', linkId),
    db
      .prepare(
        `DELETE FROM redirect_rules
         WHERE link_id = ? AND id NOT IN (SELECT value FROM json_each(?))
           AND EXISTS (SELECT 1 FROM audit_events WHERE id = ?)`,
      )
      .bind(linkId, retainedJson, audit),
    ...rules.map((rule) =>
      writeRule(db, audit, linkId, rule.id ?? uuidV7(), rule),
    ),
  ]);

  if (update.meta.changes > 0) return { ok: true, id: linkId };
  if (demo && !(await isDemoEditableLink(db, linkId, demo)))
    return { ok: false, code: 'stale_link' };
  const current = await getLink(db, linkId);
  return {
    ok: false,
    code: current?.updatedAt === expected ? 'invalid_input' : 'stale_link',
  };
}

export async function isAvailableLinkDomain(db: D1Database, id: string) {
  return (
    (await db
      .prepare(`SELECT 1 FROM domains WHERE id = ? AND ${availableDomain}`)
      .bind(id)
      .first()) !== null
  );
}

export function createLink(
  db: D1Database,
  actorId: string | null,
  input: LinkInput,
): Promise<MutationResult>;
export function createLink(
  db: D1Database,
  actorId: string | null,
  input: LinkInput,
  demo: DemoLinkScope | undefined,
): Promise<DemoCreateMutationResult>;
export async function createLink(
  db: D1Database,
  actorId: string | null,
  input: LinkInput,
  demo?: DemoLinkScope,
): Promise<DemoCreateMutationResult> {
  const domain = `SELECT 1 FROM domains WHERE id = ? AND ${demo ? demoDomain : availableDomain}`;
  const domainParams = demo
    ? [input.domainId, demo.hostname]
    : [input.domainId];
  const actor = demo ? null : actorId;
  if (
    !(await db
      .prepare(domain)
      .bind(...domainParams)
      .first())
  ) {
    return { ok: false, code: 'missing_domain' };
  }

  for (let attempt = 0; attempt < (input.slug ? 1 : 5); attempt++) {
    const id = demo ? guestLinkPrefix + uuidV7() : uuidV7();
    const audit = uuidV7();
    const [insert] = await db.batch([
      db
        .prepare(
          `INSERT INTO links (id, domain_id, slug, destination_url, title, redirect_type, is_active, starts_at, expires_at, created_by, utm_config_json)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
         WHERE EXISTS (${domain}) ${demo ? `AND ${demoBelowLimit}` : ''}
         ON CONFLICT(domain_id, slug) DO NOTHING`,
        )
        .bind(
          id,
          input.domainId,
          input.slug ?? generateSlug(),
          input.destinationUrl,
          input.title,
          input.redirectType,
          Number(input.isActive),
          input.startsAt,
          input.expiresAt,
          actor,
          input.utmConfigJson ?? null,
          ...domainParams,
          ...(demo ? [input.domainId, demoGuestLinkLimit] : []),
        ),
      writeAudit(db, audit, actor, 'link.created', id),
      ...tagStatements(db, audit, id, input.tags),
      ...ruleStatements(db, audit, id, input.rules),
    ]);
    if (insert.meta.changes > 0) return { ok: true, id };
  }
  if (
    !(await db
      .prepare(domain)
      .bind(...domainParams)
      .first())
  )
    return { ok: false, code: 'missing_domain' };
  if (
    demo &&
    !(await db
      .prepare(`SELECT 1 WHERE ${demoBelowLimit}`)
      .bind(input.domainId, demoGuestLinkLimit)
      .first())
  )
    return { ok: false, code: 'demo_limit' };
  return { ok: false, code: 'slug_conflict' };
}

export async function updateLink(
  db: D1Database,
  actorId: string | null,
  id: string,
  expected: number,
  input: LinkInput,
  demo?: DemoLinkScope,
): Promise<UpdateMutationResult> {
  if (!input.slug) return { ok: false, code: 'slug_conflict' };
  const domain = `SELECT 1 FROM domains WHERE id = ? AND ${demo ? demoDomain : availableDomain}`;
  const domainParams = demo
    ? [input.domainId, demo.hostname]
    : [input.domainId];
  if (
    !(await db
      .prepare(domain)
      .bind(...domainParams)
      .first())
  ) {
    return { ok: false, code: 'missing_domain' };
  }

  const audit = uuidV7();
  const [update] = await db.batch([
    db
      .prepare(
        `UPDATE links SET domain_id = ?, slug = ?, destination_url = ?, title = ?, redirect_type = ?,
        is_active = ?, starts_at = ?, expires_at = ?,
        conversion_tracking = CASE
          WHEN destination_url <> ? OR domain_id <> ? OR redirect_type <> ? OR ? THEN 0
          ELSE conversion_tracking
        END,
        utm_config_json = CASE
          WHEN ? THEN ?
          WHEN ? AND json_valid(utm_config_json) THEN json_remove(utm_config_json, '$.rules')
          ELSE utm_config_json
        END,
        updated_at = MAX(unixepoch(), updated_at + 1)
       WHERE id = ? AND updated_at = ? AND deleted_at IS NULL
         AND EXISTS (${domain})
         ${demo ? `AND ${demoEditable}` : ''}
         AND (protection_mode = 'none' OR ? IN (302, 307))
         AND NOT EXISTS (SELECT 1 FROM links other WHERE other.domain_id = ? AND other.slug = ? AND other.id <> ?)`,
      )
      .bind(
        input.domainId,
        input.slug,
        input.destinationUrl,
        input.title,
        input.redirectType,
        Number(input.isActive),
        input.startsAt,
        input.expiresAt,
        input.destinationUrl,
        input.domainId,
        input.redirectType,
        Number(input.rules !== undefined),
        Number(input.utmConfigJson !== undefined),
        input.utmConfigJson ?? null,
        Number(input.rules !== undefined),
        id,
        expected,
        ...domainParams,
        ...(demo ? [demo.hostname] : []),
        input.redirectType,
        input.domainId,
        input.slug,
        id,
      ),
    writeAudit(db, audit, demo ? null : actorId, 'link.updated', id),
    db
      .prepare(
        'DELETE FROM link_tags WHERE link_id = ? AND EXISTS (SELECT 1 FROM audit_events WHERE id = ?)',
      )
      .bind(id, audit),
    ...tagStatements(db, audit, id, input.tags),
    ...ruleStatements(db, audit, id, input.rules),
  ]);
  if (update.meta.changes > 0) return { ok: true, id };
  if (
    !(await db
      .prepare(domain)
      .bind(...domainParams)
      .first())
  ) {
    return { ok: false, code: 'missing_domain' };
  }
  if (demo && !(await isDemoEditableLink(db, id, demo)))
    return { ok: false, code: 'stale_link' };
  const row = await getLink(db, id);
  if (
    row?.updatedAt === expected &&
    row.protectionMode !== 'none' &&
    input.redirectType !== 302 &&
    input.redirectType !== 307
  )
    return { ok: false, code: 'temporary_redirect' };
  return {
    ok: false,
    code: row?.updatedAt === expected ? 'slug_conflict' : 'stale_link',
  };
}

export async function removeLink(
  db: D1Database,
  actorId: string,
  id: string,
  expected: number,
): Promise<boolean> {
  const [removed] = await db.batch([
    db
      .prepare(
        'UPDATE links SET deleted_at = unixepoch(), updated_at = MAX(unixepoch(), updated_at + 1) WHERE id = ? AND updated_at = ? AND deleted_at IS NULL',
      )
      .bind(id, expected),
    writeAudit(db, uuidV7(), actorId, 'link.deleted', id),
  ]);
  return removed.meta.changes > 0;
}
