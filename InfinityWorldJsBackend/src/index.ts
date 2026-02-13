import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import express from "express";
import { config } from "dotenv";
import { checkConnection, closePool } from "./db";
import { connectRedis, checkRedisConnection, closeRedis } from "./redis";
import { createRepositories, Repositories } from "./repositories/factory";
import { runAllSeeds } from "./seed";
import { logger } from "./logger";
import { requestLogger, errorHandler } from "./middleware";
import { playerRoutes, parcelRoutes, catalogRoutes } from "./routes";

config();

// Repositorios se inicializan en start() según disponibilidad de BD
let repos: Repositories;

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(requestLogger);

// Health check
app.get("/health", async (_req, res) => {
  const dbOk = await checkConnection();
  const redisOk = await checkRedisConnection();
  const allOk = dbOk && redisOk;
  const status = allOk ? "ok" : "degraded";
  const code = allOk ? 200 : 503;
  res.status(code).json({
    status,
    db: dbOk ? "connected" : "disconnected",
    redis: redisOk ? "connected" : "disconnected",
  });
});

const server = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server }),
});

// TODO: Register rooms here
// gameServer.define("world", WorldRoom);

async function start() {
  // Verificar conexión a BD e inicializar repositorios
  const dbOk = await checkConnection();
  repos = createRepositories(dbOk);

  if (dbOk) {
    logger.info("PostgreSQL connected → using PG repositories");
  } else {
    logger.warn("PostgreSQL not available → using in-memory repositories");
  }

  // Conectar a Redis
  try {
    await connectRedis();
    logger.info("Redis connected");
  } catch {
    logger.warn("Redis not available");
  }

  // Registrar rutas de API (necesitan repos)
  app.use("/parcels", parcelRoutes(repos));
  app.use("/players", playerRoutes(repos));
  app.use("/catalog", catalogRoutes(repos));
  app.use(errorHandler);

  // Seeds iniciales (mundo + catálogo)
  await runAllSeeds(repos);

  await gameServer.listen(port);
  logger.info(`Colyseus server running on http://localhost:${port}`);
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("Shutting down...");
  await closeRedis();
  await closePool();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("Shutting down...");
  await closeRedis();
  await closePool();
  process.exit(0);
});

start();
