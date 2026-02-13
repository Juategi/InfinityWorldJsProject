import { Router } from "express";
import { Repositories } from "../repositories/factory";
import { AppError } from "../middleware/errorHandler";

export function shopRoutes(repos: Repositories): Router {
  const router = Router();

  // POST /shop/buy - Comprar (desbloquear) un objeto del catálogo
  router.post("/buy", async (req, res, next) => {
    try {
      const { playerId, objectId } = req.body;

      if (!playerId || !objectId) {
        throw new AppError(400, "playerId and objectId are required");
      }

      // Verificar que el jugador existe
      const player = await repos.player.findById(playerId);
      if (!player) throw new AppError(404, "Player not found");

      // Verificar que el objeto existe en el catálogo
      const obj = await repos.placeableObject.findById(objectId);
      if (!obj) throw new AppError(404, "Object not found in catalog");

      // Verificar que no esté ya desbloqueado
      const alreadyOwned = await repos.playerInventory.hasObject(
        playerId,
        objectId
      );
      if (alreadyOwned) {
        throw new AppError(409, "Object already unlocked");
      }

      // Si es gratuito, desbloquear sin cobrar
      if (obj.isFree) {
        const inv = await repos.playerInventory.unlock(playerId, objectId);
        return res.status(201).json({ unlocked: inv });
      }

      // Verificar saldo
      if (player.coins < obj.price) {
        throw new AppError(400, "Not enough coins");
      }

      // Descontar monedas
      await repos.player.addCoins(playerId, -obj.price);

      // Desbloquear objeto
      const inv = await repos.playerInventory.unlock(playerId, objectId);

      res.status(201).json({
        unlocked: inv,
        coinsRemaining: player.coins - obj.price,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
