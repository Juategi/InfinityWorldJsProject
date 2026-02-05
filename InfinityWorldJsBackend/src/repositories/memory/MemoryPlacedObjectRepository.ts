import { PlacedObject } from "../../models";
import { IPlacedObjectRepository } from "../interfaces";
import { randomUUID } from "crypto";

export class MemoryPlacedObjectRepository implements IPlacedObjectRepository {
  private objects: Map<string, PlacedObject> = new Map();

  async findById(id: string): Promise<PlacedObject | null> {
    return this.objects.get(id) || null;
  }

  async findByParcelId(parcelId: string): Promise<PlacedObject[]> {
    const result: PlacedObject[] = [];
    for (const obj of this.objects.values()) {
      if (obj.parcelId === parcelId) {
        result.push(obj);
      }
    }
    return result;
  }

  async create(data: Omit<PlacedObject, "id">): Promise<PlacedObject> {
    const obj: PlacedObject = {
      id: randomUUID(),
      ...data,
    };
    this.objects.set(obj.id, obj);
    return obj;
  }

  async update(id: string, data: Partial<PlacedObject>): Promise<PlacedObject | null> {
    const obj = this.objects.get(id);
    if (!obj) return null;

    const updated = { ...obj, ...data, id };
    this.objects.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.objects.delete(id);
  }

  async deleteByParcelId(parcelId: string): Promise<number> {
    let count = 0;
    for (const [id, obj] of this.objects.entries()) {
      if (obj.parcelId === parcelId) {
        this.objects.delete(id);
        count++;
      }
    }
    return count;
  }
}
