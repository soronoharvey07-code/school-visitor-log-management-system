import express from 'express';
import multer from 'multer';
import path from 'path';
import { dbAll, dbGet, dbRun } from '../db/init.js';
import { authenticate } from '../middleware/auth.js';
import fs from 'fs';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

router.use(authenticate);

// Helper to safely parse UTC date strings / SQLite datetime strings into ms epoch time
function safeParseDateToMs(val: any): number {
  if (val === null || val === undefined || val === '') return Date.now();
  if (typeof val === 'number') return isNaN(val) ? Date.now() : val;
  if (val instanceof Date) return val.getTime();

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return Date.now();

    // Numeric timestamp string
    if (/^\d{10,15}$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      if (!isNaN(num)) return num;
    }

    // SQLite format "YYYY-MM-DD HH:MM:SS" (stored in UTC)
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(trimmed)) {
      const iso = trimmed.replace(' ', 'T') + 'Z';
      const parsed = new Date(iso).getTime();
      if (!isNaN(parsed)) return parsed;
    }

    // ISO without Z
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(trimmed)) {
      const parsed = new Date(trimmed + 'Z').getTime();
      if (!isNaN(parsed)) return parsed;
    }

    const parsed = new Date(trimmed).getTime();
    if (!isNaN(parsed)) return parsed;
  }

  return Date.now();
}

function safeParseOptionalDateToMs(val: any): number | undefined {
  if (val === null || val === undefined || val === '' || val === 'null' || val === 'undefined') {
    return undefined;
  }
  if (typeof val === 'string' && !val.trim()) {
    return undefined;
  }
  return safeParseDateToMs(val);
}

// Helper to convert any photo input into a permanent Base64 Data URL
async function processPhotoToDataUrl(
  file?: Express.Multer.File,
  photoDataUrl?: string | null
): Promise<string | null> {
  if (file && file.buffer) {
    const mimeType = file.mimetype || 'image/jpeg';
    return `data:${mimeType};base64,${file.buffer.toString('base64')}`;
  }

  if (!photoDataUrl || typeof photoDataUrl !== 'string') return null;
  const trimmed = photoDataUrl.trim();
  if (!trimmed) return null;

  // Already a base64 data URI
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  // If local file on disk
  try {
    const cleanPath = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
    const fullPath = path.isAbsolute(trimmed) ? trimmed : path.join(process.cwd(), cleanPath);
    if (fs.existsSync(fullPath)) {
      const ext = path.extname(fullPath).toLowerCase().replace('.', '') || 'png';
      const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'image/png';
      const fileBuffer = fs.readFileSync(fullPath);
      return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
    }
  } catch (err) {
    console.warn('Error reading local photo file:', photoDataUrl, err);
  }

  // If remote URL, fetch and convert
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const resp = await fetch(trimmed, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (resp.ok) {
        const contentType = resp.headers.get('content-type') || 'image/jpeg';
        const arrayBuf = await resp.arrayBuffer();
        const base64 = Buffer.from(arrayBuf).toString('base64');
        return `data:${contentType};base64,${base64}`;
      }
    } catch (fetchErr) {
      console.warn('Could not fetch remote photo URL:', trimmed, fetchErr);
    }
  }

  return trimmed;
}

