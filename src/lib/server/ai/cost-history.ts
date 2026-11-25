type AiCostDay = {
  date: string;
  settledMicrousd: number;
  pendingMicrousd: number;
  calls: number;
};

type AiCostHistory = {
  days: AiCostDay[];
  settledMicrousd: number;
  pendingMicrousd: number;
};

export async function getAiCostHistory(
  db: D1Database,
  now = new Date(),
): Promise<AiCostHistory | null> {
  const timestamp = Math.floor(now.getTime() / 1000);
  try {
    const { results } = await db
      .prepare(
        `SELECT date(started_at, 'unixepoch') AS date,
                COALESCE(SUM(cost_microusd) FILTER (
                  WHERE status IN ('succeeded', 'failed')
                ), 0) AS settledMicrousd,
                COALESCE(SUM(cost_microusd) FILTER (
                  WHERE status IN ('reserved', 'unknown_charge')
                ), 0) AS pendingMicrousd,
                COUNT(*) AS calls
         FROM ai_usage
         WHERE started_at >= unixepoch(?1, 'unixepoch', 'start of month')
           AND started_at <= ?1
         GROUP BY date`,
      )
      .bind(timestamp)
      .all<AiCostDay>();
    const byDate = new Map(results.map((day) => [day.date, day]));
    const month = now.toISOString().slice(0, 7);
    const days: AiCostDay[] = [];
    let settledMicrousd = 0;
    let pendingMicrousd = 0;

    for (let day = 1; day <= now.getUTCDate(); day++) {
      const date = `${month}-${String(day).padStart(2, '0')}`;
      const usage = byDate.get(date) ?? {
        date,
        settledMicrousd: 0,
        pendingMicrousd: 0,
        calls: 0,
      };
      days.push(usage);
      settledMicrousd += usage.settledMicrousd;
      pendingMicrousd += usage.pendingMicrousd;
    }

    return { days, settledMicrousd, pendingMicrousd };
  } catch {
    return null;
  }
}
