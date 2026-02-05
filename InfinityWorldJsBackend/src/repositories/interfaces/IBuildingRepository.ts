import { Building } from "../../models";

export interface IBuildingRepository {
  findById(id: string): Promise<Building | null>;
  findByParcelId(parcelId: string): Promise<Building[]>;
  create(building: Omit<Building, "id" | "createdAt">): Promise<Building>;
  update(id: string, data: Partial<Building>): Promise<Building | null>;
  delete(id: string): Promise<boolean>;
  deleteByParcelId(parcelId: string): Promise<number>;
}
