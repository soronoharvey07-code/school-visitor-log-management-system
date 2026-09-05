import express from 'express';
import { dbAll } from '../db/init.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/daily', async (req, res) => {
  try {
    const data = await dbAll("SELECT * FROM visitors WHERE date(COALESCE(time_in, created_at), '+8 hours') = date('now', '+8 hours')");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/weekly', async (req, res) => {
  try {
    const data = await dbAll("SELECT * FROM visitors WHERE datetime(COALESCE(time_in, created_at), '+8 hours') >= datetime('now', '+8 hours', '-7 days')");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/monthly', async (req, res) => {
  try {
    const data = await dbAll("SELECT * FROM visitors WHERE strftime('%Y-%m', COALESCE(time_in, created_at), '+8 hours') = strftime('%Y-%m', 'now', '+8 hours')");
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
