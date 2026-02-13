import { Player } from "../../models";

export interface IPlayerRepository {
  findById(id: string): Promise<Player | null>;
  findByName(name: string): Promise<Player | null>;
  findAll(): Promise<Player[]>;
  create(player: Omit<Player, "id">): Promise<Player>;
  update(id: string, data: Partial<Player>): Promise<Player | null>;
  addCoins(id: string, amount: number): Promise<Player | null>;
  delete(id: string): Promise<boolean>;
}
