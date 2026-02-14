import { createApp } from "../../src/app";
import { createRepositories, Repositories } from "../../src/repositories/factory";
import { Express } from "express";

/**
 * Create a test app with in-memory repositories and seed data.
 */
export async function createTestApp(): Promise<{
  app: Express;
  repos: Repositories;
  playerA: { id: string; name: string; coins: number };
  playerB: { id: string; name: string; coins: number };
  freeObject: { id: string };
  paidObject: { id: string };
}> {
  const repos = createRepositories(false); // in-memory
  const app = createApp(repos);

  // Seed two players
  const playerA = await repos.player.create({ name: "PlayerA", coins: 1000 });
  const playerB = await repos.player.create({ name: "PlayerB", coins: 500 });

  // Seed catalog objects
  const freeObject = await repos.placeableObject.create({
    name: "Free Tree",
    sizeX: 1,
    sizeY: 1,
    category: "nature",
    era: "medieval",
    price: 0,
    isFree: true,
    description: null,
  });

  const paidObject = await repos.placeableObject.create({
    name: "Paid Castle",
    sizeX: 3,
    sizeY: 3,
    category: "buildings",
    era: "medieval",
    price: 100,
    isFree: false,
    description: null,
  });

  return { app, repos, playerA, playerB, freeObject, paidObject };
}
