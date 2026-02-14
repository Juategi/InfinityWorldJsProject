import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { checkConnection, closePool } from "./db";
import { connectRedis, checkRedisConnection, closeRedis } from "./redis";
import { createRepositories, Repositories } from "./repositories/factory";
import { runAllSeeds } from "./seed";
import { logger } from "./logger";
import { requestLogger, errorHandler, globalLimiter } from "./middleware";
import { playerRoutes, parcelRoutes, catalogRoutes, shopRoutes, adminRoutes } from "./routes";
import { WorldRoom } from "./rooms/WorldRoom";

config();

// Repositorios se inicializan en start() según disponibilidad de BD
let repos: Repositories;

const app = express();
const port = Number(process.env.PORT) || 3000;

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(s => s.trim())
  : ["http://localhost:5173"];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Player-Id"],
  credentials: true,
}));

app.use(express.json());
app.use(requestLogger);
app.use(globalLimiter);

// Health check
app.get("/health", async (_req, res) => {
  const dbOk = await checkConnection();
  const redisOk = await checkRedisConnection();
  const allOk = dbOk && redisOk;
  const status = allOk ? "ok" : "degraded";
  const code = allOk ? 200 : 503;

  // In production: only expose status, no internal service names
  if (process.env.NODE_ENV === "production") {
    res.status(code).json({ status });
  } else {
    res.status(code).json({
      status,
      db: dbOk ? "connected" : "disconnected",
      redis: redisOk ? "connected" : "disconnected",
    });
  }
});

const server = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server }),
});

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
  app.use("/shop", shopRoutes(repos));
  app.use("/admin", adminRoutes());
  app.use(errorHandler);

  // Registrar room de Colyseus (necesita repos)
  gameServer.define("world", WorldRoom, { repos });

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
