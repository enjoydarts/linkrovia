import { uuidV7 } from '../auth/crypto';
import { normalizeHostname } from '../security/url-policy';

const fields = `id, hostname, is_primary AS isPrimary, connection_status AS status,
  connection_version AS version, provider_mode AS providerMode, verified_at AS verifiedAt`;

export type DomainConnection = {
  id: string;
  hostname: string;
  isPrimary: number;
  status: string;
  version: number;
  providerMode: string;
  verifiedAt: number | null;
};

export function domainHostname(value: unknown) {
  if (typeof value !== 'string' || value.includes(':')) return null;
  const hostname = normalizeHostname(value.trim());
  if (
    !hostname ||
    hostname === 'workers.dev' ||
    hostname.endsWith('.workers.dev')
  )
    return null;
  return hostname;
}

export function readDomainConnection(db: D1Database, id: string) {
  return db
    .prepare(
      `SELECT ${fields} FROM domains WHERE id = ? AND backup_archived_at IS NULL`,
    )
    .bind(id)
    .first<DomainConnection>();
}

export function managementHostname(db: D1Database) {
  return db
    .prepare('SELECT hostname FROM domains WHERE is_primary = 1')
    .first<string>('hostname');
}

export async function setDomainConnection(
  db: D1Database,
  domain: DomainConnection,
  actorId: string,
  operation: 'verify' | 'disconnect',
  operationKey: string,
) {
  const publish = operation === 'verify';
  const [updated] = await db.batch<{ id: string }>([
    db
      .prepare(
        `UPDATE domains SET connection_version = connection_version + 1,
      connection_status = ?, is_active = ?, last_checked_at = unixepoch(), updated_at = unixepoch(),
      verified_at = CASE WHEN ? THEN unixepoch() ELSE NULL END,
      provider_mode = CASE WHEN ? THEN 'cloudflare_custom_domain' ELSE provider_mode END,
      connection_error_code = NULL
      WHERE id = ? AND hostname = ? AND connection_version = ? AND is_primary = 0
        AND backup_archived_at IS NULL
      RETURNING id`,
      )
      .bind(
        publish ? 'active' : 'disconnected',
        Number(publish),
        Number(publish),
        Number(publish),
        domain.id,
        domain.hostname,
        domain.version,
      ),
    db
      .prepare(
        `INSERT INTO domain_connection_operations
      (id, domain_id, operation_type, status, attempt, idempotency_key, actor_id, finished_at)
      SELECT ?, ?, ?, 'succeeded', 1, ?, ?, unixepoch() WHERE changes() = 1`,
      )
      .bind(uuidV7(), domain.id, operation, operationKey, actorId),
  ]);
  return updated.results.length === 1;
}
