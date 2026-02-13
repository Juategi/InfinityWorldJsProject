import { Router } from "express";
import { Repositories } from "../repositories/factory";
import { AppError } from "../middleware/errorHandler";

export function playerRoutes(repos: Repositories): Router {
  const router = Router();

  // GET /players/:id/balance
  router.get("/:id/balance", async (req, res, next) => {
    try {
      const player = await repos.player.findById(req.params.id);
      if (!player) throw new AppError(404, "Player not found");
      res.json({ playerId: player.id, coins: player.coins });
    } catch (err) {
      next(err);
    }
  });

  // POST /players/:id/coins  { amount: number }
  router.post("/:id/coins", async (req, res, next) => {
    try {
      const { amount } = req.body;
      if (typeof amount !== "number" || amount === 0) {
        throw new AppError(400, "amount must be a non-zero number");
      }

      const player = await repos.player.findById(req.params.id);
      if (!player) throw new AppError(404, "Player not found");

      const updated = await repos.player.addCoins(req.params.id, amount);
      if (!updated) throw new AppError(400, "Insufficient coins");

      res.json({ playerId: updated.id, coins: updated.coins });
    } catch (err) {
      next(err);
    }
  });

  // GET /players/:id/inventory
  router.get("/:id/inventory", async (req, res, next) => {
    try {
      const player = await repos.player.findById(req.params.id);
      if (!player) throw new AppError(404, "Player not found");

      const inventory = await repos.playerInventory.findByPlayerId(req.params.id);
      res.json({ playerId: player.id, inventory });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
