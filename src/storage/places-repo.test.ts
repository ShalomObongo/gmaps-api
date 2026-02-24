import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
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
        address: "123 Main St",
        mapsUrl: "https://maps.google.com/?cid=1",
        lat: 47.6097,
        lng: -122.3331
      }
    });
    const second = repo.insert({
      jobId: "job-1",
      candidate: {
        placeId: "pid-1",
        name: "Cafe One",
        address: "123 Main St",
        mapsUrl: "https://maps.google.com/?cid=1",
        lat: 47.6097,
        lng: -122.3331
      }
    });

    expect(first.inserted).toBe(true);
    expect(second.inserted).toBe(false);
    expect(repo.listByJob("job-1")).toHaveLength(1);

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
        address: "1 Shared Rd",
        mapsUrl: null,
        lat: null,
        lng: null
      }
    });
    repo.insert({
      jobId: "job-b",
      candidate: {
        placeId: "pid-shared",
        name: "Shared Place",
        address: "1 Shared Rd",
        mapsUrl: null,
        lat: null,
        lng: null
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
        address: "500 Pine St",
        mapsUrl: null,
        lat: 47.611234,
        lng: -122.337889
      }
    });

    const second = repo.insert({
      jobId: "job-hash",
      candidate: {
        placeId: null,
        name: "no place id",
        address: "500   Pine St",
        mapsUrl: null,
        lat: 47.6112344,
        lng: -122.3378894
      }
    });

    expect(first.placeKey).toBe(second.placeKey);
    expect(second.inserted).toBe(false);

    db.close();
  });
});
