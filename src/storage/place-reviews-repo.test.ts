import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Database from "better-sqlite3";
import { createDatabase } from "./db.js";
import { createPlaceReviewsRepo } from "./place-reviews-repo.js";

describe("place reviews repository", () => {
  let workDir: string | undefined;

  afterEach(() => {
    if (workDir) {
      rmSync(workDir, { recursive: true, force: true });
      workDir = undefined;
    }
  });

  it("persists ordered review rows and deduplicates duplicate review IDs", () => {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const db = createDatabase(join(workDir, "local.db"));
    const repo = createPlaceReviewsRepo(db);

    const inserted = repo.insertMany({
      jobId: "job-1",
      placeKey: "place-1",
      reviews: [
        {
          reviewId: "r-1",
          sortOrder: "newest",
          position: 1,
          authorName: "A",
          rating: 5,
          text: "Great",
          publishedAt: "1 day ago"
        },
        {
          reviewId: "r-2",
          sortOrder: "newest",
          position: 2,
          authorName: "B",
          rating: 4,
          text: "Good",
          publishedAt: "2 days ago"
        }
      ]
    });
    const duplicate = repo.insertMany({
      jobId: "job-1",
      placeKey: "place-1",
      reviews: [
        {
          reviewId: "r-1",
          sortOrder: "newest",
          position: 3,
          authorName: "A2",
          rating: 1,
          text: "Duplicate",
          publishedAt: "today"
        }
      ]
    });

    expect(inserted).toBe(2);
    expect(duplicate).toBe(0);
    expect(repo.listByJobAndPlace("job-1", "place-1")).toEqual([
      expect.objectContaining({ reviewId: "r-1", position: 1, sortOrder: "newest" }),
      expect.objectContaining({ reviewId: "r-2", position: 2, sortOrder: "newest" })
    ]);

    db.close();
  });

  it("upgrades existing place_reviews table with additive columns", () => {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const dbPath = join(workDir, "local.db");

    const oldDb = new Database(dbPath);
    oldDb.exec(`
      CREATE TABLE place_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT NOT NULL,
        place_key TEXT NOT NULL,
        review_id TEXT NOT NULL,
        text TEXT,
        collected_at TEXT NOT NULL,
        UNIQUE(job_id, place_key, review_id)
      );
    `);
    oldDb.close();

    const db = createDatabase(dbPath);
    const repo = createPlaceReviewsRepo(db);
    const inserted = repo.insertMany({
      jobId: "job-upgrade",
      placeKey: "place-upgrade",
      reviews: [
        {
          reviewId: "r-upgrade",
          sortOrder: "lowest_rating",
          position: 1,
          authorName: null,
          rating: null,
          text: null,
          publishedAt: null
        }
      ]
    });

    const columns = db.prepare("PRAGMA table_info(place_reviews)").all() as Array<{ name: string }>;
    const names = new Set(columns.map((column) => column.name));
    expect(names.has("sort_order")).toBe(true);
    expect(names.has("position")).toBe(true);
    expect(names.has("author_name")).toBe(true);
    expect(names.has("rating")).toBe(true);
    expect(names.has("published_at")).toBe(true);
    expect(inserted).toBe(1);
    expect(repo.listByJobAndPlace("job-upgrade", "place-upgrade")).toHaveLength(1);

    db.close();
  });
});
