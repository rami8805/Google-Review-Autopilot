import { newDb, IMemoryDb } from 'pg-mem';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

let inMemoryDbInstance: IMemoryDb | null = null;
let inMemoryPoolInstance: Pool | null = null;

export function createInMemoryPgPool(): { memDb: IMemoryDb; pool: Pool } {
  const memDb = newDb();

  // Register interval and timestamp functions
  memDb.public.registerFunction({
    name: 'now',
    returns: (memDb.public as any).getType('timestamp with time zone'),
    implementation: () => new Date(),
  });

  // Read migrations from drizzle directory
  const drizzleDir = path.resolve(process.cwd(), 'drizzle');
  if (fs.existsSync(drizzleDir)) {
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
            console.warn(`[inMemoryDb] Migration warning on stmt in ${file}:`, err.message);
          }
        }
      }
    }
  }

  const pgAdapter = memDb.adapters.createPg();
  const savepointStack: any[] = [];

  const patchPrototype = (proto: any) => {
    if (!proto) return;

    // 1. Strip query.types before query execution
    const origAdaptQuery = proto.adaptQuery;
    proto.adaptQuery = function (query: any, values: any) {
      if (query && typeof query === 'object' && query.types) {
        delete query.types;
      }
      return origAdaptQuery ? origAdaptQuery.call(this, query, values) : query;
    };

    // 2. Map rowMode === 'array' correctly
    const origAdaptResults = proto.adaptResults;
    proto.adaptResults = function (query: any, res: any) {
      if (query && query.rowMode === 'array') {
        const fields = res.fields || [];
        return {
          ...res,
          rows: res.rows.map((row: any) => fields.map((f: any) => row[f.name])),
        };
      }
      return origAdaptResults ? origAdaptResults.call(this, query, res) : { ...res, rows: res.rows.map((row: any) => ({ ...row })) };
    };

    // 3. Support real PostgreSQL transactions (BEGIN / COMMIT / ROLLBACK) via memory backup
    const origQuery = proto.query;
    proto.query = function (query: any, ...rest: any[]) {
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
  };

  patchPrototype((pgAdapter.Pool as any).prototype);
  if ((pgAdapter.Client as any)?.prototype) {
    patchPrototype((pgAdapter.Client as any).prototype);
  }

  const pool = new pgAdapter.Pool() as unknown as Pool;
  inMemoryDbInstance = memDb;
  inMemoryPoolInstance = pool;

  return { memDb, pool };
}

export function getInMemoryPool(): Pool {
  if (!inMemoryPoolInstance) {
    createInMemoryPgPool();
  }
  return inMemoryPoolInstance!;
}
