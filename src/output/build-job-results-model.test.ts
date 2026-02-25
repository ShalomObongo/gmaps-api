import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createDatabase, type DatabaseHandle } from "../storage/db.js";
import { createJobsRepo, type JobsRepo } from "../storage/jobs-repo.js";
import { createPlacesRepo, type PlacesRepo } from "../storage/places-repo.js";
import { createPlaceReviewsRepo, type PlaceReviewsRepo } from "../storage/place-reviews-repo.js";
import { buildJobResultsModel } from "./build-job-results-model.js";

describe("buildJobResultsModel", () => {
  let workDir: string | undefined;
  let db: DatabaseHandle | undefined;
  let jobsRepo: JobsRepo | undefined;
  let placesRepo: PlacesRepo | undefined;
  let placeReviewsRepo: PlaceReviewsRepo | undefined;

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

  it("returns not_found when job does not exist", () => {
    ({ jobsRepo, placesRepo, placeReviewsRepo } = createRepos());

    const result = buildJobResultsModel("missing", {
      jobsRepo,
      placesRepo,
      placeReviewsRepo
    });

    expect(result).toEqual({
      kind: "not_found",
      jobId: "missing"
    });
  });

  it("returns not_ready for non-completed jobs", () => {
    ({ jobsRepo, placesRepo, placeReviewsRepo } = createRepos());

    const queued = jobsRepo.create({
      query: "queued",
      location: "seattle",
      status: "queued",
      policyJson: "{}",
      collectionConfigJson: "{}",
      reviewConfigJson: "{}"
    });

    const result = buildJobResultsModel(queued.id, {
      jobsRepo,
      placesRepo,
      placeReviewsRepo
    });

    expect(result.kind).toBe("not_ready");
    if (result.kind === "not_ready") {
      expect(result.job.id).toBe(queued.id);
      expect(result.job.status).toBe("queued");
    }
  });

  it("returns deterministic completed model with nested reviews", () => {
    ({ jobsRepo, placesRepo, placeReviewsRepo } = createRepos());

    const completed = jobsRepo.create({
      query: "coffee",
      location: "seattle",
      status: "queued",
      policyJson: "{}",
      collectionConfigJson: "{}",
      reviewConfigJson: "{}"
    });
    jobsRepo.claimNextQueued("2026-02-25T01:10:00.000Z");

    const alphaInsert = placesRepo.insert({
      jobId: completed.id,
      candidate: {
        placeId: "place-id-1",
        name: "Alpha",
        category: "Cafe",
        rating: 4.7,
        reviewsCount: 120,
        address: "1 Main St",
        mapsUrl: "https://maps.example/alpha",
        lat: 47.6,
        lng: -122.3,
        website: "https://alpha.example",
        email: "hello@alpha.example",
        phone: "555-1000",
        openingHoursJson: null
      },
      discoveredAt: "2026-02-25T01:11:00.000Z"
    });
    const betaInsert = placesRepo.insert({
      jobId: completed.id,
      candidate: {
        placeId: "place-id-2",
        name: "Beta",
        category: "Cafe",
        rating: 4.4,
        reviewsCount: 80,
        address: "2 Main St",
        mapsUrl: "https://maps.example/beta",
        lat: 47.61,
        lng: -122.31,
        website: null,
        email: null,
        phone: null,
        openingHoursJson: null
      },
      discoveredAt: "2026-02-25T01:11:10.000Z"
    });

    placeReviewsRepo.insertMany({
      jobId: completed.id,
      placeKey: alphaInsert.placeKey,
      collectedAt: "2026-02-25T01:12:00.000Z",
      reviews: [
        {
          reviewId: "alpha-2",
          sortOrder: "newest",
          position: 2,
          authorName: "B",
          rating: 4,
          text: "Good",
          publishedAt: "2 days ago"
        },
        {
          reviewId: "alpha-1",
          sortOrder: "newest",
          position: 1,
          authorName: "A",
          rating: 5,
          text: "Great",
          publishedAt: "1 day ago"
        }
      ]
    });
    placeReviewsRepo.insertMany({
      jobId: completed.id,
      placeKey: betaInsert.placeKey,
      collectedAt: "2026-02-25T01:12:30.000Z",
      reviews: [
        {
          reviewId: "beta-1",
          sortOrder: "newest",
          position: 1,
          authorName: "C",
          rating: 4,
          text: "Nice",
          publishedAt: "3 days ago"
        }
      ]
    });

    jobsRepo.markCompleted(completed.id, {
      discoveredCount: 2,
      processedCount: 2,
      failedCount: 0,
      finishedAt: "2026-02-25T01:13:00.000Z"
    });

    const result = buildJobResultsModel(completed.id, {
      jobsRepo,
      placesRepo,
      placeReviewsRepo
    });

    expect(result.kind).toBe("completed");
    if (result.kind === "completed") {
      expect(result.model).toMatchObject({
        jobId: completed.id,
        status: "completed",
        progress: {
          discoveredCount: 2,
          processedCount: 2,
          uniqueAcceptedCount: 2,
          failedCount: 0,
          failureReason: null
        }
      });
      expect(result.model.results.places.map((place) => place.name)).toEqual(["Alpha", "Beta"]);
      expect(result.model.results.places[0].reviews.map((review) => review.reviewId)).toEqual([
        "alpha-1",
        "alpha-2"
      ]);
      expect(result.model.results.places[1].reviews.map((review) => review.reviewId)).toEqual(["beta-1"]);
    }
  });

  function createRepos(): {
    jobsRepo: JobsRepo;
    placesRepo: PlacesRepo;
    placeReviewsRepo: PlaceReviewsRepo;
  } {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    db = createDatabase(join(workDir, "local.db"));
    jobsRepo = createJobsRepo(db);
    placesRepo = createPlacesRepo(db);
    placeReviewsRepo = createPlaceReviewsRepo(db);
    return { jobsRepo, placesRepo, placeReviewsRepo };
  }
});
