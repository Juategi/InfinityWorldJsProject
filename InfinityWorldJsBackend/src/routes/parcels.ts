import { Router } from "express";
import { z } from "zod";
import { Repositories } from "../repositories/factory";
import { AppError } from "../middleware/errorHandler";
import { requirePlayer, requireBodySelf } from "../middleware/requirePlayer";
import { validate, CoordinateSchema, UUIDSchema, RadiusSchema } from "../middleware/validate";
import { buyLimiter, readLimiter } from "../middleware/rateLimiter";
import { withTransaction } from "../db";
import { logEconomyEvent } from "../services/economyLog";
import { WORLD_CONFIG } from "../config/world";
import {
  PARCEL_PRICE,
  chebyshevDistance,
  MAX_BUY_DISTANCE,
} from "../config/parcels";
import { isSystemParcel } from "../config/system";

const parcelsQuerySchema = z.object({
  x: z.coerce.number().int().min(-1000000).max(1000000).default(0),
  y: z.coerce.number().int().min(-1000000).max(1000000).default(0),
  radius: z.coerce.number().int().min(1).max(50).default(2),
});

const priceQuerySchema = z.object({
  x: z.coerce.number().int().min(-1000000).max(1000000).default(0),
  y: z.coerce.number().int().min(-1000000).max(1000000).default(0),
});

const availableQuerySchema = z.object({
  playerId: UUIDSchema,
});

const buyBodySchema = z.object({
  x: CoordinateSchema,
  y: CoordinateSchema,
});

