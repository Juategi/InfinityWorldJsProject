import { PlayerInventory } from "../../models";
import { IPlayerInventoryRepository } from "../interfaces";
import { query } from "../../db";

function rowToItem(row: {
  id: string;
  player_id: string;
  object_id: string;
  unlocked_at: Date;
}): PlayerInventory {
  return {
    id: row.id,
    playerId: row.player_id,
    objectId: row.object_id,
    unlockedAt: row.unlocked_at,
  };
}

export class PgPlayerInventoryRepository
  implements IPlayerInventoryRepository
{
  async findByPlayerId(playerId: string): Promise<PlayerInventory[]> {
    const result = await query(
      "SELECT id, player_id, object_id, unlocked_at FROM player_inventory WHERE player_id = $1",
      [playerId]
    );
    return result.rows.map(rowToItem);
  }

  async hasObject(playerId: string, objectId: string): Promise<boolean> {
    const result = await query(
      "SELECT 1 FROM player_inventory WHERE player_id = $1 AND object_id = $2",
      [playerId, objectId]
    );
    return result.rows.length > 0;
  }

  async unlock(
    playerId: string,
    objectId: string
  ): Promise<PlayerInventory> {
    const result = await query(
      `INSERT INTO player_inventory (player_id, object_id)
       VALUES ($1, $2)
       ON CONFLICT (player_id, object_id) DO NOTHING
       RETURNING id, player_id, object_id, unlocked_at`,
      [playerId, objectId]
    );

    // If already existed (conflict), fetch it
    if (result.rows.length === 0) {
      const existing = await query(
        "SELECT id, player_id, object_id, unlocked_at FROM player_inventory WHERE player_id = $1 AND object_id = $2",
        [playerId, objectId]
      );
      return rowToItem(existing.rows[0]);
    }

    return rowToItem(result.rows[0]);
  }

  async remove(playerId: string, objectId: string): Promise<boolean> {
    const result = await query(
      "DELETE FROM player_inventory WHERE player_id = $1 AND object_id = $2",
      [playerId, objectId]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
