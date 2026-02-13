import { Player } from "../../models";
import { IPlayerRepository } from "../interfaces";
import { randomUUID } from "crypto";

export class MemoryPlayerRepository implements IPlayerRepository {
  private players: Map<string, Player> = new Map();

  async findById(id: string): Promise<Player | null> {
    return this.players.get(id) || null;
  }

  async findAll(): Promise<Player[]> {
    return Array.from(this.players.values());
  }

  async findByName(name: string): Promise<Player | null> {
    for (const player of this.players.values()) {
      if (player.name === name) {
        return player;
      }
    }
    return null;
  }

  async create(data: Omit<Player, "id">): Promise<Player> {
    const player: Player = {
      id: randomUUID(),
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

  async addCoins(id: string, amount: number): Promise<Player | null> {
    const player = this.players.get(id);
    if (!player) return null;
    const newCoins = player.coins + amount;
    if (newCoins < 0) return null;
    const updated = { ...player, coins: newCoins };
    this.players.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.players.delete(id);
  }
}
