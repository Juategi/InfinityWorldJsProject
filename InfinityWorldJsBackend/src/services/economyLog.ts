import { PoolClient } from "pg";
import { query } from "../db";

export type EconomyAction = "buy_parcel" | "buy_object" | "earn_coins" | "spend_coins";

interface LogEntry {
  playerId: string;
  action: EconomyAction;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Record an economy event inside an existing transaction.
 */
export async function logEconomyEvent(client: PoolClient, entry: LogEntry): Promise<void> {
  await client.query(
    `INSERT INTO economy_log (player_id, action, amount, balance_before, balance_after, metadata, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      entry.playerId,
      entry.action,
      entry.amount,
      entry.balanceBefore,
      entry.balanceAfter,
      JSON.stringify(entry.metadata ?? {}),
      entry.ipAddress ?? null,
    ]
  );
}

/**
 * Query economy log entries (for admin endpoint).
 */
export async function getEconomyLog(options: {
  playerId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ entries: unknown[]; total: number }> {
  const { playerId, limit = 50, offset = 0 } = options;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (playerId) {
    params.push(playerId);
    conditions.push(`player_id = $${params.length}`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRes = await query(`SELECT COUNT(*) FROM economy_log ${where}`, params);
  const total = parseInt(countRes.rows[0].count, 10);

  const dataParams = [...params, limit, offset];
  const dataRes = await query(
    `SELECT id, player_id, action, amount, balance_before, balance_after, metadata, ip_address, created_at
     FROM economy_log ${where}
     ORDER BY created_at DESC
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return { entries: dataRes.rows, total };
}
