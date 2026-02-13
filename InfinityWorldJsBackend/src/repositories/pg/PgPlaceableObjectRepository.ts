import { PlaceableObject } from "../../models";
import { IPlaceableObjectRepository } from "../interfaces";
import { query } from "../../db";

function rowToObj(row: {
  id: string;
  name: string;
  size_x: number;
  size_y: number;
  category: string | null;
  era: string | null;
  price: number;
  is_free: boolean;
  description: string | null;
}): PlaceableObject {
  return {
    id: row.id,
    name: row.name,
    sizeX: row.size_x,
    sizeY: row.size_y,
    category: row.category,
    era: row.era,
    price: row.price,
    isFree: row.is_free,
    description: row.description,
  };
}

const SELECT_COLS =
  "id, name, size_x, size_y, category, era, price, is_free, description";

export class PgPlaceableObjectRepository implements IPlaceableObjectRepository {
  async findById(id: string): Promise<PlaceableObject | null> {
    const result = await query(
      `SELECT ${SELECT_COLS} FROM placeable_objects WHERE id = $1`,
      [id]
    );
    return result.rows[0] ? rowToObj(result.rows[0]) : null;
  }

  async findByName(name: string): Promise<PlaceableObject | null> {
    const result = await query(
      `SELECT ${SELECT_COLS} FROM placeable_objects WHERE name = $1`,
      [name]
    );
    return result.rows[0] ? rowToObj(result.rows[0]) : null;
  }

  async findAll(): Promise<PlaceableObject[]> {
    const result = await query(
      `SELECT ${SELECT_COLS} FROM placeable_objects ORDER BY era, category, name`
    );
    return result.rows.map(rowToObj);
  }

  async findByEra(era: string): Promise<PlaceableObject[]> {
    const result = await query(
      `SELECT ${SELECT_COLS} FROM placeable_objects WHERE era = $1 ORDER BY category, name`,
      [era]
    );
    return result.rows.map(rowToObj);
  }

  async findByCategory(category: string): Promise<PlaceableObject[]> {
    const result = await query(
      `SELECT ${SELECT_COLS} FROM placeable_objects WHERE category = $1 ORDER BY era, name`,
      [category]
    );
    return result.rows.map(rowToObj);
  }

  async findFree(): Promise<PlaceableObject[]> {
    const result = await query(
      `SELECT ${SELECT_COLS} FROM placeable_objects WHERE is_free = true ORDER BY era, category, name`
    );
    return result.rows.map(rowToObj);
  }

  async create(data: Omit<PlaceableObject, "id">): Promise<PlaceableObject> {
    const result = await query(
      `INSERT INTO placeable_objects (name, size_x, size_y, category, era, price, is_free, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${SELECT_COLS}`,
      [
        data.name,
        data.sizeX,
        data.sizeY,
        data.category,
        data.era,
        data.price,
        data.isFree,
        data.description,
      ]
    );
    return rowToObj(result.rows[0]);
  }

  async update(
    id: string,
    data: Partial<PlaceableObject>
  ): Promise<PlaceableObject | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.sizeX !== undefined) {
      fields.push(`size_x = $${idx++}`);
      values.push(data.sizeX);
    }
    if (data.sizeY !== undefined) {
      fields.push(`size_y = $${idx++}`);
      values.push(data.sizeY);
    }
    if (data.category !== undefined) {
      fields.push(`category = $${idx++}`);
      values.push(data.category);
    }
    if (data.era !== undefined) {
      fields.push(`era = $${idx++}`);
      values.push(data.era);
    }
    if (data.price !== undefined) {
      fields.push(`price = $${idx++}`);
      values.push(data.price);
    }
    if (data.isFree !== undefined) {
      fields.push(`is_free = $${idx++}`);
      values.push(data.isFree);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(data.description);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const result = await query(
      `UPDATE placeable_objects SET ${fields.join(", ")} WHERE id = $${idx} RETURNING ${SELECT_COLS}`,
      values
    );
    return result.rows[0] ? rowToObj(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await query(
      "DELETE FROM placeable_objects WHERE id = $1",
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
