import { Router } from "express";
import { z } from "zod";
import { Repositories } from "../repositories/factory";
import { AppError } from "../middleware/errorHandler";
import { validate, UUIDSchema, EraSchema, CategorySchema } from "../middleware/validate";

const catalogQuerySchema = z.object({
  era: EraSchema.optional(),
  category: CategorySchema.optional(),
  free: z.enum(["true", "false"]).optional(),
});

const catalogIdSchema = z.object({ id: UUIDSchema });

export function catalogRoutes(repos: Repositories): Router {
  const router = Router();

  // GET /catalog?era=medieval&category=buildings&free=true
  router.get("/", validate(catalogQuerySchema, "query"), async (req, res, next) => {
    try {
      const { era, category, free } = req.query as unknown as z.infer<typeof catalogQuerySchema>;

      let objects;
      if (era) {
        objects = await repos.placeableObject.findByEra(era);
      } else if (category) {
        objects = await repos.placeableObject.findByCategory(category);
      } else if (free === "true") {
        objects = await repos.placeableObject.findFree();
      } else {
        objects = await repos.placeableObject.findAll();
      }

      // Apply additional filters if combined
      if (era && category) {
        objects = objects.filter((o) => o.category === category);
      }
      if (free === "true" && (era || category)) {
        objects = objects.filter((o) => o.isFree);
      }
      if (free === "false") {
        objects = objects.filter((o) => !o.isFree);
      }

      res.json({ objects });
    } catch (err) {
      next(err);
    }
  });

  // GET /catalog/:id
  router.get("/:id", validate(catalogIdSchema, "params"), async (req, res, next) => {
    try {
      const obj = await repos.placeableObject.findById(req.params.id);
      if (!obj) throw new AppError(404, "Object not found");
      res.json(obj);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
