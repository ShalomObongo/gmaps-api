import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Database from "better-sqlite3";
import { createDatabase } from "./db.js";
import { createPlacesRepo } from "./places-repo.js";

describe("places repository dedup", () => {
  let workDir: string | undefined;

  afterEach(() => {
    if (workDir) {
      rmSync(workDir, { recursive: true, force: true });
      workDir = undefined;
    }
  });

  it("deduplicates duplicate candidates for the same job", () => {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const db = createDatabase(join(workDir, "local.db"));
    const repo = createPlacesRepo(db);

    const first = repo.insert({
      jobId: "job-1",
      candidate: {
        placeId: "pid-1",
        name: "Cafe One",
        category: "Cafe",
        rating: 4.6,
        reviewsCount: 128,
        address: "123 Main St",
        mapsUrl: "https://maps.google.com/?cid=1",
        lat: 47.6097,
        lng: -122.3331,
        website: "https://cafe-one.example",
        email: "hello@cafe-one.example",
        phone: "+1 206 555 1000",
        openingHoursJson: '["Mon 9-5"]'
      }
    });
    const second = repo.insert({
      jobId: "job-1",
      candidate: {
        placeId: "pid-1",
        name: "Cafe One",
        category: "Cafe",
        rating: 4.6,
        reviewsCount: 128,
        address: "123 Main St",
        mapsUrl: "https://maps.google.com/?cid=1",
        lat: 47.6097,
        lng: -122.3331,
        website: "https://cafe-one.example",
        email: "hello@cafe-one.example",
        phone: "+1 206 555 1000",
        openingHoursJson: '["Mon 9-5"]'
      }
    });

    expect(first.inserted).toBe(true);
    expect(second.inserted).toBe(false);
    expect(repo.listByJob("job-1")).toEqual([
      expect.objectContaining({
        placeId: "pid-1",
        name: "Cafe One",
        category: "Cafe",
        rating: 4.6,
        reviewsCount: 128,
        address: "123 Main St",
        website: "https://cafe-one.example",
        email: "hello@cafe-one.example",
        phone: "+1 206 555 1000",
        openingHoursJson: '["Mon 9-5"]'
      })
    ]);

    db.close();
  });

  it("allows the same place key in different jobs", () => {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const db = createDatabase(join(workDir, "local.db"));
    const repo = createPlacesRepo(db);

    repo.insert({
      jobId: "job-a",
      candidate: {
        placeId: "pid-shared",
        name: "Shared Place",
        category: null,
        rating: null,
        reviewsCount: null,
        address: "1 Shared Rd",
        mapsUrl: null,
        lat: null,
        lng: null,
        website: null,
        email: null,
        phone: null,
        openingHoursJson: null
      }
    });
    repo.insert({
      jobId: "job-b",
      candidate: {
        placeId: "pid-shared",
        name: "Shared Place",
        category: null,
        rating: null,
        reviewsCount: null,
        address: "1 Shared Rd",
        mapsUrl: null,
        lat: null,
        lng: null,
        website: null,
        email: null,
        phone: null,
        openingHoursJson: null
      }
    });

    expect(repo.listByJob("job-a")).toHaveLength(1);
    expect(repo.listByJob("job-b")).toHaveLength(1);

    db.close();
  });

  it("falls back to deterministic hash key when placeId missing", () => {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const db = createDatabase(join(workDir, "local.db"));
    const repo = createPlacesRepo(db);

    const first = repo.insert({
      jobId: "job-hash",
      candidate: {
        placeId: null,
        name: "No Place ID",
        category: null,
        rating: null,
        reviewsCount: null,
        address: "500 Pine St",
        mapsUrl: null,
        lat: 47.611234,
        lng: -122.337889,
        website: null,
        email: null,
        phone: null,
        openingHoursJson: null
      }
    });

    const second = repo.insert({
      jobId: "job-hash",
      candidate: {
        placeId: null,
        name: "no place id",
        category: null,
        rating: null,
        reviewsCount: null,
        address: "500   Pine St",
        mapsUrl: null,
        lat: 47.6112344,
        lng: -122.3378894,
        website: null,
        email: null,
        phone: null,
        openingHoursJson: null
      }
    });

    expect(first.placeKey).toBe(second.placeKey);
    expect(second.inserted).toBe(false);

    db.close();
  });

  it("upgrades an existing places table with additive detail columns", () => {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const dbPath = join(workDir, "local.db");

    const oldDb = new Database(dbPath);
    oldDb.exec(`
      CREATE TABLE places (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT NOT NULL,
        place_key TEXT NOT NULL,
        place_id TEXT,
        name TEXT NOT NULL,
        address TEXT,
        maps_url TEXT,
        lat REAL,
        lng REAL,
        discovered_at TEXT NOT NULL,
        UNIQUE(job_id, place_key)
      );
    `);
    oldDb.close();

    const db = createDatabase(dbPath);
    const repo = createPlacesRepo(db);
    repo.insert({
      jobId: "job-upgrade",
      candidate: {
        placeId: "pid-upgrade",
        name: "Upgraded Place",
        category: null,
        rating: null,
        reviewsCount: null,
        address: null,
        mapsUrl: null,
        lat: null,
        lng: null,
        website: null,
        email: null,
        phone: null,
        openingHoursJson: null
      }
    });

    const columns = db.prepare("PRAGMA table_info(places)").all() as Array<{ name: string }>;
    const names = new Set(columns.map((column) => column.name));
    expect(names.has("category")).toBe(true);
    expect(names.has("rating")).toBe(true);
    expect(names.has("reviews_count")).toBe(true);
    expect(names.has("website")).toBe(true);
    expect(names.has("email")).toBe(true);
    expect(names.has("phone")).toBe(true);
    expect(names.has("opening_hours_json")).toBe(true);
    expect(repo.listByJob("job-upgrade")).toHaveLength(1);

    db.close();
  });
});
