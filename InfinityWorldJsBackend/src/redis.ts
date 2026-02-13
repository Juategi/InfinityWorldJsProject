import { createClient, RedisClientType } from "redis";

let client: RedisClientType | null = null;

function getClient(): RedisClientType {
  if (!client) {
    client = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    client.on("error", (err) => {
      console.error("Redis client error:", err);
    });
  }
  return client;
}

/**
 * Connect to Redis. Must be called before using get/set.
 */
export async function connectRedis(): Promise<void> {
  const c = getClient();
  if (!c.isOpen) {
    await c.connect();
  }
}

/**
 * Get a value from Redis.
 */
export async function redisGet(key: string): Promise<string | null> {
  return getClient().get(key);
}

/**
 * Set a value in Redis with optional TTL in seconds.
 */
export async function redisSet(
  key: string,
  value: string,
  ttlSeconds?: number
): Promise<void> {
  if (ttlSeconds) {
    await getClient().set(key, value, { EX: ttlSeconds });
  } else {
    await getClient().set(key, value);
  }
}

/**
 * Delete a key from Redis.
 */
export async function redisDel(key: string): Promise<number> {
  return getClient().del(key);
}

/**
 * Check if Redis connection is working.
 */
export async function checkRedisConnection(): Promise<boolean> {
  try {
    const c = getClient();
    if (!c.isOpen) return false;
    const pong = await c.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}

/**
 * Gracefully close the Redis connection.
 */
export async function closeRedis(): Promise<void> {
  if (client && client.isOpen) {
    await client.quit();
    client = null;
  }
}
