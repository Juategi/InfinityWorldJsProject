import { Player } from "../../models";
import { IPlayerRepository } from "../interfaces";
import { query } from "../../db";

const SELECT_COLS = "id, name, coins";

export class PgPlayerRepository implements IPlayerRepository {
  async findById(id: string): Promise<Player | null> {
    const result = await query(
      `SELECT ${SELECT_COLS} FROM players WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findAll(): Promise<Player[]> {
    const result = await query(`SELECT ${SELECT_COLS} FROM players ORDER BY name`);
    return result.rows;
  }

  async findByName(name: string): Promise<Player | null> {
    const result = await query(
      `SELECT ${SELECT_COLS} FROM players WHERE name = $1`,
      [name]
    );
    return result.rows[0] || null;
  }

  async create(data: Omit<Player, "id">): Promise<Player> {
    const result = await query(
      `INSERT INTO players (name, coins) VALUES ($1, $2) RETURNING ${SELECT_COLS}`,
      [data.name, data.coins]
    );
    return result.rows[0];
  }

  async update(id: string, data: Partial<Player>): Promise<Player | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.coins !== undefined) {
      fields.push(`coins = $${idx++}`);
      values.push(data.coins);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const result = await query(
      `UPDATE players SET ${fields.join(", ")} WHERE id = $${idx} RETURNING ${SELECT_COLS}`,
      values
    );
    return result.rows[0] || null;
  }

  async addCoins(id: string, amount: number): Promise<Player | null> {
    const result = await query(
      `UPDATE players SET coins = coins + $1 WHERE id = $2 AND coins + $1 >= 0 RETURNING ${SELECT_COLS}`,
      [amount, id]
    );
    return result.rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await query("DELETE FROM players WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
