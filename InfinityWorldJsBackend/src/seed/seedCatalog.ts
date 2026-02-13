import { IPlaceableObjectRepository } from "../repositories/interfaces/IPlaceableObjectRepository";
import { IPlayerInventoryRepository } from "../repositories/interfaces/IPlayerInventoryRepository";
import { IPlayerRepository } from "../repositories/interfaces/IPlayerRepository";
import { CATALOG } from "./catalogData";

export async function seedCatalog(
  placeableObjectRepo: IPlaceableObjectRepository,
  playerInventoryRepo: IPlayerInventoryRepository,
  playerRepo: IPlayerRepository
): Promise<void> {
  let created = 0;
  let skipped = 0;

  for (const entry of CATALOG) {
    const existing = await placeableObjectRepo.findByName(entry.name);
    if (existing) {
      skipped++;
      continue;
    }
    await placeableObjectRepo.create(entry);
    created++;
  }

  console.log(
    `📦 Catalog seeded: ${created} created, ${skipped} already existed`
  );

  // Unlock free objects for all existing players
  const freeObjects = await placeableObjectRepo.findFree();

  if (freeObjects.length > 0) {
    const players = await playerRepo.findAll();
    let unlocked = 0;

    for (const player of players) {
      for (const obj of freeObjects) {
        const has = await playerInventoryRepo.hasObject(player.id, obj.id);
        if (!has) {
          await playerInventoryRepo.unlock(player.id, obj.id);
          unlocked++;
        }
      }
    }

    console.log(
      `🔓 Free objects: ${freeObjects.length} objects unlocked for ${players.length} players (${unlocked} new entries)`
    );
  }
}
