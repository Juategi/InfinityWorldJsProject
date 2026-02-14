import { Router } from "express";
import { z } from "zod";
import { Repositories } from "../repositories/factory";
import { AppError } from "../middleware/errorHandler";
import { requirePlayer, requireSelf } from "../middleware/requirePlayer";
import { validate, UUIDSchema } from "../middleware/validate";

const paramsIdSchema = z.object({ id: UUIDSchema });

export function playerRoutes(repos: Repositories): Router {
  const router = Router();

  const auth = requirePlayer(repos);
  const self = requireSelf();
  const vParams = validate(paramsIdSchema, "params");

  // GET /players/:id/balance
  router.get("/:id/balance", vParams, auth, self, async (req, res, next) => {
    try {
      const player = await repos.player.findById(req.playerId!);
      if (!player) throw new AppError(404, "Player not found");
      res.json({ playerId: player.id, coins: player.coins });
    } catch (err) {
      next(err);
    }
  });

  // POST /players/:id/coins — REMOVED (13.7)
  // Coins are only modified internally via purchase flows (shop/buy, parcels/buy).
  // No public endpoint for arbitrary coin manipulation.

  // GET /players/:id/inventory
  router.get("/:id/inventory", vParams, auth, self, async (req, res, next) => {
    try {
      const player = await repos.player.findById(req.playerId!);
      if (!player) throw new AppError(404, "Player not found");

      const inventory = await repos.playerInventory.findByPlayerId(req.playerId!);
      res.json({ playerId: player.id, inventory });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
