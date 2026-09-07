import express from 'express';
import bcrypt from 'bcryptjs';
import { dbAll, dbGet, dbRun } from '../db/init.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, requireAdmin);

function safeParseDateToMs(val: any): number | undefined {
  if (val === null || val === undefined || val === '' || val === 'null' || val === 'undefined') return undefined;
  if (typeof val === 'number') return isNaN(val) ? undefined : val;
  if (val instanceof Date) return val.getTime();

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return undefined;

    if (/^\d{10,15}$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num)) return num;
    }

    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(trimmed)) {
      const iso = trimmed.replace(' ', 'T') + 'Z';
      const parsed = new Date(iso).getTime();
      if (!isNaN(parsed)) return parsed;
    }

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(trimmed)) {
      const parsed = new Date(trimmed + 'Z').getTime();
      if (!isNaN(parsed)) return parsed;
    }

    const parsed = new Date(trimmed).getTime();
    if (!isNaN(parsed)) return parsed;
  }

  return undefined;
}

router.get('/', async (req, res) => {
  try {
    const users = await dbAll<any>('SELECT id, username, role, active, last_login, last_logout, created_at FROM users');
    const mapped = (users || []).map(u => ({
      ...u,
      id: String(u.id),
      lastLogin: safeParseDateToMs(u.last_login),
      lastLogout: safeParseDateToMs(u.last_logout)
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await dbRun('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, hash, role || 'guard']);
    res.status(201).json({ id: result.lastID, username, role });
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint')) {
      res.status(400).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
});

router.put('/:id', async (req: any, res) => {
  const { id } = req.params;
  const { username, password, role, active } = req.body;
  const currentUserId = req.user?.id;
  const currentUsername = req.user?.username?.toLowerCase();

  try {
    const targetUser = await dbGet<any>('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)', [id, id]);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetId = targetUser.id;
    const isSelf = String(currentUserId) === String(targetId) || (currentUsername && currentUsername === targetUser.username?.toLowerCase());

    if (isSelf && (active === 0 || active === false)) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    const isTargetAdmin = ['admin', 'administrator'].includes(String(targetUser.role || '').toLowerCase());
    if (isTargetAdmin && (active === 0 || active === false)) {
      const activeAdminCountRow = await dbGet<any>(
        "SELECT COUNT(*) as count FROM users WHERE LOWER(role) IN ('admin', 'administrator') AND active = 1 AND id != ?",
        [targetId]
      );
      if (!activeAdminCountRow || activeAdminCountRow.count === 0) {
        return res.status(400).json({ error: 'At least one Admin account must remain Active' });
      }
    }

    const newUsername = (username && typeof username === 'string' && username.trim()) ? username.trim() : targetUser.username;
    if (newUsername.toLowerCase() !== targetUser.username.toLowerCase()) {
      const existing = await dbGet<any>('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?', [newUsername, targetId]);
      if (existing) {
        return res.status(400).json({ error: 'Username already exists' });
      }
    }

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await dbRun('UPDATE users SET username = ?, password_hash = ?, role = COALESCE(?, role), active = COALESCE(?, active) WHERE id = ?', [newUsername, hash, role, active, targetId]);
    } else {
      await dbRun('UPDATE users SET username = ?, role = COALESCE(?, role), active = COALESCE(?, active) WHERE id = ?', [newUsername, role, active, targetId]);
    }
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req: any, res) => {
  const { id } = req.params;
  const currentUserId = req.user?.id;
  const currentUsername = req.user?.username?.toLowerCase();

  try {
    const targetUser = await dbGet<any>('SELECT * FROM users WHERE id = ? OR LOWER(username) = LOWER(?)', [id, id]);
    if (!targetUser) {
      return res.json({ message: 'User deleted successfully' });
    }

    const targetId = targetUser.id;
    const isSelf = String(currentUserId) === String(targetId) || (currentUsername && currentUsername === targetUser.username?.toLowerCase());
    if (isSelf) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const isTargetAdmin = ['admin', 'administrator'].includes(String(targetUser.role || '').toLowerCase());
    if (isTargetAdmin) {
      const adminCountRow = await dbGet<any>(
        "SELECT COUNT(*) as count FROM users WHERE LOWER(role) IN ('admin', 'administrator') AND active = 1 AND id != ?",
        [targetId]
      );
      if (!adminCountRow || adminCountRow.count === 0) {
        return res.status(400).json({ error: 'At least one Admin account must remain' });
      }
    }

    await dbRun('DELETE FROM users WHERE id = ?', [targetId]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
