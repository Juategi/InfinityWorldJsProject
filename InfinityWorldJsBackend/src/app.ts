import express from "express";
import { Repositories } from "./repositories/factory";
import { requestLogger, errorHandler, globalLimiter } from "./middleware";
import { playerRoutes, parcelRoutes, catalogRoutes, shopRoutes, adminRoutes } from "./routes";

/**
 * Build an Express app with the given repositories.
 * Used both by the main server and by tests.
 */
export function createApp(repos: Repositories): express.Express {
  const app = express();

  app.use(express.json());
  app.use(requestLogger);
  app.use(globalLimiter);

  app.use("/parcels", parcelRoutes(repos));
  app.use("/players", playerRoutes(repos));
  app.use("/catalog", catalogRoutes(repos));
  app.use("/shop", shopRoutes(repos));
  app.use("/admin", adminRoutes());
  app.use(errorHandler);

  return app;
}
