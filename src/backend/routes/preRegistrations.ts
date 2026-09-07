import express from 'express';
import { dbAll, dbGet, dbRun } from '../db/init.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public route for pre-registration
router.post('/', async (req, res) => {
  const { event_id, full_name, contact_number, email, address, visitor_type, purpose, visit_info, id_type, id_number } = req.body;
  if (!event_id || !full_name) return res.status(400).json({ error: 'Event ID and name are required' });

  try {
    const trimmedName = full_name.trim();
    const existing = await dbGet<any>(
      'SELECT id FROM pre_registrations WHERE event_id = ? AND (LOWER(TRIM(full_name)) = LOWER(TRIM(?)) OR (contact_number IS NOT NULL AND contact_number != "" AND contact_number = ?))',
      [event_id, trimmedName, contact_number || '']
    );

    if (existing) {
      await dbRun(
        'UPDATE pre_registrations SET contact_number = ?, email = ?, address = ?, visitor_type = ?, purpose = ?, visit_info = COALESCE(?, visit_info) WHERE id = ?',
        [contact_number || '', email || '', address || '', visitor_type || 'Guest', purpose || 'Event Attendance', visit_info || null, existing.id]
      );
      return res.status(200).json({ id: existing.id, message: 'Pre-registration updated successfully' });
    }

    const result = await dbRun(
      'INSERT INTO pre_registrations (event_id, full_name, contact_number, email, address, visitor_type, purpose, visit_info, id_type, id_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [event_id, trimmedName, contact_number || '', email || '', address || '', visitor_type || 'Guest', purpose || 'Event Attendance', visit_info || '', id_type || 'School ID', id_number || '']
    );
    res.status(201).json({ id: result.lastID, message: 'Pre-registration successful' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Protected route to view pre-registrations
router.get('/', authenticate, async (req, res) => {
  try {
    const preRegs = await dbAll(`
      SELECT p.*, e.event_name, e.date as event_date 
      FROM pre_registrations p 
      JOIN events e ON p.event_id = e.id 
      ORDER BY p.created_at DESC
    `);
    res.json(preRegs);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
