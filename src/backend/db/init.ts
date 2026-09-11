import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

function getDatabasePath(): string {
  // If explicitly Vercel serverless environment (where root is strictly read-only)
  if (process.env.VERCEL) {
    const tmpDbPath = path.join('/tmp', 'database.sqlite');
    if (!fs.existsSync(tmpDbPath)) {
      const rootDbPath = path.join(process.cwd(), 'database.sqlite');
      if (fs.existsSync(rootDbPath)) {
        try {
          fs.copyFileSync(rootDbPath, tmpDbPath);
          console.log('Seeded /tmp/database.sqlite from project bundle');
        } catch (copyErr) {
          console.warn('Could not copy template database to /tmp:', copyErr);
        }
      }
    }
    return tmpDbPath;
  }

  // Check if current working directory is writable by current process
  try {
    const testFile = path.join(process.cwd(), '.write-test-' + Date.now());
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return path.join(process.cwd(), 'database.sqlite');
  } catch {
    // If not writable (e.g. read-only container root), fallback to /tmp
    const tmpDbPath = path.join('/tmp', 'database.sqlite');
    if (!fs.existsSync(tmpDbPath)) {
      const rootDbPath = path.join(process.cwd(), 'database.sqlite');
      if (fs.existsSync(rootDbPath)) {
        try {
          fs.copyFileSync(rootDbPath, tmpDbPath);
          console.log('Fallback seeded /tmp/database.sqlite from project bundle');
        } catch (copyErr) {
          console.warn('Could not copy template database to /tmp:', copyErr);
        }
      }
    }
    return tmpDbPath;
  }
}

export const dbPath = getDatabasePath();

export let db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database open error:', err);
  }
});

// Promisified DB helpers
export const dbRun = (query: string, params: any[] = []): Promise<sqlite3.RunResult> => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

export const dbGet = <T>(query: string, params: any[] = []): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
};

export const dbAll = <T>(query: string, params: any[] = []): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
};

let dbInitPromise: Promise<void> | null = null;
let isDbReady = false;

export function isDatabaseReady(): boolean {
  return isDbReady;
}

export function waitForDbReady(): Promise<void> {
  if (isDbReady) return Promise.resolve();
  if (!dbInitPromise) {
    dbInitPromise = initializeDatabase();
  }
  return dbInitPromise;
}

