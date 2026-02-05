import { Parcel } from "../../models";
import { IParcelRepository } from "../interfaces";
import { randomUUID } from "crypto";

export class MemoryParcelRepository implements IParcelRepository {
  private parcels: Map<string, Parcel> = new Map();

  async findById(id: string): Promise<Parcel | null> {
    return this.parcels.get(id) || null;
  }

  async findByOwnerId(ownerId: string): Promise<Parcel[]> {
    const result: Parcel[] = [];
    for (const parcel of this.parcels.values()) {
      if (parcel.ownerId === ownerId) {
        result.push(parcel);
      }
    }
    return result;
  }

  async findAtPosition(x: number, y: number): Promise<Parcel | null> {
    for (const parcel of this.parcels.values()) {
      if (parcel.x === x && parcel.y === y) {
        return parcel;
      }
    }
    return null;
  }

  async findInArea(x: number, y: number, radius: number): Promise<Parcel[]> {
    const result: Parcel[] = [];
    for (const parcel of this.parcels.values()) {
      const distance = Math.sqrt(
        Math.pow(parcel.x - x, 2) + Math.pow(parcel.y - y, 2)
      );
      if (distance <= radius) {
        result.push(parcel);
      }
    }
    return result;
  }

  async create(data: Omit<Parcel, "id">): Promise<Parcel> {
    const parcel: Parcel = {
      id: randomUUID(),
      ...data,
    };
    this.parcels.set(parcel.id, parcel);
    return parcel;
  }

  async update(id: string, data: Partial<Parcel>): Promise<Parcel | null> {
    const parcel = this.parcels.get(id);
    if (!parcel) return null;

    const updated = { ...parcel, ...data, id };
    this.parcels.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.parcels.delete(id);
  }
}
