import { Parcel } from "../../models";

export interface IParcelRepository {
  findById(id: string): Promise<Parcel | null>;
  findByOwnerId(ownerId: string): Promise<Parcel[]>;
  findAtPosition(x: number, y: number): Promise<Parcel | null>;
  findInArea(x: number, y: number, radius: number): Promise<Parcel[]>;
  create(parcel: Omit<Parcel, "id">): Promise<Parcel>;
  update(id: string, data: Partial<Parcel>): Promise<Parcel | null>;
  delete(id: string): Promise<boolean>;
}
