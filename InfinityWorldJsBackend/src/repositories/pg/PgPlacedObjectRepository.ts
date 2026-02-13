import { PlacedObject } from "../../models";
import { IPlacedObjectRepository } from "../interfaces";
import { query } from "../../db";

function rowToObj(row: {
  id: string;
  parcel_id: string;
  object_id: string;
  local_x: number;
  local_y: number;
}): PlacedObject {
  return {
    id: row.id,
    parcelId: row.parcel_id,
    objectId: row.object_id,
    localX: row.local_x,
    localY: row.local_y,
  };
}

const SELECT_COLS = "id, parcel_id, object_id, local_x, local_y";

export class PgPlacedObjectRepository implements IPlacedObjectRepository {
  async findById(id: string): Promise<PlacedObject | null> {
    const result = await query(
      `SELECT ${SELECT_COLS} FROM placed_objects WHERE id = $1`,
      [id]
    );
    return result.rows[0] ? rowToObj(result.rows[0]) : null;
  }

  async findByParcelId(parcelId: string): Promise<PlacedObject[]> {
    const result = await query(
      `SELECT ${SELECT_COLS} FROM placed_objects WHERE parcel_id = $1`,
      [parcelId]
    );
    return result.rows.map(rowToObj);
  }

  async create(data: Omit<PlacedObject, "id">): Promise<PlacedObject> {
    const result = await query(
      `INSERT INTO placed_objects (parcel_id, object_id, local_x, local_y)
       VALUES ($1, $2, $3, $4) RETURNING ${SELECT_COLS}`,
      [data.parcelId, data.objectId, data.localX, data.localY]
    );
    return rowToObj(result.rows[0]);
  }

  async update(
    id: string,
    data: Partial<PlacedObject>
  ): Promise<PlacedObject | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.parcelId !== undefined) {
      fields.push(`parcel_id = $${idx++}`);
      values.push(data.parcelId);
    }
    if (data.objectId !== undefined) {
      fields.push(`object_id = $${idx++}`);
      values.push(data.objectId);
    }
    if (data.localX !== undefined) {
      fields.push(`local_x = $${idx++}`);
      values.push(data.localX);
    }
    if (data.localY !== undefined) {
      fields.push(`local_y = $${idx++}`);
      values.push(data.localY);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const result = await query(
      `UPDATE placed_objects SET ${fields.join(", ")} WHERE id = $${idx} RETURNING ${SELECT_COLS}`,
      values
    );
    return result.rows[0] ? rowToObj(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await query("DELETE FROM placed_objects WHERE id = $1", [
      id,
    ]);
    return (result.rowCount ?? 0) > 0;
  }

  async deleteByParcelId(parcelId: string): Promise<number> {
    const result = await query(
      "DELETE FROM placed_objects WHERE parcel_id = $1",
      [parcelId]
    );
    return result.rowCount ?? 0;
  }
}
