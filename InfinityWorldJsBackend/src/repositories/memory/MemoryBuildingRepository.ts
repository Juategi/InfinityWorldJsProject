import { Building } from "../../models";
import { IBuildingRepository } from "../interfaces";
import { randomUUID } from "crypto";

export class MemoryBuildingRepository implements IBuildingRepository {
  private buildings: Map<string, Building> = new Map();

  async findById(id: string): Promise<Building | null> {
    return this.buildings.get(id) || null;
  }

  async findByParcelId(parcelId: string): Promise<Building[]> {
    const result: Building[] = [];
    for (const building of this.buildings.values()) {
      if (building.parcelId === parcelId) {
        result.push(building);
      }
    }
    return result;
  }

  async create(data: Omit<Building, "id" | "createdAt">): Promise<Building> {
    const building: Building = {
      id: randomUUID(),
      createdAt: new Date(),
      ...data,
    };
    this.buildings.set(building.id, building);
    return building;
  }

  async update(id: string, data: Partial<Building>): Promise<Building | null> {
    const building = this.buildings.get(id);
    if (!building) return null;

    const updated = { ...building, ...data, id };
    this.buildings.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.buildings.delete(id);
  }

  async deleteByParcelId(parcelId: string): Promise<number> {
    let count = 0;
    for (const [id, building] of this.buildings.entries()) {
      if (building.parcelId === parcelId) {
        this.buildings.delete(id);
        count++;
      }
    }
    return count;
  }
}
