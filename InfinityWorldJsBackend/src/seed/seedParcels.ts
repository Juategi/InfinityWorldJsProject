import { IParcelRepository, IPlayerRepository } from "../repositories/interfaces";
import { query } from "../db";
import {
  SYSTEM_PLAYER_ID,
  SYSTEM_PLAYER_NAME,
  SYSTEM_PARCELS,
} from "../config/system";

export async function seedWorld(
  playerRepo: IPlayerRepository,
  parcelRepo: IParcelRepository
): Promise<void> {
  // 1. Create system player "Infinity" with fixed UUID
  await query(
    `INSERT INTO players (id, name, coins) VALUES ($1, $2, 0) ON CONFLICT (id) DO NOTHING`,
    [SYSTEM_PLAYER_ID, SYSTEM_PLAYER_NAME]
  );

  // 2. Create system parcels (central city)
  let systemParcelsCreated = 0;
  for (const { x, y } of SYSTEM_PARCELS) {
    const existing = await parcelRepo.findAtPosition(x, y);
    if (!existing) {
      await query(
        `INSERT INTO parcels (owner_id, x, y) VALUES ($1, $2, $3) ON CONFLICT (x, y) DO NOTHING`,
        [SYSTEM_PLAYER_ID, x, y]
      );
      systemParcelsCreated++;
    }
  }
  console.log(
    `🏛️ System player "${SYSTEM_PLAYER_NAME}": ${SYSTEM_PARCELS.length} parcels (${systemParcelsCreated} new)`
  );

  // 3. Create test player (no parcels — must buy like any new player)
  let player = await playerRepo.findByName("Player1");
  if (!player) {
    player = await playerRepo.create({ name: "Player1", coins: 500 });
    console.log(`👤 Created player: ${player.name} (${player.id})`);
  }

  console.log(`🌍 World initialized`);
}
