import { Router } from "express";
import { Repositories } from "../repositories/factory";
import { AppError } from "../middleware/errorHandler";
import { WORLD_CONFIG } from "../config/world";

export function parcelRoutes(repos: Repositories): Router {
  const router = Router();

  // GET /parcels?x=0&y=0&radius=2
  router.get("/", async (req, res, next) => {
    try {
      const x = Number(req.query.x) || 0;
      const y = Number(req.query.y) || 0;
      const radius = Number(req.query.radius) || 2;

      const parcels = await repos.parcel.findInArea(x, y, radius);
      res.json({ parcels, parcelSize: WORLD_CONFIG.PARCEL_SIZE });
    } catch (err) {
      next(err);
    }
  });

  // GET /parcels/price
  router.get("/price", (_req, res) => {
    res.json({ price: WORLD_CONFIG.PARCEL_PRICE });
  });

  // POST /parcels/buy  { playerId, x, y }
  router.post("/buy", async (req, res, next) => {
    try {
      const { playerId, x, y } = req.body;

      if (!playerId || typeof x !== "number" || typeof y !== "number") {
        throw new AppError(400, "playerId, x, and y are required");
      }

      // Check player exists
      const player = await repos.player.findById(playerId);
      if (!player) throw new AppError(404, "Player not found");

      // Check parcel is free
      const existing = await repos.parcel.findAtPosition(x, y);
      if (existing && existing.ownerId) {
        throw new AppError(409, "Parcel already owned");
      }

      // Check sufficient coins
      const price = WORLD_CONFIG.PARCEL_PRICE;
      if (player.coins < price) {
        throw new AppError(400, "Insufficient coins");
      }

      // Deduct coins (atomic)
      const updated = await repos.player.addCoins(playerId, -price);
      if (!updated) throw new AppError(400, "Insufficient coins");

      // Create or assign parcel
      let parcel;
      if (existing) {
        parcel = await repos.parcel.update(existing.id, { ownerId: playerId });
      } else {
        parcel = await repos.parcel.create({ ownerId: playerId, x, y });
      }

      res.json({ parcel, coins: updated.coins });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
