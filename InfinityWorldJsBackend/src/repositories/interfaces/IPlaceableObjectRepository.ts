import { PlaceableObject } from "../../models";

export interface IPlaceableObjectRepository {
  findById(id: string): Promise<PlaceableObject | null>;
  findByName(name: string): Promise<PlaceableObject | null>;
  findAll(): Promise<PlaceableObject[]>;
  findByEra(era: string): Promise<PlaceableObject[]>;
  findByCategory(category: string): Promise<PlaceableObject[]>;
  findFree(): Promise<PlaceableObject[]>;
  create(obj: Omit<PlaceableObject, "id">): Promise<PlaceableObject>;
  update(id: string, data: Partial<PlaceableObject>): Promise<PlaceableObject | null>;
  delete(id: string): Promise<boolean>;
}
