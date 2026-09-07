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

interface ColumnDef {
  name: string;
  type: string;
}

interface TableMigrationDef {
  tableName: string;
  createSql: string;
  columns: ColumnDef[];
}

const TABLE_SCHEMAS: TableMigrationDef[] = [
  {
    tableName: 'users',
    createSql: `
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
    `,
    columns: [
      { name: 'username', type: 'TEXT' },
      { name: 'password_hash', type: 'TEXT' },
      { name: 'role', type: "TEXT DEFAULT 'guard'" },
      { name: 'active', type: 'BOOLEAN DEFAULT 1' },
      { name: 'last_login', type: 'DATETIME' },
      { name: 'last_logout', type: 'DATETIME' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
    ]
  },
  {
    tableName: 'visitors',
    createSql: `
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
    `,
    columns: [
      { name: 'visitor_number', type: 'TEXT' },
      { name: 'visitor_type', type: 'TEXT' },
      { name: 'visit_info', type: 'TEXT' },
      { name: 'id_type', type: 'TEXT' },
      { name: 'id_number', type: 'TEXT' },
      { name: 'full_name', type: 'TEXT' },
      { name: 'contact_number', type: 'TEXT' },
      { name: 'address', type: 'TEXT' },
      { name: 'purpose', type: 'TEXT' },
      { name: 'photo', type: 'TEXT' },
      { name: 'status', type: "TEXT DEFAULT 'Inside'" },
      { name: 'registration_type', type: "TEXT DEFAULT 'Walk-in'" },
      { name: 'time_in', type: 'DATETIME' },
      { name: 'time_out', type: 'DATETIME' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
    ]
  },
  {
    tableName: 'visits',
    createSql: `
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
    `,
    columns: [
      { name: 'visitor_id', type: 'INTEGER' },
      { name: 'visitor_number', type: 'TEXT' },
      { name: 'visitor_type', type: 'TEXT' },
      { name: 'visit_info', type: 'TEXT' },
      { name: 'purpose', type: 'TEXT' },
      { name: 'status', type: "TEXT DEFAULT 'signed-in'" },
      { name: 'registration_type', type: "TEXT DEFAULT 'Walk-in'" },
      { name: 'time_in', type: 'DATETIME' },
      { name: 'time_out', type: 'DATETIME' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
    ]
  },
  {
    tableName: 'events',
    createSql: `
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
    `,
    columns: [
      { name: 'event_name', type: 'TEXT' },
      { name: 'description', type: 'TEXT' },
      { name: 'location', type: 'TEXT' },
      { name: 'date', type: 'TEXT' },
      { name: 'registration_link', type: 'TEXT' },
      { name: 'status', type: "TEXT DEFAULT 'active'" },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
    ]
  },
  {
    tableName: 'pre_registrations',
    createSql: `
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
    `,
    columns: [
      { name: 'event_id', type: 'INTEGER' },
      { name: 'full_name', type: 'TEXT' },
      { name: 'contact_number', type: 'TEXT' },
      { name: 'email', type: 'TEXT' },
      { name: 'address', type: 'TEXT' },
      { name: 'visitor_type', type: 'TEXT' },
      { name: 'visit_info', type: 'TEXT' },
      { name: 'id_type', type: 'TEXT' },
      { name: 'id_number', type: 'TEXT' },
      { name: 'purpose', type: 'TEXT' },
      { name: 'photo', type: 'TEXT' },
      { name: 'registration_type', type: "TEXT DEFAULT 'Online Registration'" },
      { name: 'status', type: "TEXT DEFAULT 'pre-registered'" },
      { name: 'qr_code', type: 'TEXT' },
      { name: 'visitor_number', type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
    ]
  },
  {
    tableName: 'system_settings',
    createSql: `
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `,
    columns: [
      { name: 'key', type: 'TEXT PRIMARY KEY' },
      { name: 'value', type: 'TEXT NOT NULL' }
    ]
  }
];

async function syncTableSchema(tableDef: TableMigrationDef): Promise<void> {
  // Ensure table exists
  await dbRun(tableDef.createSql);

  // Inspect existing columns dynamically
  const colInfo = await dbAll<any>(`PRAGMA table_info(${tableDef.tableName})`).catch(() => []);
  const existingCols = new Set(
    Array.isArray(colInfo) ? colInfo.map((c: any) => String(c.name).toLowerCase().trim()) : []
  );

  for (const col of tableDef.columns) {
    if (!existingCols.has(col.name.toLowerCase().trim())) {
      console.log(`[Database Migration] Adding missing column "${col.name}" (${col.type}) to table "${tableDef.tableName}"...`);
      try {
        await dbRun(`ALTER TABLE ${tableDef.tableName} ADD COLUMN ${col.name} ${col.type}`);
        existingCols.add(col.name.toLowerCase().trim());
        console.log(`[Database Migration] Successfully added column "${col.name}" to table "${tableDef.tableName}".`);
      } catch (alterErr: any) {
        // If column already exists (e.g. race condition), safe to ignore
        if (alterErr && alterErr.message && alterErr.message.includes('duplicate column name')) {
          existingCols.add(col.name.toLowerCase().trim());
        } else {
          console.warn(`[Database Migration Warning] Error adding column "${col.name}" to "${tableDef.tableName}":`, alterErr);
        }
      }
    }
  }
}

export async function initializeDatabase(): Promise<void> {
  if (isDbReady) return;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    try {
      // 1. Sync schemas for all core tables
      for (const tableDef of TABLE_SCHEMAS) {
        await syncTableSchema(tableDef);
      }

      // 2. Guarantee system_settings contains initial default configuration for Auto-Logout
      const autoLogoutConfig = await dbGet<any>('SELECT value FROM system_settings WHERE key = ?', ['auto_logout']);
      if (!autoLogoutConfig) {
        await dbRun('INSERT INTO system_settings (key, value) VALUES (?, ?)', [
          'auto_logout',
          JSON.stringify({ enabled: false, durationValue: 30, durationUnit: 'minutes', warningDurationValue: 30, warningDurationUnit: 'seconds', isConfigured: true })
        ]).catch(() => {});
      }

      // 3. Guarantee default Admin and Guard accounts exist and are ready
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

      // 4. Initial default event if none exist
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
      dbInitPromise = null;
      if (err && (err.message?.includes('SQLITE_CORRUPT') || (err as any).code === 'SQLITE_CORRUPT')) {
        console.error('Database corrupted during init. Recreating...');
        try {
          db.close();
          if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
          db = new sqlite3.Database(dbPath);
          isDbReady = false;
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
