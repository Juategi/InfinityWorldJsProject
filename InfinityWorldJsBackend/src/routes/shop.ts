import { Router } from "express";
import { z } from "zod";
import { Repositories } from "../repositories/factory";
import { AppError } from "../middleware/errorHandler";
import { requirePlayer, requireBodySelf } from "../middleware/requirePlayer";
import { validate, UUIDSchema } from "../middleware/validate";
import { buyLimiter } from "../middleware/rateLimiter";
import { withTransaction } from "../db";
import { logEconomyEvent } from "../services/economyLog";

const shopBuySchema = z.object({
  objectId: UUIDSchema,
});

export function shopRoutes(repos: Repositories): Router {
  const router = Router();

  const auth = requirePlayer(repos);
  const bodySelf = requireBodySelf();

  // POST /shop/buy - Comprar (desbloquear) un objeto del catálogo
  // Wrapped in a PostgreSQL transaction for atomicity
  router.post("/buy", buyLimiter, validate(shopBuySchema), auth, bodySelf, async (req, res, next) => {
    try {
      const playerId = req.playerId!;
      const { objectId } = req.body;

      // Verify catalog object exists (read-only, outside transaction)
      const obj = await repos.placeableObject.findById(objectId);
      if (!obj) throw new AppError(404, "Object not found in catalog");

      // Free objects don't need a transaction
      if (obj.isFree) {
        const alreadyOwned = await repos.playerInventory.hasObject(playerId, objectId);
        if (alreadyOwned) throw new AppError(409, "Object already unlocked");
        const inv = await repos.playerInventory.unlock(playerId, objectId);
        return res.status(201).json({ unlocked: inv });
      }

      const result = await withTransaction(async (client) => {
        // Lock player row
        const playerRes = await client.query(
          "SELECT id, name, coins FROM players WHERE id = $1 FOR UPDATE",
          [playerId]
        );
        const player = playerRes.rows[0];
        if (!player) throw new AppError(404, "Player not found");

        // Check if already unlocked
        const invCheck = await client.query(
          "SELECT 1 FROM player_inventory WHERE player_id = $1 AND object_id = $2",
          [playerId, objectId]
        );
        if (invCheck.rows.length > 0) {
          throw new AppError(409, "Object already unlocked");
        }

        // Check balance
        if (player.coins < obj.price) {
          throw new AppError(400, "Not enough coins");
        }

        // Deduct coins
        const coinRes = await client.query(
          "UPDATE players SET coins = coins - $1 WHERE id = $2 AND coins >= $1 RETURNING coins",
          [obj.price, playerId]
        );
        if (coinRes.rows.length === 0) {
          throw new AppError(400, "Not enough coins");
        }

        // Unlock object
        await client.query(
          "INSERT INTO player_inventory (player_id, object_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [playerId, objectId]
        );

        // Audit log
        await logEconomyEvent(client, {
          playerId,
          action: "buy_object",
          amount: obj.price,
          balanceBefore: player.coins,
          balanceAfter: coinRes.rows[0].coins,
          metadata: { objectId, objectName: obj.name },
          ipAddress: req.ip,
        });

        return { coinsRemaining: coinRes.rows[0].coins };
      });

      res.status(201).json({
        unlocked: { playerId, objectId },
        coinsRemaining: result.coinsRemaining,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
