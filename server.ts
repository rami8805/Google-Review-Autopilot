import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // When invoked via `node server.ts` without tsx, re-exec under tsx.
  // Production Docker CMD uses `npx tsx server.ts` so this path is rarely hit.
  const isTsxRunning =
    Boolean(process.env.TSX_BOOTSTRAPPED) ||
    Boolean(process.argv.some((arg) => arg.includes('tsx'))) ||
    Boolean(process.execArgv.some((arg) => arg.includes('tsx')));

  if (!isTsxRunning) {
    const { spawn } = await import('child_process');
    const child = spawn(process.execPath, ['--import', 'tsx', ...process.argv.slice(1)], {
      stdio: 'inherit',
      env: { ...process.env, TSX_BOOTSTRAPPED: 'true' },
    });
    child.on('exit', (code) => process.exit(code ?? 0));
    await new Promise(() => {});
    return;
  }

  // Load env early (optional dotenv for local/dev)
  try {
    const dotenv = await import('dotenv');
    dotenv.config();
  } catch {
    // dotenv is optional in production when secrets are injected by the platform
  }

  const { default: apiRouter } = await import('./server/routes/index.ts');
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProduction = process.env.NODE_ENV === 'production';

  // Trust proxy when behind Cloud Load Balancing / Cloud Run
  if (isProduction) {
    app.set('trust proxy', 1);
  }

  app.use(express.json({ limit: '1mb' }));

  // Mount API Gateway routes
  app.use('/api', apiRouter);

  // Health check endpoint (used by Docker HEALTHCHECK and Cloud Run)
  app.get('/health', async (_req, res) => {
    let dbHealthy = true;
    let dbLatencyMs = 0;
    try {
      const { checkDbHealth } = await import('./server/db/index.ts');
      const health = await checkDbHealth();
      dbHealthy = health.healthy;
      dbLatencyMs = health.latencyMs;
    } catch {
      // DB may not be configured in pure static/preview mode
      dbHealthy = false;
    }

    const status = dbHealthy ? 'ok' : 'degraded';
    res.status(dbHealthy ? 200 : 503).json({
      status,
      service: 'Google Review Autopilot API',
      timestamp: new Date().toISOString(),
      checks: {
        database: { healthy: dbHealthy, latencyMs: dbLatencyMs },
      },
    });
  });

  if (!isProduction) {
    // In dev, use Vite's dev server middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve built static assets from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath, { maxAge: '1y', immutable: true }));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'Google Review Autopilot server started',
        port: PORT,
        nodeEnv: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      })
    );
  });

  // Graceful shutdown for Cloud Run / k8s
  const shutdown = (signal: string) => {
    console.log(`[server] Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      try {
        const { closePool } = await import('./server/db/index.ts');
        await closePool();
      } catch {
        // ignore
      }
      process.exit(0);
    });
    // Force exit after 10s
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
