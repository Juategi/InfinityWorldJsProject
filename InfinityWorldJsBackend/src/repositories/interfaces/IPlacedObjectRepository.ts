import { PlacedObject } from "../../models";

export interface IPlacedObjectRepository {
  findById(id: string): Promise<PlacedObject | null>;
  findByParcelId(parcelId: string): Promise<PlacedObject[]>;
  create(obj: Omit<PlacedObject, "id">): Promise<PlacedObject>;
  update(id: string, data: Partial<PlacedObject>): Promise<PlacedObject | null>;
  delete(id: string): Promise<boolean>;
  deleteByParcelId(parcelId: string): Promise<number>;
}
