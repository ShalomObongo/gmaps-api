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
      created_at TEXT NOT NULL
    );
  `);
  return db;
}
