import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createDatabase, type DatabaseHandle } from "../../storage/db.js";
import { createJobsRepo } from "../../storage/jobs-repo.js";
import { createPlacesRepo } from "../../storage/places-repo.js";
import { createPlaceReviewsRepo } from "../../storage/place-reviews-repo.js";
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
    const placeReviewsRepo = createPlaceReviewsRepo(db);
    const job = jobsRepo.create({
      query: "coffee",
      policyJson: '{"pacingMs":0}',
      collectionConfigJson: '{"maxPlaces":10,"maxScrollSteps":4,"maxViewportPans":0}',
      reviewConfigJson: '{"enabled":true,"sort":"lowest_rating","maxReviews":2}'
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
      placeReviewsRepo,
      pollIntervalMs: 10,
      heartbeatIntervalMs: 10,
      extractReviewsForPlace: async ({ sort }) => [
        {
          reviewId: "r-1",
          sortOrder: sort,
          position: 1,
          authorName: "A",
          rating: 1,
          text: "bad",
          publishedAt: "1 day ago"
        },
        {
          reviewId: "r-2",
          sortOrder: sort,
          position: 2,
          authorName: "B",
          rating: 2,
          text: "ok",
          publishedAt: "2 days ago"
        },
        {
          reviewId: "r-3",
          sortOrder: sort,
          position: 3,
          authorName: "C",
          rating: 3,
          text: "ignored",
          publishedAt: "3 days ago"
        }
      ],
      enrichCandidate: async (candidate) => {
        if (candidate.placeId === "pid-a") {
          return {
            website: "https://place-a.example",
            email: "hello@place-a.example",
            phone: "+1 206 555 0101",
            openingHoursJson: '["Mon 9-5"]'
          };
        }

        return {
          website: null,
          email: null,
          phone: null,
          openingHoursJson: null
        };
      },
      discoverStep: async () => {
        const batch = scripted[Math.min(call, scripted.length - 1)] ?? [];
        call += 1;
        return batch.map((id) => ({
          placeId: `pid-${id}`,
          name: `Place ${id}`,
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
        }));
      }
    });

    worker.start();
    await waitFor(() => {
      const status = jobsRepo.getById(job.id)?.status;
      return status === "completed" || status === "failed";
    }, 3_000);
    await worker.stop();

    const completed = jobsRepo.getById(job.id);
    expect(completed?.failureReason).toBeNull();
    expect(completed?.status).toBe("completed");
    expect(completed?.discoveredCount).toBe(9);
    expect(completed?.processedCount).toBe(5);
    expect(completed?.processedCount).toBeLessThanOrEqual(completed?.discoveredCount ?? 0);
    const places = placesRepo.listByJob(job.id);
    expect(places).toHaveLength(5);
    expect(places[0]).toMatchObject({
      placeId: "pid-a",
      website: "https://place-a.example",
      email: "hello@place-a.example",
      phone: "+1 206 555 0101",
      openingHoursJson: '["Mon 9-5"]'
    });
    expect(places[1]).toMatchObject({
      placeId: "pid-b",
      website: null,
      email: null,
      phone: null,
      openingHoursJson: null
    });

    const reviews = placeReviewsRepo.listByJobAndPlace(job.id, "pid:pid-a");
    expect(reviews).toEqual([
      expect.objectContaining({ reviewId: "r-1", sortOrder: "lowest_rating", position: 1 }),
      expect.objectContaining({ reviewId: "r-2", sortOrder: "lowest_rating", position: 2 })
    ]);
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
