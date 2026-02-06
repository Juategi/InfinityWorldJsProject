import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import express from "express";
import { config } from "dotenv";
import {
  MemoryPlayerRepository,
  MemoryParcelRepository,
  MemoryPlaceableObjectRepository,
  MemoryPlacedObjectRepository,
} from "./repositories";
import { seedWorld } from "./seed/seedParcels";
import { WORLD_CONFIG } from "./config/world";

config();

// Inicializar repositorios
export const playerRepository = new MemoryPlayerRepository();
export const parcelRepository = new MemoryParcelRepository();
export const placeableObjectRepository = new MemoryPlaceableObjectRepository();
export const placedObjectRepository = new MemoryPlacedObjectRepository();

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// API: Obtener parcelas en un área
app.get("/parcels", async (req, res) => {
  const x = Number(req.query.x) || 0;
  const y = Number(req.query.y) || 0;
  const radius = Number(req.query.radius) || 2;

  const parcels = await parcelRepository.findInArea(x, y, radius);
  res.json({ parcels, parcelSize: WORLD_CONFIG.PARCEL_SIZE });
});

const server = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server }),
});

// TODO: Register rooms here
// gameServer.define("world", WorldRoom);

async function start() {
  // Seed inicial del mundo
  await seedWorld(playerRepository, parcelRepository);

  await gameServer.listen(port);
  console.log(`🎮 Colyseus server running on http://localhost:${port}`);
}

start();
