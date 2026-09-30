import { newDb, IMemoryDb } from 'pg-mem';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { setTestDbPool } from '../server/db/index.ts';

let memDbInstance: IMemoryDb | null = null;
let testPoolInstance: Pool | null = null;

export function initTestDatabase(): { memDb: IMemoryDb; pool: Pool } {
  const memDb = newDb();

  // Register interval and timestamp functions
  memDb.public.registerFunction({
    name: 'now',
    returns: (memDb.public as any).getType('timestamp with time zone'),
    implementation: () => new Date(),
  });

  // Read migrations from drizzle directory
  const drizzleDir = path.resolve(process.cwd(), 'drizzle');
  const migrationFiles = fs
    .readdirSync(drizzleDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const fullPath = path.join(drizzleDir, file);
    const sqlContent = fs.readFileSync(fullPath, 'utf8');
    const statements = sqlContent.split('--> statement-breakpoint');
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (trimmed) {
        try {
          memDb.public.none(trimmed);
        } catch (err: any) {
          // If already exists or minor DDL variance, log warning
          console.warn(`[testDbHarness] Migration warning on stmt in ${file}:`, err.message);
        }
      }
    }
  }

  const pgAdapter = memDb.adapters.createPg();

  // Drizzle ORM node-postgres compatibility patch for pg-mem:
  // 1. Strip query.types before query execution
  const origAdaptQuery = (pgAdapter.Pool as any).prototype.adaptQuery;
  (pgAdapter.Pool as any).prototype.adaptQuery = function (query: any, values: any) {
    if (query && typeof query === 'object' && query.types) {
      delete query.types;
    }
    return origAdaptQuery.call(this, query, values);
  };

  // 2. Map rowMode === 'array' correctly
  (pgAdapter.Pool as any).prototype.adaptResults = function (query: any, res: any) {
    if (query.rowMode === 'array') {
      const fields = res.fields || [];
      return {
        ...res,
        rows: res.rows.map((row: any) => fields.map((f: any) => row[f.name])),
      };
    }
    return {
      ...res,
      rows: res.rows.map((row: any) => ({ ...row })),
    };
  };

  // 3. Support real PostgreSQL transactions (BEGIN / COMMIT / ROLLBACK) via memory backup
  const origQuery = (pgAdapter.Pool as any).prototype.query;
  const savepointStack: any[] = [];
  (pgAdapter.Pool as any).prototype.query = function (query: any, ...rest: any[]) {
    const rawSql = typeof query === 'string' ? query : query?.text || '';
    const trimmed = rawSql.trim().toLowerCase();

    if (trimmed === 'begin' || trimmed.startsWith('begin')) {
      savepointStack.push(memDb.backup());
    } else if (trimmed === 'rollback' || trimmed.startsWith('rollback')) {
      if (savepointStack.length > 0) {
        const lastBackup = savepointStack.pop();
        lastBackup.restore();
      }
    } else if (trimmed === 'commit' || trimmed.startsWith('commit')) {
      if (savepointStack.length > 0) {
        savepointStack.pop();
      }
    }

    return origQuery.call(this, query, ...rest);
  };

  const pool = new pgAdapter.Pool() as unknown as Pool;

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
