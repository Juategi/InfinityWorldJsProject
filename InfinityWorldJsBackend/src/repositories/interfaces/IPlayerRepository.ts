import { Player } from "../../models";

export interface IPlayerRepository {
  findById(id: string): Promise<Player | null>;
  findByUsername(username: string): Promise<Player | null>;
  create(player: Omit<Player, "id" | "createdAt">): Promise<Player>;
  update(id: string, data: Partial<Player>): Promise<Player | null>;
  delete(id: string): Promise<boolean>;
}
