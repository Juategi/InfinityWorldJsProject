import { PlayerInventory } from "../../models";
import { IPlayerInventoryRepository } from "../interfaces";
import { randomUUID } from "crypto";

export class MemoryPlayerInventoryRepository
  implements IPlayerInventoryRepository
{
  private items: Map<string, PlayerInventory> = new Map();

  private key(playerId: string, objectId: string): string {
    return `${playerId}:${objectId}`;
  }

  async findByPlayerId(playerId: string): Promise<PlayerInventory[]> {
    const result: PlayerInventory[] = [];
    for (const item of this.items.values()) {
      if (item.playerId === playerId) {
        result.push(item);
      }
    }
    return result;
  }

  async hasObject(playerId: string, objectId: string): Promise<boolean> {
    return this.items.has(this.key(playerId, objectId));
  }

  async unlock(playerId: string, objectId: string): Promise<PlayerInventory> {
    const k = this.key(playerId, objectId);
    const existing = this.items.get(k);
    if (existing) return existing;

    const item: PlayerInventory = {
      id: randomUUID(),
      playerId,
      objectId,
      unlockedAt: new Date(),
    };
    this.items.set(k, item);
    return item;
  }

  async remove(playerId: string, objectId: string): Promise<boolean> {
    return this.items.delete(this.key(playerId, objectId));
  }
}
