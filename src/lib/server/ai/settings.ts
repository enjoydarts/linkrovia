import { uuidV7 } from '../auth/crypto';

export const MAX_AI_MONTHLY_BUDGET_MICROUSD = 1_000_000_000;

export type AiSettings = {
  enabled: boolean;
  weeklyEnabled: boolean;
  monthlyBudgetMicrousd: number;
  revision: number;
};

export class AiSettingsConflictError extends Error {
  constructor() {
    super('AI settings changed');
  }
}

type SettingsRow = Omit<AiSettings, 'enabled' | 'weeklyEnabled'> & {
  enabled: 0 | 1;
  weeklyEnabled: 0 | 1;
};

const settingsColumns = `enabled, weekly_enabled AS weeklyEnabled,
                         monthly_budget_microusd AS monthlyBudgetMicrousd, revision`;

function settingsFromRow(row: SettingsRow | null): AiSettings {
  if (!row) throw new Error('AI settings unavailable');
  return {
    ...row,
    enabled: row.enabled === 1,
    weeklyEnabled: row.weeklyEnabled === 1,
  };
}

export async function getAiSettings(db: D1Database): Promise<AiSettings> {
  const row = await db
    .prepare(
      `SELECT ${settingsColumns}
       FROM ai_settings WHERE singleton = 1`,
    )
    .first<SettingsRow>();
  return settingsFromRow(row);
}

export async function setAiSettings(
  db: D1Database,
  {
    enabled,
    monthlyBudgetMicrousd,
    weeklyEnabled,
  }: Pick<AiSettings, 'enabled' | 'monthlyBudgetMicrousd'> &
    Partial<Pick<AiSettings, 'weeklyEnabled'>>,
  actorId?: string,
  expectedRevision?: number,
): Promise<AiSettings> {
  if (
    typeof enabled !== 'boolean' ||
    (weeklyEnabled !== undefined && typeof weeklyEnabled !== 'boolean') ||
    !Number.isSafeInteger(monthlyBudgetMicrousd) ||
    monthlyBudgetMicrousd < 0 ||
    monthlyBudgetMicrousd > MAX_AI_MONTHLY_BUDGET_MICROUSD
  ) {
    throw new RangeError('Invalid AI settings');
  }

  const update = db
    .prepare(
      `UPDATE ai_settings
       SET enabled = ?1, monthly_budget_microusd = ?2,
           weekly_enabled = COALESCE(?4, weekly_enabled),
           revision = revision + (enabled <> ?1 OR monthly_budget_microusd <> ?2
             OR weekly_enabled <> COALESCE(?4, weekly_enabled))
       WHERE singleton = 1 AND (?3 IS NULL OR revision = ?3)
       RETURNING ${settingsColumns}`,
    )
    .bind(
      Number(enabled),
      monthlyBudgetMicrousd,
      expectedRevision ?? null,
      weeklyEnabled === undefined ? null : Number(weeklyEnabled),
    );

  const [result] = await db.batch<SettingsRow>(
    actorId === undefined
      ? [update]
      : [
          update,
          db
            .prepare(
              `INSERT INTO audit_events (id, user_id, action, entity_type, metadata_json)
               SELECT ?, ?, 'ai.settings.updated', 'integration', ? WHERE changes() = 1`,
            )
            .bind(
              uuidV7(),
              actorId,
              JSON.stringify({ enabled, monthlyBudgetMicrousd, weeklyEnabled }),
            ),
        ],
  );
  const row = result.results[0] ?? null;
  if (!row && expectedRevision !== undefined)
    throw new AiSettingsConflictError();
  return settingsFromRow(row);
}
