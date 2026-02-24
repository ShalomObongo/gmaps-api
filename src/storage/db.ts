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
