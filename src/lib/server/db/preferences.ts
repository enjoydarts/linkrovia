import { eq } from 'drizzle-orm';
import { resolveTimeZone } from '../../timezone/timezone';
import { getDb } from './client';
import { appSettings } from './schema';

export async function getEffectiveTimeZone(
  db: ReturnType<typeof getDb>,
  userTimeZone?: string | null,
) {
  const row = await db
    .select({ value: appSettings.jsonValue })
    .from(appSettings)
    .where(eq(appSettings.key, 'default_timezone'))
    .get();

  let defaultTimeZone: unknown;
  if (row) {
    try {
      defaultTimeZone = JSON.parse(row.value);
    } catch {
      defaultTimeZone = null;
    }
  }
  return resolveTimeZone(userTimeZone, defaultTimeZone);
}
