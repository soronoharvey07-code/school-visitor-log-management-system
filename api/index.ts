import app from '../src/backend/app.js';
import { waitForDbReady } from '../src/backend/db/init.js';

export default async function handler(req: any, res: any) {
  try {
    await waitForDbReady();
  } catch (dbErr) {
    console.error('Vercel Serverless Database Initialization Error:', dbErr);
  }

  // On Vercel, if the path rewrite stripped '/api', restore it so Express route handlers match
  if (req.url) {
    if (req.url.startsWith('/uploads') || req.url.startsWith('/api/uploads')) {
      // Retain upload paths
    } else if (!req.url.startsWith('/api')) {
      const sep = req.url.startsWith('/') ? '' : '/';
      req.url = `/api${sep}${req.url}`;
    }
  }

  return app(req, res);
}
