import { Player } from "../../models";
import { IPlayerRepository } from "../interfaces";
import { randomUUID } from "crypto";

export class MemoryPlayerRepository implements IPlayerRepository {
  private players: Map<string, Player> = new Map();

  async findById(id: string): Promise<Player | null> {
    return this.players.get(id) || null;
  }

  async findByUsername(username: string): Promise<Player | null> {
    for (const player of this.players.values()) {
      if (player.username === username) {
        return player;
      }
    }
    return null;
  }

  async create(data: Omit<Player, "id" | "createdAt">): Promise<Player> {
    const player: Player = {
      id: randomUUID(),
      createdAt: new Date(),
      ...data,
    };
    this.players.set(player.id, player);
    return player;
  }

  async update(id: string, data: Partial<Player>): Promise<Player | null> {
    const player = this.players.get(id);
    if (!player) return null;

    const updated = { ...player, ...data, id };
    this.players.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.players.delete(id);
  }
}
