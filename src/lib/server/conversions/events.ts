import { hex, sha256, uuidV7 } from '../auth/crypto';
import { isObject } from '../links/api-input';
import { verifyClickReference } from './attribution';

type ConversionEvent = {
  goalId: string;
  occurredAt: number;
  clickRef: string | null;
};

type Receipt = {
  id: string;
  goalId: string;
  occurredAt: number;
  linkId: string | null;
  status: 'accepted' | 'unattributed';
};

const receiptFields =
  'id, goal_id AS goalId, occurred_at AS occurredAt, link_id AS linkId, status';
const retentionSeconds = 30 * 86400;

export function parseConversionEvent(value: unknown): ConversionEvent | null {
  if (
    !isObject(value) ||
    Object.keys(value).some(
      (key) => !['goalId', 'occurredAt', 'clickRef'].includes(key),
    )
  )
    return null;
  const { goalId, occurredAt: valueAt, clickRef = null } = value;
  if (
    typeof goalId !== 'string' ||
    !/^[a-z0-9][a-z0-9_-]{0,95}$/i.test(goalId) ||
    (clickRef !== null &&
      (typeof clickRef !== 'string' || clickRef.length > 113))
  )
    return null;
  const occurredAt =
    typeof valueAt === 'string' &&
    /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(valueAt)
      ? Math.floor(Date.parse(valueAt) / 1000)
      : valueAt;
  if (
    typeof occurredAt !== 'number' ||
    !Number.isSafeInteger(occurredAt) ||
    occurredAt < 0
  )
    return null;
  if (
    typeof valueAt === 'string' &&
    new Date(occurredAt * 1000).toISOString().slice(0, 19) !==
      valueAt.slice(0, 19)
  )
    return null;
  return { goalId, occurredAt, clickRef };
}

async function priorReceipt(db: D1Database, goalId: string, key: string) {
  return db
    .prepare(
      `SELECT ${receiptFields} FROM conversion_receipts WHERE goal_id = ? AND dedupe_key_hash = ?`,
    )
    .bind(goalId, key)
    .first<Receipt>();
}

type EventResult =
  | { receipt: Receipt; duplicate: boolean }
  | {
      code:
        | 'invalid_idempotency_key'
        | 'invalid_time'
        | 'invalid_reference'
        | 'goal_not_found';
    };

