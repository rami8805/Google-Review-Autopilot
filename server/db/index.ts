import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import { sql } from 'drizzle-orm';
import * as schema from './schema.ts';

declare global {
  // eslint-disable-next-line no-var
  var _postgresPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var _drizzleDb: NodePgDatabase<typeof schema> | undefined;
}

export function buildPoolConfig(): PoolConfig {
  const max = parseInt(process.env.DB_POOL_MAX || '20', 10);
  const min = parseInt(process.env.DB_POOL_MIN || '2', 10);
  const connectionTimeoutMillis = parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10);
  const idleTimeoutMillis = parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10);
  const statementTimeout = parseInt(process.env.DB_QUERY_TIMEOUT_MS || '10000', 10);

  // If DATABASE_URL is explicitly set, use connection string
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      max,
      min,
      connectionTimeoutMillis,
      idleTimeoutMillis,
      statement_timeout: statementTimeout,
    };
  }

  // Cloud SQL Unix domain socket if INSTANCE_CONNECTION_NAME is provided
  if (process.env.INSTANCE_CONNECTION_NAME) {
    return {
      host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
      user: process.env.SQL_USER || 'postgres',
      password: process.env.SQL_PASSWORD || '',
      database: process.env.SQL_DB_NAME || 'google_review_autopilot',
      max,
      min,
      connectionTimeoutMillis,
      idleTimeoutMillis,
      statement_timeout: statementTimeout,
    };
  }

  return {
    host: process.env.SQL_HOST || '127.0.0.1',
    port: parseInt(process.env.SQL_PORT || '5432', 10),
    user: process.env.SQL_USER || 'postgres',
    password: process.env.SQL_PASSWORD || '',
    database: process.env.SQL_DB_NAME || 'google_review_autopilot',
    max,
    min,
    connectionTimeoutMillis,
    idleTimeoutMillis,
    statement_timeout: statementTimeout,
  };
}

export function createPool(): Pool {
  if (!global._postgresPool) {
    const config = buildPoolConfig();
    const pool = new Pool(config);

    pool.on('error', (err) => {
      console.error('[PostgreSQL Pool] Unexpected client error:', err.message);
    });

    global._postgresPool = pool;
  }
  return global._postgresPool;
}

export let pool = createPool();
export let db = global._drizzleDb || drizzle(pool, { schema });
global._drizzleDb = db;

/**
 * Isolated test harness hook.
 * Allows test suites to inject an in-memory PostgreSQL engine (pg-mem)
 * with real SQL constraints, transactions, and migration tables.
 */
export function setTestDbPool(customPool: Pool): void {
  pool = customPool;
  db = drizzle(customPool, { schema });
  global._postgresPool = customPool;
  global._drizzleDb = db;
}

/**
 * Health check probe using authoritative PostgreSQL SELECT 1
 */
export async function checkDbHealth(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1 as health_check`);
    return {
      healthy: true,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      error: (err as Error).message,
    };
  }
}

/**
 * Graceful pool shutdown hook
 */
export async function closePool(): Promise<void> {
  if (global._postgresPool) {
    try {
      await global._postgresPool.end();
    } catch (err) {
      console.warn('[PostgreSQL Pool] Error closing pool:', (err as Error).message);
    }
    global._postgresPool = undefined;
    global._drizzleDb = undefined;
  }
}

// Register process exit listeners for graceful shutdown
if (process.env.NODE_ENV !== 'test') {
  const shutdownHandler = async (signal: string) => {
    console.log(`[PostgreSQL Pool] Received ${signal}, closing database pool...`);
    await closePool();
  };

  process.once('SIGINT', () => shutdownHandler('SIGINT'));
  process.once('SIGTERM', () => shutdownHandler('SIGTERM'));
}

export { schema };
