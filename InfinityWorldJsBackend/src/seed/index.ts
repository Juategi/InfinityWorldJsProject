import { Repositories } from "../repositories/factory";
import { seedWorld } from "./seedParcels";
import { seedCatalog } from "./seedCatalog";

export async function runAllSeeds(repos: Repositories): Promise<void> {
  await seedWorld(repos.player, repos.parcel);
  await seedCatalog(repos.placeableObject, repos.playerInventory, repos.player);
}

export { seedWorld } from "./seedParcels";
export { seedCatalog } from "./seedCatalog";
