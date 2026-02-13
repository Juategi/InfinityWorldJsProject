import { Router } from "express";
import { Repositories } from "../repositories/factory";
import { AppError } from "../middleware/errorHandler";
import { WORLD_CONFIG } from "../config/world";
import {
  calculateParcelPrice,
  chebyshevDistance,
  MAX_BUY_DISTANCE,
} from "../config/parcels";

export function parcelRoutes(repos: Repositories): Router {
  const router = Router();

  // GET /parcels?x=0&y=0&radius=2
  // Obtener parcelas compradas en un área
  router.get("/", async (req, res, next) => {
    try {
      const x = Number(req.query.x) || 0;
      const y = Number(req.query.y) || 0;
      const radius = Math.min(Number(req.query.radius) || 2, 50); // max 50

      const parcels = await repos.parcel.findInArea(x, y, radius);
      res.json({ parcels, parcelSize: WORLD_CONFIG.PARCEL_SIZE });
    } catch (err) {
      next(err);
    }
  });

  // GET /parcels/price?x=0&y=0
  // Precio dinámico de una parcela por coordenadas
  router.get("/price", (req, res) => {
    const x = Number(req.query.x) || 0;
    const y = Number(req.query.y) || 0;
    res.json({ x, y, price: calculateParcelPrice(x, y) });
  });

  // GET /parcels/available?playerId=X
  // Posiciones donde el jugador puede comprar (dentro de su radio de proximidad)
  router.get("/available", async (req, res, next) => {
    try {
      const { playerId } = req.query;
      if (!playerId || typeof playerId !== "string") {
        throw new AppError(400, "playerId is required");
      }

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
              price: calculateParcelPrice(px, py),
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

  // POST /parcels/buy  { playerId, x, y }
  // Comprar una parcela con validación de proximidad y precio dinámico
  router.post("/buy", async (req, res, next) => {
    try {
      const { playerId, x, y } = req.body;

      if (!playerId || typeof x !== "number" || typeof y !== "number") {
        throw new AppError(400, "playerId, x, and y are required");
      }

      // Verificar que el jugador existe
      const player = await repos.player.findById(playerId);
      if (!player) throw new AppError(404, "Player not found");

      // Verificar que la parcela no tiene dueño
      const existing = await repos.parcel.findAtPosition(x, y);
      if (existing && existing.ownerId) {
        throw new AppError(409, "Parcel already owned");
      }

      // --- Restricción de proximidad (5B.2) ---
      const ownedParcels = await repos.parcel.findByOwnerId(playerId);

      if (ownedParcels.length === 0) {
        // Primera parcela: debe estar a ≤ MAX_BUY_DISTANCE del origen
        const distToOrigin = chebyshevDistance(x, y, 0, 0);
        if (distToOrigin > MAX_BUY_DISTANCE) {
          throw new AppError(
            400,
            `Tu primera parcela debe estar a máximo ${MAX_BUY_DISTANCE} parcelas del centro del mundo`
          );
        }
      } else {
        // Parcelas siguientes: debe estar a ≤ MAX_BUY_DISTANCE de alguna parcela propia
        const isNearOwned = ownedParcels.some(
          (p) => chebyshevDistance(x, y, p.x, p.y) <= MAX_BUY_DISTANCE
        );
        if (!isNearOwned) {
          throw new AppError(
            400,
            `Debes tener una parcela a máximo ${MAX_BUY_DISTANCE} parcelas de distancia para comprar aquí`
          );
        }
      }

      // --- Precio dinámico (5B.3) ---
      const price = calculateParcelPrice(x, y);

      if (player.coins < price) {
        throw new AppError(400, "Insufficient coins");
      }

      // Descontar monedas (atómico)
      const updated = await repos.player.addCoins(playerId, -price);
      if (!updated) throw new AppError(400, "Insufficient coins");

      // Crear o asignar parcela
      let parcel;
      if (existing) {
        parcel = await repos.parcel.update(existing.id, { ownerId: playerId });
      } else {
        parcel = await repos.parcel.create({ ownerId: playerId, x, y });
      }

      res.json({ parcel, coins: updated.coins, pricePaid: price });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
