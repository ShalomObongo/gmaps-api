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
      review_config_json TEXT NOT NULL DEFAULT '{}',
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
  ensureColumn(db, "jobs", "review_config_json", "TEXT NOT NULL DEFAULT '{}'");

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
      email TEXT,
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
  ensureColumn(db, "places", "email", "TEXT");
  ensureColumn(db, "places", "phone", "TEXT");
  ensureColumn(db, "places", "opening_hours_json", "TEXT");

  db.exec(`
    CREATE TABLE IF NOT EXISTS place_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      place_key TEXT NOT NULL,
      review_id TEXT NOT NULL,
      sort_order TEXT NOT NULL,
      position INTEGER NOT NULL,
      author_name TEXT,
      rating REAL,
      text TEXT,
      published_at TEXT,
      collected_at TEXT NOT NULL,
      UNIQUE(job_id, place_key, review_id)
    );

    CREATE INDEX IF NOT EXISTS idx_place_reviews_job_place ON place_reviews(job_id, place_key);
  `);

  ensureColumn(db, "place_reviews", "job_id", "TEXT NOT NULL");
  ensureColumn(db, "place_reviews", "place_key", "TEXT NOT NULL");
  ensureColumn(db, "place_reviews", "review_id", "TEXT NOT NULL");
  ensureColumn(db, "place_reviews", "sort_order", "TEXT NOT NULL DEFAULT 'newest'");
  ensureColumn(db, "place_reviews", "position", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn(db, "place_reviews", "author_name", "TEXT");
  ensureColumn(db, "place_reviews", "rating", "REAL");
  ensureColumn(db, "place_reviews", "text", "TEXT");
  ensureColumn(db, "place_reviews", "published_at", "TEXT");
  ensureColumn(db, "place_reviews", "collected_at", "TEXT NOT NULL DEFAULT ''");

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
