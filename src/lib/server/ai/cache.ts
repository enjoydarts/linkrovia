import { encode, hex, sha256 } from '../auth/crypto';
import type { AiFeature } from './budget';

const MAX_CACHE_ROWS = 128;
const MAX_CACHE_BYTES = 16_384;
const DAY_MS = 86_400_000;
const TTL_DAYS: Record<AiFeature, number> = { 'smart-create': 30, insights: 7 };

type AiCacheKey = {
  feature: AiFeature;
  inputHash: string;
  provider: string;
  model: string;
  version: string;
  locale: string;
  scope: string;
};

export async function makeAiCacheKey(key: AiCacheKey): Promise<string> {
  return hex(
    await sha256(
      JSON.stringify([
        key.feature,
        key.inputHash,
        key.provider,
        key.model,
        key.version,
        key.locale,
        key.scope,
      ]),
    ),
  );
}

export async function getAiCache<T>(
  db: D1Database,
  key: string,
  now = new Date(),
): Promise<{ value: T; createdAt: number } | null> {
  const row = await db
    .prepare(
      'SELECT result_json, created_at FROM ai_cache WHERE cache_key = ? AND expires_at > ?',
    )
    .bind(key, now.getTime())
    .first<{ result_json: string; created_at: number }>();
  return row
    ? { value: JSON.parse(row.result_json) as T, createdAt: row.created_at }
    : null;
}

export async function putAiCache(
  db: D1Database,
  key: string,
  feature: AiFeature,
  value: unknown,
  now = new Date(),
): Promise<void> {
  const result = JSON.stringify(value);
  if (
    result === undefined ||
    encode.encode(result).byteLength > MAX_CACHE_BYTES
  ) {
    throw new RangeError('Invalid AI cache payload');
  }

  const createdAt = now.getTime();
  await db.batch([
    db.prepare('DELETE FROM ai_cache WHERE expires_at <= ?').bind(createdAt),
    db
      .prepare(
        `INSERT INTO ai_cache (cache_key, result_json, created_at, expires_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(cache_key) DO UPDATE SET
           result_json = excluded.result_json, created_at = excluded.created_at,
           expires_at = excluded.expires_at
         WHERE excluded.created_at >= ai_cache.created_at`,
      )
      .bind(key, result, createdAt, createdAt + TTL_DAYS[feature] * DAY_MS),
    db
      .prepare(
        `DELETE FROM ai_cache WHERE cache_key IN (
           SELECT cache_key FROM ai_cache ORDER BY created_at DESC, cache_key DESC
           LIMIT -1 OFFSET ?
         )`,
      )
      .bind(MAX_CACHE_ROWS),
  ]);
}
