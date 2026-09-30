import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  // eslint-disable-next-line no-var
  var _postgresPool: Pool | undefined;
}

export function createPool(): Pool {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST || '127.0.0.1',
      user: process.env.SQL_USER || 'postgres',
      password: process.env.SQL_PASSWORD || '',
      database: process.env.SQL_DB_NAME || 'google_review_autopilot',
      max: 10,
      connectionTimeoutMillis: 5000,
    });

    global._postgresPool.on('error', (err) => {
      console.warn('[Cloud SQL Pool] Pool client error (connection offline or idle):', err.message);
    });
  }
  return global._postgresPool;
}

const pool = createPool();

export const db = drizzle(pool, { schema });
export { schema };
