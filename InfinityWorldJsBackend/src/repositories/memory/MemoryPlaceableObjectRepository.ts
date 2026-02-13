import { PlaceableObject } from "../../models";
import { IPlaceableObjectRepository } from "../interfaces";
import { randomUUID } from "crypto";

export class MemoryPlaceableObjectRepository implements IPlaceableObjectRepository {
  private objects: Map<string, PlaceableObject> = new Map();

  async findById(id: string): Promise<PlaceableObject | null> {
    return this.objects.get(id) || null;
  }

  async findByName(name: string): Promise<PlaceableObject | null> {
    for (const obj of this.objects.values()) {
      if (obj.name === name) {
        return obj;
      }
    }
    return null;
  }

  async findAll(): Promise<PlaceableObject[]> {
    return Array.from(this.objects.values());
  }

  async findByEra(era: string): Promise<PlaceableObject[]> {
    return Array.from(this.objects.values()).filter((o) => o.era === era);
  }

  async findByCategory(category: string): Promise<PlaceableObject[]> {
    return Array.from(this.objects.values()).filter(
      (o) => o.category === category
    );
  }

  async findFree(): Promise<PlaceableObject[]> {
    return Array.from(this.objects.values()).filter((o) => o.isFree);
  }

  async create(data: Omit<PlaceableObject, "id">): Promise<PlaceableObject> {
    const obj: PlaceableObject = {
      id: randomUUID(),
      ...data,
    };
    this.objects.set(obj.id, obj);
    return obj;
  }

  async update(id: string, data: Partial<PlaceableObject>): Promise<PlaceableObject | null> {
    const obj = this.objects.get(id);
    if (!obj) return null;

    const updated = { ...obj, ...data, id };
    this.objects.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.objects.delete(id);
  }
}
