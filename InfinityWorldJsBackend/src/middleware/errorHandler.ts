import { Request, Response, NextFunction } from "express";
import { logger } from "../logger";

const isProd = process.env.NODE_ENV === "production";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    logger.warn({ statusCode: err.statusCode, message: err.message }, err.message);
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // In production: log full error internally but return generic message to client
  if (isProd) {
    logger.error({ err: err.message }, "Unhandled error");
    res.status(500).json({ error: "Internal server error" });
  } else {
    logger.error({ err }, "Unhandled error");
    res.status(500).json({ error: "Internal server error", detail: err.message });
  }
}
