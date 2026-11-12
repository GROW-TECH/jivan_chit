import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { apiRouter } from './server/api';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

  // Basic middlewares
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Routes FIRST (support root /api and subpath /JivanChitFunds/api)
  app.use('/api', apiRouter);
  app.use('/JivanChitFunds/api', apiRouter);

  // Health check
  app.get(['/api/health', '/JivanChitFunds/api/health'], (_req, res) => {
    res.json({
      status: 'ok',
      database: {
        host: process.env.DB_HOST || 'localhost',
        name: process.env.DB_NAME || 'chit_db_local',
      },
      time: new Date().toISOString(),
    });
  });

  // Vite middleware for development vs Static files for production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(__dirname, 'index.html'))
      ? __dirname
      : (fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))
        ? path.join(process.cwd(), 'dist')
        : process.cwd());

    // Serve static files from root, /assets, and subpath /JivanChitFunds
    app.use(express.static(distPath));
    app.use('/JivanChitFunds', express.static(distPath));
    app.use('/assets', express.static(path.join(distPath, 'assets')));
    app.use('/JivanChitFunds/assets', express.static(path.join(distPath, 'assets')));

    // SPA Fallback & direct asset resolution
    app.get('*', (req, res) => {
      if (req.path.includes('/assets/')) {
        const assetFile = req.path.split('/assets/').pop();
        if (assetFile) {
          const fullAssetPath = path.join(distPath, 'assets', assetFile);
          if (fs.existsSync(fullAssetPath)) {
            return res.sendFile(fullAssetPath);
          }
        }
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Chit Fund Management Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Chit Fund Management server:', err);
  process.exit(1);
});
