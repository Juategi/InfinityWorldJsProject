import { PlayerInventory } from "../../models";

export interface IPlayerInventoryRepository {
  findByPlayerId(playerId: string): Promise<PlayerInventory[]>;
  hasObject(playerId: string, objectId: string): Promise<boolean>;
  unlock(playerId: string, objectId: string): Promise<PlayerInventory>;
  remove(playerId: string, objectId: string): Promise<boolean>;
}
