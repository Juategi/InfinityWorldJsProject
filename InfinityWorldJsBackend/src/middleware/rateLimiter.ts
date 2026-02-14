import rateLimit from "express-rate-limit";

/**
 * Global rate limit: 100 requests/minute per IP
 */
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

/**
 * Strict rate limit for purchase/mutation endpoints: 10 requests/minute per IP
 */
export const buyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many purchase requests, please try again later" },
});

/**
 * Rate limit for expensive read endpoints: 20 requests/minute per IP
 */
export const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});
