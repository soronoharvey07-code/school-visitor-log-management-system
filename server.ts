import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeDatabase } from './src/backend/db/init.js';
import app from './src/backend/app.js';

const isProduction =
  process.env.NODE_ENV === 'production' ||
  (typeof process.argv[1] === 'string' && process.argv[1].endsWith('.cjs'));

if (isProduction) {
  process.env.NODE_ENV = 'production';
}

const PORT = 3000;

async function startServer() {
  // Initialize DB tables and default accounts
  initializeDatabase().catch((err) => {
    console.error('Database startup initialization error:', err);
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
