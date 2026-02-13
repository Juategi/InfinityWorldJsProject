import { Parcel } from "../../models";
import { IParcelRepository } from "../interfaces";
import { query } from "../../db";

function rowToParcel(row: {
  id: string;
  owner_id: string | null;
  x: number;
  y: number;
}): Parcel {
  return { id: row.id, ownerId: row.owner_id, x: row.x, y: row.y };
}

const SELECT_COLS = "id, owner_id, x, y";

export class PgParcelRepository implements IParcelRepository {
  async findById(id: string): Promise<Parcel | null> {
    const result = await query(
      `SELECT ${SELECT_COLS} FROM parcels WHERE id = $1`,
      [id]
    );
    return result.rows[0] ? rowToParcel(result.rows[0]) : null;
  }

  async findByOwnerId(ownerId: string): Promise<Parcel[]> {
    const result = await query(
      `SELECT ${SELECT_COLS} FROM parcels WHERE owner_id = $1`,
      [ownerId]
    );
    return result.rows.map(rowToParcel);
  }

  async findAtPosition(x: number, y: number): Promise<Parcel | null> {
    const result = await query(
      `SELECT ${SELECT_COLS} FROM parcels WHERE x = $1 AND y = $2`,
      [x, y]
    );
    return result.rows[0] ? rowToParcel(result.rows[0]) : null;
  }

  async findInArea(x: number, y: number, radius: number): Promise<Parcel[]> {
    // Uses PostGIS ST_DWithin on the GiST-indexed geom column
    const result = await query(
      `SELECT ${SELECT_COLS} FROM parcels
       WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326), $3)`,
      [x, y, radius]
    );
    return result.rows.map(rowToParcel);
  }

  async create(data: Omit<Parcel, "id">): Promise<Parcel> {
    const result = await query(
      `INSERT INTO parcels (owner_id, x, y) VALUES ($1, $2, $3) RETURNING ${SELECT_COLS}`,
      [data.ownerId, data.x, data.y]
    );
    return rowToParcel(result.rows[0]);
  }

  async update(id: string, data: Partial<Parcel>): Promise<Parcel | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.ownerId !== undefined) {
      fields.push(`owner_id = $${idx++}`);
      values.push(data.ownerId);
    }
    if (data.x !== undefined) {
      fields.push(`x = $${idx++}`);
      values.push(data.x);
    }
    if (data.y !== undefined) {
      fields.push(`y = $${idx++}`);
      values.push(data.y);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const result = await query(
      `UPDATE parcels SET ${fields.join(", ")} WHERE id = $${idx} RETURNING ${SELECT_COLS}`,
      values
    );
    return result.rows[0] ? rowToParcel(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await query("DELETE FROM parcels WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
