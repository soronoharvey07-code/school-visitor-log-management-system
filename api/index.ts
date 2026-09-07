import app from '../src/backend/app.js';

export default function handler(req: any, res: any) {
  // On Vercel, if the path rewrite stripped '/api', restore it so Express route handlers match
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/uploads')) {
    const sep = req.url.startsWith('/') ? '' : '/';
    req.url = `/api${sep}${req.url}`;
  }
  return app(req, res);
}
