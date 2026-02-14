import { Pool, PoolClient } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on("error", (err) => {
      console.error("Unexpected error on idle PostgreSQL client:", err);
    });
  }
  return pool;
}

/**
 * Execute a query using the pool.
 */
export function query(text: string, params?: unknown[]) {
  return getPool().query(text, params);
}

/**
 * Get a client from the pool (for transactions).
 * Remember to call client.release() when done.
 */
export function getClient(): Promise<PoolClient> {
  return getPool().connect();
}

/**
 * Check if the database connection is working.
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const result = await getPool().query("SELECT 1 AS ok");
    return result.rows[0]?.ok === 1;
  } catch {
    return false;
  }
}

/**
 * Execute a callback within a PostgreSQL transaction.
 * Automatically handles BEGIN/COMMIT/ROLLBACK and client release.
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Gracefully close all pool connections.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
