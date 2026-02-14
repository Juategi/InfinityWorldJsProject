import { Request, Response, NextFunction } from "express";
import { Repositories } from "../repositories/factory";
import { AppError } from "./errorHandler";

// Extend Express Request to include authenticated playerId
declare global {
  namespace Express {
    interface Request {
      playerId?: string;
    }
  }
}

/**
 * Middleware that extracts playerId from X-Player-Id header,
 * validates the player exists, and injects req.playerId.
 * Returns 401 if missing or invalid.
 */
export function requirePlayer(repos: Repositories) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const playerId = req.headers["x-player-id"] as string | undefined;

    if (!playerId) {
      return next(new AppError(401, "Authentication required: X-Player-Id header missing"));
    }

    try {
      const player = await repos.player.findById(playerId);
      if (!player) {
        return next(new AppError(401, "Invalid player ID"));
      }

      req.playerId = playerId;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Middleware that verifies req.params.id matches the authenticated req.playerId.
 * Must be used AFTER requirePlayer.
 * Returns 403 if the player tries to act on behalf of another.
 */
export function requireSelf() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.params.id && req.params.id !== req.playerId) {
      return next(new AppError(403, "Cannot act on behalf of another player"));
    }
    next();
  };
}

/**
 * Middleware that verifies req.body.playerId matches the authenticated req.playerId.
 * Must be used AFTER requirePlayer.
 * Returns 403 if the body playerId doesn't match the authenticated player.
 */
export function requireBodySelf() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.body?.playerId && req.body.playerId !== req.playerId) {
      return next(new AppError(403, "Cannot act on behalf of another player"));
    }
    next();
  };
}