export async function recordConversion(
  db: D1Database,
  actor: string,
  event: ConversionEvent,
  idempotencyKey: string | null,
): Promise<EventResult> {
  if (!idempotencyKey || !/^[!-~]{1,128}$/.test(idempotencyKey))
    return { code: 'invalid_idempotency_key' };
  const key = hex(await sha256(idempotencyKey));
  const prior = await priorReceipt(db, event.goalId, key);
  if (prior) return { receipt: prior, duplicate: true };
  const now = Math.floor(Date.now() / 1000);
  if (event.occurredAt < now - retentionSeconds || event.occurredAt > now + 300)
    return { code: 'invalid_time' };
  const reference =
    event.clickRef === null
      ? null
      : await verifyClickReference(db, event.clickRef);
  if (event.clickRef !== null && !reference)
    return { code: 'invalid_reference' };

  const id = uuidV7();
  const [inserted] = await db.batch<Receipt>([
    db
      .prepare(
        `INSERT INTO conversion_receipts (id, goal_id, click_ref_hash, dedupe_key_hash, occurred_at, link_id, status)
      SELECT ?, g.id, ref.ref_hash, ?, ?, ref.link_id, CASE WHEN ref.ref_hash IS NULL THEN 'unattributed' ELSE 'accepted' END
      FROM conversion_goals g
      LEFT JOIN (click_attributions ref
        JOIN links l ON l.id = ref.link_id AND l.conversion_tracking = 1 AND l.deleted_at IS NULL
        JOIN json_each(ref.eligible_goals_json) eligibility)
        ON ref.ref_hash = ? AND ref.expires_at > unixepoch()
        AND eligibility.key = g.id AND eligibility.value > unixepoch()
        AND ? >= ref.created_at AND ? < eligibility.value
        AND (g.link_id IS NULL OR g.link_id = ref.link_id)
      WHERE g.id = ? AND g.is_active = 1 AND g.backup_archived_at IS NULL
        AND (g.link_id IS NULL OR EXISTS (SELECT 1 FROM links WHERE id = g.link_id AND deleted_at IS NULL))
        AND (? IS NULL OR ref.ref_hash IS NOT NULL)
      ON CONFLICT DO NOTHING RETURNING ${receiptFields}`,
      )
      .bind(
        id,
        key,
        event.occurredAt,
        reference,
        event.occurredAt,
        event.occurredAt,
        event.goalId,
        reference,
      ),
    db
      .prepare(
        `INSERT INTO audit_events (id, user_id, action, entity_type, entity_id)
      SELECT ?, ?, 'conversion.received', 'conversion_receipt', ? WHERE changes() = 1`,
      )
      .bind(uuidV7(), actor, id),
  ]);
  if (inserted.results[0])
    return { receipt: inserted.results[0], duplicate: false };
  const duplicate = await priorReceipt(db, event.goalId, key);
  if (duplicate) return { receipt: duplicate, duplicate: true };
  const activeGoal = await db
    .prepare(
      `SELECT 1 FROM conversion_goals g WHERE g.id = ? AND g.is_active = 1 AND g.backup_archived_at IS NULL
    AND (g.link_id IS NULL OR EXISTS (SELECT 1 FROM links WHERE id = g.link_id AND deleted_at IS NULL))`,
    )
    .bind(event.goalId)
    .first();
  return { code: activeGoal ? 'invalid_reference' : 'goal_not_found' };
}

export async function conversionSummary(
  db: D1Database,
  from: number,
  to: number,
) {
  const { results } = await db
    .prepare(
      `WITH events AS (
      SELECT goal_id, COUNT(*) AS total, SUM(status = 'accepted') AS attributed
      FROM conversion_receipts WHERE occurred_at >= ? AND occurred_at < ? GROUP BY goal_id
    ), cohort AS (
      SELECT eligibility.key AS id, COUNT(*) AS eligible_clicks, COUNT(r.id) AS converted_clicks,
        MAX(eligibility.value) AS closes_at
      FROM click_attributions ref JOIN json_each(ref.eligible_goals_json) eligibility
      LEFT JOIN conversion_receipts r ON r.goal_id = eligibility.key AND r.click_ref_hash = ref.ref_hash
      WHERE ref.created_at >= ? AND ref.created_at < ? GROUP BY eligibility.key
    )
    SELECT g.id AS goalId, g.name AS goalName, g.backup_archived_at IS NOT NULL AS archived,
      COALESCE(e.total, 0) AS total, COALESCE(e.attributed, 0) AS attributed,
      COALESCE(e.total - e.attributed, 0) AS unattributed, COALESCE(c.eligible_clicks, 0) AS eligibleClicks,
      CASE WHEN c.closes_at <= unixepoch() THEN 1.0 * c.converted_clicks / c.eligible_clicks END AS rate
    FROM conversion_goals g LEFT JOIN events e ON e.goal_id = g.id LEFT JOIN cohort c ON c.id = g.id
    WHERE g.backup_archived_at IS NULL OR e.goal_id IS NOT NULL OR c.id IS NOT NULL
    ORDER BY archived, g.name COLLATE NOCASE, g.id LIMIT 200`,
    )
    .bind(from, to, from, to)
    .all<{
      goalId: string;
      goalName: string;
      archived: number;
      total: number;
      attributed: number;
      unattributed: number;
      eligibleClicks: number;
      rate: number | null;
    }>();
  return results.map((row) => ({ ...row, archived: row.archived === 1 }));
}
