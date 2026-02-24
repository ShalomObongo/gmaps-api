import Database from "better-sqlite3";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";

export type DatabaseHandle = Database.Database;

export function createDatabase(filePath: string): DatabaseHandle {
  mkdirSync(dirname(filePath), { recursive: true });
  const db = new Database(filePath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      query TEXT NOT NULL,
      location TEXT,
      status TEXT NOT NULL,
      policy_json TEXT NOT NULL,
      collection_config_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      started_at TEXT,
      finished_at TEXT,
      failed_at TEXT,
      last_heartbeat_at TEXT,
      discovered_count INTEGER NOT NULL DEFAULT 0,
      processed_count INTEGER NOT NULL DEFAULT 0,
      failed_count INTEGER NOT NULL DEFAULT 0,
      failure_reason TEXT
    );
  `);

  ensureColumn(db, "jobs", "started_at", "TEXT");
  ensureColumn(db, "jobs", "finished_at", "TEXT");
  ensureColumn(db, "jobs", "failed_at", "TEXT");
  ensureColumn(db, "jobs", "last_heartbeat_at", "TEXT");
  ensureColumn(db, "jobs", "discovered_count", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "jobs", "processed_count", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "jobs", "failed_count", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "jobs", "failure_reason", "TEXT");
  ensureColumn(db, "jobs", "collection_config_json", "TEXT NOT NULL DEFAULT '{}'");

  db.exec(`
    CREATE TABLE IF NOT EXISTS places (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      place_key TEXT NOT NULL,
      place_id TEXT,
      name TEXT NOT NULL,
      category TEXT,
      rating REAL,
      reviews_count INTEGER,
      address TEXT,
      maps_url TEXT,
      lat REAL,
      lng REAL,
      website TEXT,
      phone TEXT,
      opening_hours_json TEXT,
      discovered_at TEXT NOT NULL,
      UNIQUE(job_id, place_key)
    );

    CREATE INDEX IF NOT EXISTS idx_places_job_id ON places(job_id);
  `);

  ensureColumn(db, "places", "category", "TEXT");
  ensureColumn(db, "places", "rating", "REAL");
  ensureColumn(db, "places", "reviews_count", "INTEGER");
  ensureColumn(db, "places", "website", "TEXT");
  ensureColumn(db, "places", "phone", "TEXT");
  ensureColumn(db, "places", "opening_hours_json", "TEXT");

  return db;
}

function ensureColumn(db: DatabaseHandle, tableName: string, columnName: string, definition: string): void {
  const existing = db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all() as Array<{ name: string }>;

  if (existing.some((column) => column.name === columnName)) {
    return;
  }

  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}
