import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createDatabase, type DatabaseHandle } from "../../storage/db.js";
import { createJobsRepo } from "../../storage/jobs-repo.js";
import { createPlacesRepo } from "../../storage/places-repo.js";
import { createJobsWorker } from "./jobs-worker.js";

describe("jobs worker ingestion pipeline", () => {
  let workDir: string | undefined;
  let db: DatabaseHandle | undefined;

  afterEach(() => {
    if (db) {
      db.close();
      db = undefined;
    }

    if (workDir) {
      rmSync(workDir, { recursive: true, force: true });
      workDir = undefined;
    }
  });

  it("tracks discovered vs unique accepted counts while deduplicating writes", async () => {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    db = createDatabase(join(workDir, "local.db"));

    const jobsRepo = createJobsRepo(db);
    const placesRepo = createPlacesRepo(db);
    const job = jobsRepo.create({
      query: "coffee",
      policyJson: '{"pacingMs":0}',
      collectionConfigJson: '{"maxPlaces":10,"maxScrollSteps":4,"maxViewportPans":0}'
    });

    const scripted = [
      ["a", "b", "c"],
      ["b", "d"],
      ["d", "e"],
      ["e"]
    ];
    let call = 0;

    const worker = createJobsWorker({
      jobsRepo,
      placesRepo,
      pollIntervalMs: 10,
      heartbeatIntervalMs: 10,
      discoverStep: async () => {
        const batch = scripted[Math.min(call, scripted.length - 1)] ?? [];
        call += 1;
        return batch.map((id) => ({
          placeId: `pid-${id}`,
          name: `Place ${id}`,
          address: null,
          mapsUrl: null,
          lat: null,
          lng: null
        }));
      }
    });

    worker.start();
    await waitFor(() => jobsRepo.getById(job.id)?.status === "completed", 3_000);
    await worker.stop();

    const completed = jobsRepo.getById(job.id);
    expect(completed?.status).toBe("completed");
    expect(completed?.discoveredCount).toBe(9);
    expect(completed?.processedCount).toBe(5);
    expect(completed?.processedCount).toBeLessThanOrEqual(completed?.discoveredCount ?? 0);
    expect(placesRepo.listByJob(job.id)).toHaveLength(5);
  });
});

async function waitFor(assertion: () => boolean, timeoutMs = 1_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    if (assertion()) {
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }

  throw new Error("timed out waiting for worker completion");
}