export async function initializeDatabase(): Promise<void> {
  if (isDbReady) return;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    try {
      // 1. Users table
      await dbRun(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'guard',
          active BOOLEAN NOT NULL DEFAULT 1,
          last_login DATETIME,
          last_logout DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Ensure optional columns exist on users
      await dbRun('ALTER TABLE users ADD COLUMN last_login DATETIME').catch(() => {});
      await dbRun('ALTER TABLE users ADD COLUMN last_logout DATETIME').catch(() => {});

      // 2. Visitors table
      await dbRun(`
        CREATE TABLE IF NOT EXISTS visitors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          visitor_number TEXT UNIQUE NOT NULL,
          visitor_type TEXT,
          visit_info TEXT,
          id_type TEXT,
          id_number TEXT,
          full_name TEXT NOT NULL,
          contact_number TEXT,
          address TEXT,
          purpose TEXT,
          photo TEXT,
          status TEXT DEFAULT 'Inside',
          registration_type TEXT DEFAULT 'Walk-in',
          time_in DATETIME DEFAULT CURRENT_TIMESTAMP,
          time_out DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Safe schema migrations for visitors table
      await dbRun('ALTER TABLE visitors ADD COLUMN visitor_type TEXT').catch(() => {});
      await dbRun('ALTER TABLE visitors ADD COLUMN visit_info TEXT').catch(() => {});
      await dbRun('ALTER TABLE visitors ADD COLUMN id_type TEXT').catch(() => {});
      await dbRun('ALTER TABLE visitors ADD COLUMN id_number TEXT').catch(() => {});
      await dbRun('ALTER TABLE visitors ADD COLUMN contact_number TEXT').catch(() => {});
      await dbRun('ALTER TABLE visitors ADD COLUMN address TEXT').catch(() => {});
      await dbRun('ALTER TABLE visitors ADD COLUMN purpose TEXT').catch(() => {});
      await dbRun('ALTER TABLE visitors ADD COLUMN photo TEXT').catch(() => {});
      await dbRun("ALTER TABLE visitors ADD COLUMN status TEXT DEFAULT 'Inside'").catch(() => {});
      await dbRun("ALTER TABLE visitors ADD COLUMN registration_type TEXT DEFAULT 'Walk-in'").catch(() => {});
      await dbRun('ALTER TABLE visitors ADD COLUMN time_in DATETIME').catch(() => {});
      await dbRun('ALTER TABLE visitors ADD COLUMN time_out DATETIME').catch(() => {});

      // 3. Visits history table
      await dbRun(`
        CREATE TABLE IF NOT EXISTS visits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          visitor_id INTEGER NOT NULL,
          visitor_number TEXT NOT NULL,
          visitor_type TEXT,
          visit_info TEXT,
          purpose TEXT,
          status TEXT DEFAULT 'signed-in',
          registration_type TEXT DEFAULT 'Walk-in',
          time_in DATETIME DEFAULT CURRENT_TIMESTAMP,
          time_out DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (visitor_id) REFERENCES visitors(id)
        )
      `);

      // Safe schema migrations for visits table
      await dbRun('ALTER TABLE visits ADD COLUMN visitor_number TEXT').catch(() => {});
      await dbRun('ALTER TABLE visits ADD COLUMN visitor_type TEXT').catch(() => {});
      await dbRun('ALTER TABLE visits ADD COLUMN visit_info TEXT').catch(() => {});
      await dbRun('ALTER TABLE visits ADD COLUMN purpose TEXT').catch(() => {});
      await dbRun("ALTER TABLE visits ADD COLUMN status TEXT DEFAULT 'signed-in'").catch(() => {});
      await dbRun("ALTER TABLE visits ADD COLUMN registration_type TEXT DEFAULT 'Walk-in'").catch(() => {});
      await dbRun('ALTER TABLE visits ADD COLUMN time_in DATETIME').catch(() => {});
      await dbRun('ALTER TABLE visits ADD COLUMN time_out DATETIME').catch(() => {});

      // 4. Events table
      await dbRun(`
        CREATE TABLE IF NOT EXISTS events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_name TEXT NOT NULL,
          description TEXT,
          location TEXT,
          date TEXT NOT NULL,
          registration_link TEXT,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await dbRun(`ALTER TABLE events ADD COLUMN status TEXT DEFAULT 'active'`).catch(() => {});
      await dbRun('ALTER TABLE events ADD COLUMN description TEXT').catch(() => {});
      await dbRun('ALTER TABLE events ADD COLUMN location TEXT').catch(() => {});
      await dbRun('ALTER TABLE events ADD COLUMN registration_link TEXT').catch(() => {});

      // 5. Pre-registrations table
      await dbRun(`
        CREATE TABLE IF NOT EXISTS pre_registrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id INTEGER NOT NULL,
          full_name TEXT NOT NULL,
          contact_number TEXT,
          email TEXT,
          address TEXT,
          visitor_type TEXT,
          visit_info TEXT,
          id_type TEXT,
          id_number TEXT,
          purpose TEXT,
          photo TEXT,
          registration_type TEXT DEFAULT 'Online Registration',
          status TEXT DEFAULT 'pre-registered',
          qr_code TEXT,
          visitor_number TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (event_id) REFERENCES events(id)
        )
      `);

      // Safe schema migrations for pre_registrations table (ensures existing DBs acquire all missing columns)
      await dbRun('ALTER TABLE pre_registrations ADD COLUMN visit_info TEXT').catch(() => {});
      await dbRun('ALTER TABLE pre_registrations ADD COLUMN id_type TEXT').catch(() => {});
      await dbRun('ALTER TABLE pre_registrations ADD COLUMN id_number TEXT').catch(() => {});
      await dbRun('ALTER TABLE pre_registrations ADD COLUMN photo TEXT').catch(() => {});
      await dbRun("ALTER TABLE pre_registrations ADD COLUMN registration_type TEXT DEFAULT 'Online Registration'").catch(() => {});
      await dbRun("ALTER TABLE pre_registrations ADD COLUMN status TEXT DEFAULT 'pre-registered'").catch(() => {});
      await dbRun('ALTER TABLE pre_registrations ADD COLUMN qr_code TEXT').catch(() => {});
      await dbRun('ALTER TABLE pre_registrations ADD COLUMN visitor_number TEXT').catch(() => {});
      await dbRun('ALTER TABLE pre_registrations ADD COLUMN email TEXT').catch(() => {});
      await dbRun('ALTER TABLE pre_registrations ADD COLUMN address TEXT').catch(() => {});
      await dbRun('ALTER TABLE pre_registrations ADD COLUMN visitor_type TEXT').catch(() => {});
      await dbRun('ALTER TABLE pre_registrations ADD COLUMN purpose TEXT').catch(() => {});

      // 6. System settings table (for persistence of Auto-Logout and other system configs)
      await dbRun(`
        CREATE TABLE IF NOT EXISTS system_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);

      const autoLogoutConfig = await dbGet<any>("SELECT value FROM system_settings WHERE key IN ('auto_logout', 'automaticLogoutEnabled')");
      if (!autoLogoutConfig) {
        let initialEnabled = true;
        const envVal = process.env.AUTOMATIC_LOGOUT_ENABLED ?? process.env.AUTO_LOGOUT_ENABLED;
        if (envVal !== undefined && envVal !== '') {
          const clean = String(envVal).trim().toLowerCase();
          if (clean === 'true' || clean === '1' || clean === 'on' || clean === 'yes') initialEnabled = true;
          else if (clean === 'false' || clean === '0' || clean === 'off' || clean === 'no') initialEnabled = false;
        }

        const initialConfig = {
          enabled: initialEnabled,
          automaticLogoutEnabled: initialEnabled,
          durationValue: 2,
          durationUnit: 'minutes',
          warningDurationValue: 10,
          warningDurationUnit: 'seconds',
          isConfigured: false
        };
        const serialized = JSON.stringify(initialConfig);
        await dbRun('INSERT INTO system_settings (key, value) VALUES (?, ?)', [
          'auto_logout',
          serialized
        ]).catch(() => {});
        await dbRun('INSERT INTO system_settings (key, value) VALUES (?, ?)', [
          'automaticLogoutEnabled',
          serialized
        ]).catch(() => {});
      }

      // 7. Guarantee default Admin and Guard accounts exist and are ready
      const adminUser = await dbGet<any>(
        "SELECT * FROM users WHERE LOWER(username) IN ('admin', 'admin2026', 'administrator') OR LOWER(role) IN ('admin', 'administrator') LIMIT 1"
      );
      if (!adminUser) {
        const hashAdmin = bcrypt.hashSync('RHMC_2026', 10);
        await dbRun('INSERT INTO users (username, password_hash, role, active) VALUES (?, ?, ?, 1)', [
          'Admin2026',
          hashAdmin,
          'Admin'
        ]).catch(() => {});
      }

      const guardUser = await dbGet<any>(
        "SELECT * FROM users WHERE LOWER(username) = 'guard' OR LOWER(role) = 'guard' LIMIT 1"
      );
      if (!guardUser) {
        const hashGuard = bcrypt.hashSync('2026_RHMC', 10);
        await dbRun('INSERT INTO users (username, password_hash, role, active) VALUES (?, ?, ?, 1)', [
          'Guard',
          hashGuard,
          'guard'
        ]).catch(() => {});
      }

      // 8. Initial default event if none exist
      const eventCount = await dbGet<{ count: number }>('SELECT COUNT(*) as count FROM events');
      if (!eventCount || eventCount.count === 0) {
        const result = await dbRun(
          'INSERT INTO events (event_name, description, location, date, status) VALUES (?, ?, ?, ?, ?)',
          [
            'Annual School Convocation 2026',
            'Official annual gathering and visitor orientation for Rosemont Hills Montessori College.',
            'Main Gymnasium',
            '2026-08-20',
            'active'
          ]
        ).catch(() => null);

        if (result && (result as any).lastID) {
          const lastId = (result as any).lastID;
          await dbRun('UPDATE events SET registration_link = ? WHERE id = ?', [`/register/${lastId}`, lastId]).catch(() => {});
        }
      }

      isDbReady = true;
      console.log('Database and Authentication subsystems are fully initialized and ready.');
    } catch (err: any) {
      if (err && (err.message?.includes('SQLITE_CORRUPT') || (err as any).code === 'SQLITE_CORRUPT')) {
        console.error('Database corrupted during init. Recreating...');
        try {
          db.close();
          if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
          db = new sqlite3.Database(dbPath);
          isDbReady = false;
          dbInitPromise = null;
          return initializeDatabase();
        } catch (e) {
          console.error('Error resetting corrupt database:', e);
        }
      }
      console.error('Error during database initialization:', err);
      throw err;
    }
  })();

  return dbInitPromise;
}
