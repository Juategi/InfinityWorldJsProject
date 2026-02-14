import { Request, Response, NextFunction } from "express";
import { z } from "zod";

// --- Reusable Schemas ---

export const UUIDSchema = z
  .string()
  .uuid("Must be a valid UUID");

export const CoordinateSchema = z
  .number({ message: "Must be a number" })
  .int("Must be an integer")
  .min(-1000000, "Coordinate out of range")
  .max(1000000, "Coordinate out of range");

export const RadiusSchema = z
  .number({ message: "Must be a number" })
  .int("Must be an integer")
  .min(1, "Radius must be at least 1")
  .max(50, "Radius cannot exceed 50");

const VALID_ERAS = ["medieval", "colonial", "industrial", "moderno", "futurista"] as const;
const VALID_CATEGORIES = ["buildings", "decor", "nature"] as const;

export const EraSchema = z.enum(VALID_ERAS, {
  message: `Must be one of: ${VALID_ERAS.join(", ")}`,
});

export const CategorySchema = z.enum(VALID_CATEGORIES, {
  message: `Must be one of: ${VALID_CATEGORIES.join(", ")}`,
});

// --- Validation Middleware ---

type ValidateTarget = "body" | "query" | "params";

/**
 * Generic middleware that validates request data against a Zod schema.
 * On success, replaces req[target] with the parsed (clean) data.
 * On failure, responds with 400 and descriptive error messages.
 */
export function validate(schema: z.ZodType, target: ValidateTarget = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const errors = formatZodError(result.error);
      _res.status(400).json({ error: "Validation failed", details: errors });
      return;
    }

    // Replace with parsed data (stripped of extra fields, coerced types)
    (req as unknown as Record<string, unknown>)[target] = result.data;
    next();
  };
}

function formatZodError(error: z.ZodError): string[] {
  return error.issues.map((e) => {
    const path = e.path.length > 0 ? `${e.path.join(".")}: ` : "";
    return `${path}${e.message}`;
  });
}
