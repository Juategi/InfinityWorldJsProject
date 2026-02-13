import { IPlayerRepository } from "./interfaces/IPlayerRepository";
import { IParcelRepository } from "./interfaces/IParcelRepository";
import { IPlaceableObjectRepository } from "./interfaces/IPlaceableObjectRepository";
import { IPlacedObjectRepository } from "./interfaces/IPlacedObjectRepository";
import { IPlayerInventoryRepository } from "./interfaces/IPlayerInventoryRepository";
import { MemoryPlayerRepository } from "./memory/MemoryPlayerRepository";
import { MemoryParcelRepository } from "./memory/MemoryParcelRepository";
import { MemoryPlaceableObjectRepository } from "./memory/MemoryPlaceableObjectRepository";
import { MemoryPlacedObjectRepository } from "./memory/MemoryPlacedObjectRepository";
import { MemoryPlayerInventoryRepository } from "./memory/MemoryPlayerInventoryRepository";
import { PgPlayerRepository } from "./pg/PgPlayerRepository";
import { PgParcelRepository } from "./pg/PgParcelRepository";
import { PgPlaceableObjectRepository } from "./pg/PgPlaceableObjectRepository";
import { PgPlacedObjectRepository } from "./pg/PgPlacedObjectRepository";
import { PgPlayerInventoryRepository } from "./pg/PgPlayerInventoryRepository";

export interface Repositories {
  player: IPlayerRepository;
  parcel: IParcelRepository;
  placeableObject: IPlaceableObjectRepository;
  placedObject: IPlacedObjectRepository;
  playerInventory: IPlayerInventoryRepository;
}

export function createRepositories(usePg: boolean): Repositories {
  if (usePg) {
    return {
      player: new PgPlayerRepository(),
      parcel: new PgParcelRepository(),
      placeableObject: new PgPlaceableObjectRepository(),
      placedObject: new PgPlacedObjectRepository(),
      playerInventory: new PgPlayerInventoryRepository(),
    };
  }
  return {
    player: new MemoryPlayerRepository(),
    parcel: new MemoryParcelRepository(),
    placeableObject: new MemoryPlaceableObjectRepository(),
    placedObject: new MemoryPlacedObjectRepository(),
    playerInventory: new MemoryPlayerInventoryRepository(),
  };
}
