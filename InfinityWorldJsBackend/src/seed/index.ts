import { Repositories } from "../repositories/factory";
import { seedWorld } from "./seedParcels";
import { seedCatalog } from "./seedCatalog";
import { seedCity } from "./seedCity";

export async function runAllSeeds(repos: Repositories): Promise<void> {
  await seedWorld(repos.player, repos.parcel);
  await seedCatalog(repos.placeableObject, repos.playerInventory, repos.player);
  await seedCity(repos);
}

export { seedWorld } from "./seedParcels";
export { seedCatalog } from "./seedCatalog";
export { seedCity } from "./seedCity";
