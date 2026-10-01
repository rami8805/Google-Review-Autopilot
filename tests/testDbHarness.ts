import { IMemoryDb } from 'pg-mem';
import { Pool } from 'pg';
import { setTestDbPool } from '../server/db/index.ts';
import { createInMemoryPgPool } from '../server/db/inMemoryDb.ts';

let memDbInstance: IMemoryDb | null = null;
let testPoolInstance: Pool | null = null;

export function initTestDatabase(): { memDb: IMemoryDb; pool: Pool } {
  const { memDb, pool } = createInMemoryPgPool();
  memDbInstance = memDb;
  testPoolInstance = pool;

  // Bind to central application database export
  setTestDbPool(pool);

  return { memDb, pool };
}

export function getTestPool(): Pool {
  if (!testPoolInstance) {
    initTestDatabase();
  }
  return testPoolInstance!;
}