// Generate visitor number
const generateVisitorNumber = async () => {
  const allVisitors = await dbAll<any>('SELECT visitor_number FROM visitors');
  let maxNum = 0;
  if (Array.isArray(allVisitors)) {
    for (const v of allVisitors) {
      if (v.visitor_number) {
        const num = parseInt(String(v.visitor_number).replace(/\D/g, ''), 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }
  return (maxNum + 1).toString().padStart(4, '0');
};

router.get('/', async (req, res) => {
  try {
    const visitors = await dbAll<any>('SELECT * FROM visitors ORDER BY id DESC');
    const visits = await dbAll<any>('SELECT * FROM visits ORDER BY id ASC');

    const visitsMap: Record<string, any[]> = {};
    if (Array.isArray(visits)) {
      for (const v of visits) {
        const vKey = String(v.visitor_id);
        if (!visitsMap[vKey]) visitsMap[vKey] = [];
        visitsMap[vKey].push({
          id: String(v.id),
          signInTime: safeParseDateToMs(v.time_in || v.created_at),
          signOutTime: safeParseOptionalDateToMs(v.time_out),
          purpose: v.purpose || 'Visit',
          visiting: v.visit_info || '',
          visitorType: v.visitor_type || 'Guest',
          status: v.status || 'signed-in'
        });
      }
    }

    const result = await Promise.all(visitors.map(async (v) => {
      const vKey = String(v.id);
      const parsedSignIn = safeParseDateToMs(v.time_in || v.created_at);
      const parsedSignOut = safeParseOptionalDateToMs(v.time_out);

      const history = visitsMap[vKey] || [{
        id: String(v.id),
        signInTime: parsedSignIn,
        signOutTime: parsedSignOut,
        purpose: v.purpose || 'Visit',
        visiting: v.visit_info || '',
        visitorType: v.visitor_type || 'Guest',
        status: v.status || 'signed-in'
      }];

      // Ensure photo is converted to base64 Data URL if it was a file path
      let persistentPhoto = v.photo || null;
      if (persistentPhoto && typeof persistentPhoto === 'string' && !persistentPhoto.startsWith('data:image/')) {
        const converted = await processPhotoToDataUrl(undefined, persistentPhoto);
        if (converted && converted.startsWith('data:image/')) {
          persistentPhoto = converted;
          // Auto-migrate in DB
          dbRun('UPDATE visitors SET photo = ? WHERE id = ?', [converted, v.id]).catch(() => {});
        }
      }

      return {
        ...v,
        id: String(v.id),
        name: v.full_name,
        idNumber: v.visitor_number || v.id_number || String(v.id),
        visitorNumber: v.visitor_number || String(v.id),
        visitorType: v.visitor_type || 'Guest',
        visiting: v.visit_info || '',
        idType: v.id_type || 'School ID',
        contactNumber: v.contact_number || '',
        photo: persistentPhoto,
        photo_url: persistentPhoto,
        photoDataUrl: persistentPhoto,
        status: v.status || 'signed-in',
        signInTime: parsedSignIn,
        signOutTime: parsedSignOut,
        history
      };
    }));

    res.json(result);
  } catch (err) {
    console.error('Error fetching visitors:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const visitor = await dbGet<any>('SELECT * FROM visitors WHERE id = ?', [req.params.id]);
    if (!visitor) return res.status(404).json({ error: 'Visitor not found' });
    const visits = await dbAll<any>('SELECT * FROM visits WHERE visitor_id = ? ORDER BY id ASC', [req.params.id]);
    const parsedSignIn = safeParseDateToMs(visitor.time_in || visitor.created_at);
    const parsedSignOut = safeParseOptionalDateToMs(visitor.time_out);

    const history = visits.map(v => ({
      id: String(v.id),
      signInTime: safeParseDateToMs(v.time_in || v.created_at),
      signOutTime: safeParseOptionalDateToMs(v.time_out),
      purpose: v.purpose || 'Visit',
      visiting: v.visit_info || '',
      visitorType: v.visitor_type || 'Guest',
      status: v.status || 'signed-in'
    }));

    let persistentPhoto = visitor.photo || null;
    if (persistentPhoto && typeof persistentPhoto === 'string' && !persistentPhoto.startsWith('data:image/')) {
      const converted = await processPhotoToDataUrl(undefined, persistentPhoto);
      if (converted && converted.startsWith('data:image/')) {
        persistentPhoto = converted;
        dbRun('UPDATE visitors SET photo = ? WHERE id = ?', [converted, visitor.id]).catch(() => {});
      }
    }

    res.json({
      ...visitor,
      id: String(visitor.id),
      name: visitor.full_name,
      signInTime: parsedSignIn,
      signOutTime: parsedSignOut,
      photo: persistentPhoto,
      photo_url: persistentPhoto,
      photoDataUrl: persistentPhoto,
      history: history.length > 0 ? history : [{
        id: String(visitor.id),
        signInTime: parsedSignIn,
        signOutTime: parsedSignOut,
        purpose: visitor.purpose || 'Visit',
        visiting: visitor.visit_info || '',
        visitorType: visitor.visitor_type || 'Guest',
        status: visitor.status || 'signed-in'
      }]
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const photoData = await processPhotoToDataUrl(
      req.file,
      req.body.photoDataUrl || req.body.photo_url || req.body.photo
    );

    const {
      visitor_type, visit_info, id_type, id_number, full_name,
      contact_number, address, purpose, registration_type, status
    } = req.body;

    const trimmedName = (full_name || '').trim();
    const trimmedContact = (contact_number || '').trim();
    const trimmedIdType = (id_type || '').trim();
    const trimmedIdNumber = (id_number || '').trim();
    const nowIso = new Date().toISOString();

    // Check whether the person already exists using reliable identifying information:
    // 1. Full Name (case-insensitive & trimmed)
    // 2. Contact Number (if provided)
    // 3. ID Type & ID Number (if provided)
    let existing: any = null;

    if (trimmedName) {
      existing = await dbGet<any>(
        `SELECT * FROM visitors WHERE LOWER(TRIM(full_name)) = LOWER(TRIM(?)) ORDER BY id ASC LIMIT 1`,
        [trimmedName]
      );
    }

    if (!existing && trimmedContact) {
      existing = await dbGet<any>(
        `SELECT * FROM visitors WHERE contact_number IS NOT NULL AND contact_number != '' AND TRIM(contact_number) = TRIM(?) ORDER BY id ASC LIMIT 1`,
        [trimmedContact]
      );
    }

    if (!existing && trimmedIdType && trimmedIdNumber) {
      existing = await dbGet<any>(
        `SELECT * FROM visitors WHERE id_type = ? AND id_number IS NOT NULL AND id_number != '' AND TRIM(id_number) = TRIM(?) ORDER BY id ASC LIMIT 1`,
        [trimmedIdType, trimmedIdNumber]
      );
    }

    if (existing) {
      // Returning visitor! Keep original visitor_number & profile, keep existing photo if available.
      const visNum = existing.visitor_number;
      const retainedPhoto = existing.photo || photoData;
      await dbRun(
        `UPDATE visitors SET
          status = ?,
          purpose = ?,
          visit_info = ?,
          visitor_type = COALESCE(NULLIF(?, ''), visitor_type),
          contact_number = COALESCE(NULLIF(?, ''), contact_number),
          address = COALESCE(NULLIF(?, ''), address),
          id_type = COALESCE(NULLIF(?, ''), id_type),
          id_number = COALESCE(NULLIF(?, ''), id_number),
          time_in = ?,
          time_out = NULL,
          photo = ?
        WHERE id = ?`,
        [
          status || 'signed-in',
          purpose,
          visit_info,
          visitor_type,
          trimmedContact,
          address || '',
          trimmedIdType,
          trimmedIdNumber,
          nowIso,
          retainedPhoto,
          existing.id
        ]
      );

      await dbRun(
        `INSERT INTO visits (visitor_id, visitor_number, visitor_type, visit_info, purpose, status, registration_type, time_in, time_out) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        [existing.id, visNum, visitor_type, visit_info, purpose, status || 'signed-in', registration_type || 'Walk-in', nowIso]
      );

      return res.status(200).json({ id: existing.id, visitor_number: visNum, photo: retainedPhoto, is_returning: true });
    }

    // New visitor
    const visitor_number = await generateVisitorNumber();
    const result = await dbRun(`
      INSERT INTO visitors (
        visitor_number, visitor_type, visit_info, id_type, id_number,
        full_name, contact_number, address, purpose, photo, registration_type, status, time_in, time_out
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `, [
      visitor_number, visitor_type, visit_info, id_type, id_number || visitor_number,
      trimmedName, contact_number, address, purpose, photoData, registration_type || 'Walk-in',
      status || 'signed-in', nowIso
    ]);

    await dbRun(
      `INSERT INTO visits (visitor_id, visitor_number, visitor_type, visit_info, purpose, status, registration_type, time_in, time_out) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [result.lastID, visitor_number, visitor_type, visit_info, purpose, status || 'signed-in', registration_type || 'Walk-in', nowIso]
    );
    
    res.status(201).json({ id: result.lastID, visitor_number, photo: photoData, is_returning: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', upload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates.photoDataUrl;
    delete updates.photo_url;
    
    const photoData = await processPhotoToDataUrl(
      req.file,
      req.body.photoDataUrl || req.body.photo_url || req.body.photo
    );

    if (photoData) {
      updates.photo = photoData;
    }

    const keys = Object.keys(updates);
    const values = Object.values(updates);
    
    if (keys.length === 0) return res.json({ message: 'No updates provided' });

    const setString = keys.map(k => `${k} = ?`).join(', ');
    await dbRun(`UPDATE visitors SET ${setString} WHERE id = ?`, [...values, id]);
    
    res.json({ message: 'Visitor updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM visits WHERE visitor_id = ?', [req.params.id]);
    await dbRun('DELETE FROM visitors WHERE id = ?', [req.params.id]);
    res.json({ message: 'Visitor deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/timein', async (req, res) => {
  try {
    const nowIso = new Date().toISOString();
    const visitor = await dbGet<any>('SELECT * FROM visitors WHERE id = ?', [req.params.id]);
    if (!visitor) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    await dbRun('UPDATE visitors SET status = "signed-in", time_in = ?, time_out = NULL WHERE id = ?', [nowIso, req.params.id]);
    
    // Add new visit entry in history
    await dbRun(
      `INSERT INTO visits (visitor_id, visitor_number, visitor_type, visit_info, purpose, status, registration_type, time_in, time_out) VALUES (?, ?, ?, ?, ?, "signed-in", ?, ?, NULL)`,
      [
        visitor.id,
        visitor.visitor_number || String(visitor.id),
        visitor.visitor_type || 'Guest',
        visitor.visit_info || '',
        visitor.purpose || 'Visit',
        visitor.registration_type || 'Walk-in',
        nowIso
      ]
    );

    res.json({ message: 'Time in recorded', time_in: nowIso });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/timeout', async (req, res) => {
  try {
    const nowIso = new Date().toISOString();
    await dbRun('UPDATE visitors SET status = "signed-out", time_out = ? WHERE id = ?', [nowIso, req.params.id]);
    await dbRun(
      'UPDATE visits SET status = "signed-out", time_out = ? WHERE id = (SELECT id FROM visits WHERE visitor_id = ? ORDER BY id DESC LIMIT 1)',
      [nowIso, req.params.id]
    );
    res.json({ message: 'Time out recorded', time_out: nowIso });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
