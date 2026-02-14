import { Router } from "express";
import { z } from "zod";
import { AppError } from "../middleware/errorHandler";
import { validate, UUIDSchema } from "../middleware/validate";
import { getEconomyLog } from "../services/economyLog";

const logQuerySchema = z.object({
  playerId: UUIDSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Middleware: require X-Admin-Key header matching ADMIN_KEY env var.
 */
function requireAdmin(req: any, _res: any, next: any) {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return next(new AppError(503, "Admin access not configured"));
  }
  const provided = req.headers["x-admin-key"];
  if (provided !== adminKey) {
    return next(new AppError(403, "Forbidden"));
  }
  next();
}

export function adminRoutes(): Router {
  const router = Router();

  router.use(requireAdmin);

  // GET /admin/economy-log?playerId=...&limit=50&offset=0
  router.get("/economy-log", validate(logQuerySchema, "query"), async (req, res, next) => {
    try {
      const { playerId, limit, offset } = req.query as unknown as z.infer<typeof logQuerySchema>;
      const result = await getEconomyLog({ playerId, limit, offset });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
