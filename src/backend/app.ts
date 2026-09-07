import express from 'express';
import path from 'path';
import fs from 'fs';
import { dbGet, dbAll, dbRun, waitForDbReady } from './db/init.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import visitorRoutes from './routes/visitors.js';
import eventRoutes from './routes/events.js';
import preRegRoutes from './routes/preRegistrations.js';
import reportRoutes from './routes/reports.js';
import settingsRoutes from './routes/settings.js';

export const app = express();

app.set('trust proxy', true);

// Enable CORS for API requests
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Vercel Serverless Function compatibility: if body was already parsed by Vercel runtime
app.use((req: any, res, next) => {
  if (req.body !== undefined && typeof req.body === 'object' && (req.complete || req.readableEnded)) {
    req._body = true;
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static uploads
const uploadsPath = process.env.VERCEL
  ? path.join('/tmp', 'uploads')
  : path.join(process.cwd(), 'uploads');
try {
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
} catch {
  // Ignored in environments where mkdir fails
}
app.use('/uploads', express.static(uploadsPath));

// Ensure database tables and initial defaults are loaded before handling any API requests
app.use('/api', async (req, res, next) => {
  try {
    await waitForDbReady();
    next();
  } catch (err) {
    console.error('Database readiness error:', err);
    res.status(503).json({ error: 'Database service is initializing. Please retry in a moment.' });
  }
});

// Public API Routes
app.get('/api/public/events/:id', async (req, res) => {
  try {
    const rawId = String(req.params.id || '').replace(/\/+$/, '').trim();
    const numId = parseInt(rawId, 10);
    let event: any = null;
    if (!isNaN(numId)) {
      event = await dbGet('SELECT * FROM events WHERE id = ? OR id = ?', [rawId, numId]);
    } else {
      event = await dbGet('SELECT * FROM events WHERE id = ?', [rawId]);
    }

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Normalize status: strictly 'active' only if case-insensitive string is 'active'
    const statusClean = String(event.status || '').trim().toLowerCase();
    event.status = statusClean === 'active' ? 'active' : 'inactive';

    res.json(event);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/public/register', async (req, res) => {
  try {
    const {
      event_id, visitor_type, visit_info, id_type, id_number, full_name,
      contact_number, address, purpose, photoDataUrl, registration_type, status
    } = req.body;

    if (!event_id) {
      return res.status(400).json({ error: 'Event ID is required for event registration.' });
    }

    // Validate that the event exists and is ACTIVE
    const rawEventId = String(event_id).trim();
    const numEventId = parseInt(rawEventId, 10);
    let eventRow: any = null;
    if (!isNaN(numEventId)) {
      eventRow = await dbGet('SELECT * FROM events WHERE id = ? OR id = ?', [rawEventId, numEventId]);
    } else {
      eventRow = await dbGet('SELECT * FROM events WHERE id = ?', [rawEventId]);
    }

    if (!eventRow) {
      return res.status(404).json({ error: 'Event not found. Registration link is unavailable.' });
    }

    const eventStatus = (eventRow.status || '').toString().trim().toLowerCase();
    if (eventStatus !== 'active') {
      return res.status(403).json({ error: 'This event registration link is currently inactive or no longer accepting submissions.' });
    }

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    const trimmedName = full_name.trim();
    const trimmedContact = (contact_number || '').trim();
    const trimmedIdType = (id_type || '').trim();
    const trimmedIdNumber = (id_number || '').trim();
    const eventPurpose = purpose || 'Event Attendance';
    const eventVisitInfo = visit_info || 'Event';
    const eventVisitorType = visitor_type || 'Guest';

    // Store the complete Base64 data URL directly in the database
    const photoPersistent = (photoDataUrl && typeof photoDataUrl === 'string' && photoDataUrl.trim()) ? photoDataUrl.trim() : null;

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

    let visitor_number = '';
    let visitorId = 0;
    let finalPhoto: string | null = null;

    if (existing) {
      // Visitor already exists: Keep the existing Visitor ID and profile
      visitor_number = existing.visitor_number;
      visitorId = existing.id;
      // Keep their existing photo; if none existed, use the newly provided photo
      finalPhoto = existing.photo || photoPersistent;

      // Update the existing visitor profile information if necessary
      await dbRun(
        `UPDATE visitors SET
          status = 'pre-registered',
          purpose = ?,
          visit_info = ?,
          visitor_type = COALESCE(NULLIF(?, ''), visitor_type),
          contact_number = COALESCE(NULLIF(?, ''), contact_number),
          address = COALESCE(NULLIF(?, ''), address),
          id_type = COALESCE(NULLIF(?, ''), id_type),
          id_number = COALESCE(NULLIF(?, ''), id_number),
          photo = ?
        WHERE id = ?`,
        [
          eventPurpose,
          eventVisitInfo,
          eventVisitorType,
          trimmedContact,
          address || '',
          trimmedIdType,
          trimmedIdNumber,
          finalPhoto,
          visitorId
        ]
      );

      // Check if an existing pre-registered visit already exists for this event to avoid duplicate visit logs
      const existingVisit = await dbGet<any>(
        `SELECT id FROM visits WHERE visitor_id = ? AND status = 'pre-registered' AND (visit_info = ? OR purpose = ?)`,
        [visitorId, eventVisitInfo, eventPurpose]
      );

      const nowIso = new Date().toISOString();
      if (existingVisit) {
        await dbRun(
          `UPDATE visits SET visitor_type = ?, visit_info = ?, purpose = ?, registration_type = ? WHERE id = ?`,
          [eventVisitorType, eventVisitInfo, eventPurpose, registration_type || 'Online Registration', existingVisit.id]
        );
      } else {
        await dbRun(
          `INSERT INTO visits (visitor_id, visitor_number, visitor_type, visit_info, purpose, status, registration_type, time_in, time_out) VALUES (?, ?, ?, ?, ?, 'pre-registered', ?, ?, NULL)`,
          [visitorId, visitor_number, eventVisitorType, eventVisitInfo, eventPurpose, registration_type || 'Online Registration', nowIso]
        );
      }
    } else {
      // Genuinely a new visitor: assign next available unique Visitor ID
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
      visitor_number = (maxNum + 1).toString().padStart(4, '0');
      finalPhoto = photoPersistent;
      const nowIso = new Date().toISOString();

      const result = await dbRun(`
        INSERT INTO visitors (
          visitor_number, visitor_type, visit_info, id_type, id_number,
          full_name, contact_number, address, purpose, photo, registration_type, status, time_in, time_out
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
      `, [
        visitor_number,
        eventVisitorType,
        eventVisitInfo,
        trimmedIdType || 'School ID',
        trimmedIdNumber || visitor_number,
        trimmedName,
        trimmedContact,
        address || '',
        eventPurpose,
        finalPhoto,
        registration_type || 'Online Registration',
        status || 'pre-registered',
        nowIso
      ]);
      visitorId = result.lastID;

      await dbRun(
        `INSERT INTO visits (visitor_id, visitor_number, visitor_type, visit_info, purpose, status, registration_type, time_in, time_out) VALUES (?, ?, ?, ?, ?, 'pre-registered', ?, ?, NULL)`,
        [visitorId, visitor_number, eventVisitorType, eventVisitInfo, eventPurpose, registration_type || 'Online Registration', nowIso]
      );
    }

    // Handle Pre-Registrations table (Prevent duplicate rows when same person submits multiple times)
    if (event_id) {
      try {
        const existingPreReg = await dbGet<any>(
          `SELECT id FROM pre_registrations WHERE event_id = ? AND (LOWER(TRIM(full_name)) = LOWER(TRIM(?)) OR (contact_number IS NOT NULL AND contact_number != '' AND TRIM(contact_number) = TRIM(?)))`,
          [event_id, trimmedName, trimmedContact]
        );

        if (existingPreReg) {
          await dbRun(`
            UPDATE pre_registrations SET
              contact_number = ?,
              address = ?,
              visitor_type = ?,
              purpose = ?,
              visit_info = ?,
              id_type = ?,
              id_number = ?,
              photo = ?,
              registration_type = ?,
              status = ?,
              visitor_number = ?
            WHERE id = ?
          `, [
            trimmedContact,
            address || '',
            eventVisitorType,
            eventPurpose,
            eventVisitInfo,
            trimmedIdType || 'School ID',
            trimmedIdNumber || visitor_number,
            finalPhoto,
            registration_type || 'Online Registration',
            status || 'pre-registered',
            visitor_number,
            existingPreReg.id
          ]);
        } else {
          await dbRun(`
            INSERT INTO pre_registrations (
              event_id, full_name, contact_number, address, visitor_type,
              purpose, visit_info, id_type, id_number, photo,
              registration_type, status, visitor_number
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            event_id,
            trimmedName,
            trimmedContact,
            address || '',
            eventVisitorType,
            eventPurpose,
            eventVisitInfo,
            trimmedIdType || 'School ID',
            trimmedIdNumber || visitor_number,
            finalPhoto,
            registration_type || 'Online Registration',
            status || 'pre-registered',
            visitor_number
          ]);
        }
      } catch (prErr) {
        console.warn('Pre-registration record processing warning:', prErr);
      }
    }
    
    res.status(existing ? 200 : 201).json({
      id: visitorId,
      visitor_number,
      photoPath: finalPhoto,
      photo: finalPhoto,
      isReturning: !!existing
    });
  } catch (err) {
    console.error('Error in /api/public/register:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Primary API Sub-Routers
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/preregister', preRegRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err?.stack || err);
  res.status(500).json({ error: 'Something went wrong!' });
});

export default app;
