import express from 'express';
import { dbAll, dbGet, dbRun } from '../db/init.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const events = await dbAll('SELECT * FROM events ORDER BY date DESC');
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const { event_name, description, location, date, status } = req.body;
  if (!event_name || !date) return res.status(400).json({ error: 'Name and date are required' });

  try {
    const eventStatus = status || 'active';
    const result = await dbRun(
      'INSERT INTO events (event_name, description, location, date, status) VALUES (?, ?, ?, ?, ?)',
      [event_name, description, location, date, eventStatus]
    );
    // Generate simple link
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const link = `${protocol}://${host}/register/${result.lastID}`;
    await dbRun('UPDATE events SET registration_link = ? WHERE id = ?', [link, result.lastID]);
    
    res.status(201).json({ id: result.lastID, event_name, description, location, date, status: eventStatus, link });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  const { event_name, description, location, date, status } = req.body;
  try {
    const existing = await dbGet<any>('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Event not found' });

    const newName = event_name !== undefined ? event_name : existing.event_name;
    const newDesc = description !== undefined ? description : existing.description;
    const newLoc = location !== undefined ? location : existing.location;
    const newDate = date !== undefined ? date : existing.date;
    const newStatus = status !== undefined ? status : (existing.status || 'active');

    await dbRun(
      'UPDATE events SET event_name = ?, description = ?, location = ?, date = ?, status = ? WHERE id = ?',
      [newName, newDesc, newLoc, newDate, newStatus, req.params.id]
    );
    res.json({ message: 'Event updated', status: newStatus });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