export function parcelRoutes(repos: Repositories): Router {
  const router = Router();

  const auth = requirePlayer(repos);
  const bodySelf = requireBodySelf();

  // GET /parcels?x=0&y=0&radius=2
  // Obtener parcelas compradas en un área
  router.get("/", validate(parcelsQuerySchema, "query"), async (req, res, next) => {
    try {
      const { x, y, radius } = req.query as unknown as z.infer<typeof parcelsQuerySchema>;

      const parcels = await repos.parcel.findInArea(x, y, radius);
      res.json({ parcels, parcelSize: WORLD_CONFIG.PARCEL_SIZE });
    } catch (err) {
      next(err);
    }
  });

  // GET /parcels/price?x=0&y=0
  // Precio fijo de una parcela
  router.get("/price", validate(priceQuerySchema, "query"), (req, res) => {
    const { x, y } = req.query as unknown as z.infer<typeof priceQuerySchema>;
    res.json({ x, y, price: PARCEL_PRICE });
  });

  // GET /parcels/available?playerId=X
  // Posiciones donde el jugador puede comprar (dentro de su radio de proximidad)
  router.get("/available", readLimiter, validate(availableQuerySchema, "query"), async (req, res, next) => {
    try {
      const { playerId } = req.query as unknown as z.infer<typeof availableQuerySchema>;

      // Obtener parcelas del jugador
      const ownedParcels = await repos.parcel.findByOwnerId(playerId);

      // Determinar centros de expansión
      const centers =
        ownedParcels.length > 0
          ? ownedParcels.map((p) => ({ x: p.x, y: p.y }))
          : [{ x: 0, y: 0 }]; // Si no tiene parcelas, usa el origen

      // Generar posiciones disponibles dentro del radio de compra
      // Limitamos a un radio razonable para no generar demasiadas
      const displayRadius = Math.min(MAX_BUY_DISTANCE, 10); // Solo las 10 más cercanas visualmente
      const available: Array<{ x: number; y: number; price: number; dist: number }> = [];
      const seen = new Set<string>();

      // Marcar parcelas ya compradas por cualquiera
      const ownedSet = new Set<string>();
      for (const center of centers) {
        const nearby = await repos.parcel.findInArea(
          center.x,
          center.y,
          displayRadius + 1
        );
        for (const p of nearby) {
          if (p.ownerId) {
            ownedSet.add(`${p.x}:${p.y}`);
          }
        }
      }

      for (const center of centers) {
        for (let dx = -displayRadius; dx <= displayRadius; dx++) {
          for (let dy = -displayRadius; dy <= displayRadius; dy++) {
            const px = center.x + dx;
            const py = center.y + dy;
            const key = `${px}:${py}`;

            if (seen.has(key) || ownedSet.has(key)) continue;
            seen.add(key);

            // Verificar que está dentro del radio de compra respecto a este centro
            const dist = chebyshevDistance(px, py, center.x, center.y);
            if (dist > MAX_BUY_DISTANCE || dist === 0) continue;

            available.push({
              x: px,
              y: py,
              price: PARCEL_PRICE,
              dist,
            });
          }
        }
      }

      // Ordenar por distancia al centro más cercano
      available.sort((a, b) => a.dist - b.dist);

      res.json({
        available: available.slice(0, 100), // Máximo 100 resultados
        ownedCount: ownedParcels.length,
        maxBuyDistance: MAX_BUY_DISTANCE,
      });
    } catch (err) {
      next(err);
    }
  });

  // POST /parcels/buy  { x, y }
  // Comprar una parcela con validación de proximidad y precio dinámico
  // Wrapped in a PostgreSQL transaction for atomicity
  router.post("/buy", buyLimiter, validate(buyBodySchema), auth, bodySelf, async (req, res, next) => {
    try {
      const playerId = req.playerId!;
      const { x, y } = req.body;

      // Block system parcels from purchase
      if (isSystemParcel(x, y)) {
        throw new AppError(403, "System parcels cannot be purchased");
      }

      const price = PARCEL_PRICE;

      const result = await withTransaction(async (client) => {
        // Lock player row to prevent race conditions
        const playerRes = await client.query(
          "SELECT id, name, coins FROM players WHERE id = $1 FOR UPDATE",
          [playerId]
        );
        const player = playerRes.rows[0];
        if (!player) throw new AppError(404, "Player not found");

        // Verify parcel not already owned
        const parcelRes = await client.query(
          "SELECT id, owner_id FROM parcels WHERE x = $1 AND y = $2",
          [x, y]
        );
        const existing = parcelRes.rows[0];
        if (existing && existing.owner_id) {
          throw new AppError(409, "Parcel already owned");
        }

        // Proximity check
        const ownedRes = await client.query(
          "SELECT x, y FROM parcels WHERE owner_id = $1",
          [playerId]
        );
        const ownedParcels = ownedRes.rows;

        if (ownedParcels.length === 0) {
          const distToOrigin = chebyshevDistance(x, y, 0, 0);
          if (distToOrigin > MAX_BUY_DISTANCE) {
            throw new AppError(400, `First parcel must be within ${MAX_BUY_DISTANCE} of world center`);
          }
        } else {
          const isNearOwned = ownedParcels.some(
            (p: { x: number; y: number }) => chebyshevDistance(x, y, p.x, p.y) <= MAX_BUY_DISTANCE
          );
          if (!isNearOwned) {
            throw new AppError(400, `Must own a parcel within ${MAX_BUY_DISTANCE} distance to buy here`);
          }
        }

        // Check balance
        if (player.coins < price) {
          throw new AppError(400, "Insufficient coins");
        }

        // Deduct coins (with safety check)
        const coinRes = await client.query(
          "UPDATE players SET coins = coins - $1 WHERE id = $2 AND coins >= $1 RETURNING id, name, coins",
          [price, playerId]
        );
        if (coinRes.rows.length === 0) {
          throw new AppError(400, "Insufficient coins");
        }

        // Create or assign parcel
        let parcel;
        if (existing) {
          const upd = await client.query(
            "UPDATE parcels SET owner_id = $1 WHERE id = $2 RETURNING id, owner_id, x, y",
            [playerId, existing.id]
          );
          parcel = upd.rows[0];
        } else {
          const ins = await client.query(
            "INSERT INTO parcels (owner_id, x, y) VALUES ($1, $2, $3) RETURNING id, owner_id, x, y",
            [playerId, x, y]
          );
          parcel = ins.rows[0];
        }

        // Audit log
        await logEconomyEvent(client, {
          playerId,
          action: "buy_parcel",
          amount: price,
          balanceBefore: player.coins,
          balanceAfter: coinRes.rows[0].coins,
          metadata: { parcelX: x, parcelY: y, parcelId: parcel.id },
          ipAddress: req.ip,
        });

        return { parcel, coins: coinRes.rows[0].coins, pricePaid: price };
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
