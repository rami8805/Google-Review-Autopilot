import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const isTsxRunning =
    Boolean(process.env.TSX_BOOTSTRAPPED) ||
    Boolean(process.argv.some(arg => arg.includes('tsx'))) ||
    Boolean(process.execArgv.some(arg => arg.includes('tsx')));

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

  const { default: apiRouter } = await import('./server/routes/index.ts');
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Mount API Gateway routes
  app.use('/api', apiRouter);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'Google Review Autopilot API', timestamp: new Date().toISOString() });
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
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Google Review Autopilot] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
