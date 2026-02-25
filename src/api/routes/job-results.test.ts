import { afterEach, describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildServer } from "../../server.js";
import { createDatabase, type DatabaseHandle } from "../../storage/db.js";
import { createJobsRepo, type JobsRepo } from "../../storage/jobs-repo.js";
import { createPlacesRepo, type PlacesRepo } from "../../storage/places-repo.js";
import { createPlaceReviewsRepo, type PlaceReviewsRepo } from "../../storage/place-reviews-repo.js";
import { registerJobRoutes } from "./jobs.js";
import { registerJobResultsRoutes } from "./job-results.js";

describe("GET /jobs/:id/results", () => {
  let workDir: string | undefined;
  let app: FastifyInstance | undefined;
  let db: DatabaseHandle | undefined;
  let jobsRepo: JobsRepo | undefined;
  let placesRepo: PlacesRepo | undefined;
  let placeReviewsRepo: PlaceReviewsRepo | undefined;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }

    if (db) {
      db.close();
      db = undefined;
    }

    if (workDir) {
      rmSync(workDir, { recursive: true, force: true });
      workDir = undefined;
    }
  });

  it("returns 404 for unknown jobs", async () => {
    ({ app, db } = await createTestApp());

    const response = await app.inject({ method: "GET", url: "/jobs/missing/results" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "not_found",
      message: "job not found: missing"
    });
  });

  it("returns 409 for queued, running, and failed jobs", async () => {
    ({ app, db, jobsRepo } = await createTestApp());

    const queued = jobsRepo.create({
      query: "queued",
      location: "seattle",
      status: "queued",
      policyJson: "{}",
      collectionConfigJson: "{}",
      reviewConfigJson: "{}"
    });

    const running = jobsRepo.create({
      query: "running",
      location: "seattle",
      status: "running",
      policyJson: "{}",
      collectionConfigJson: "{}",
      reviewConfigJson: "{}"
    });

    const failed = jobsRepo.create({
      query: "failed",
      location: "seattle",
      status: "running",
      policyJson: "{}",
      collectionConfigJson: "{}",
      reviewConfigJson: "{}"
    });
    jobsRepo.markFailed(failed.id, {
      reason: "scrape blocked",
      discoveredCount: 3,
      processedCount: 1,
      failedCount: 1,
      failedAt: "2026-02-25T01:01:15.000Z"
    });

    const queuedResponse = await app.inject({ method: "GET", url: `/jobs/${queued.id}/results` });
    const runningResponse = await app.inject({ method: "GET", url: `/jobs/${running.id}/results` });
    const failedResponse = await app.inject({ method: "GET", url: `/jobs/${failed.id}/results` });

    expect(queuedResponse.statusCode).toBe(409);
    expect(queuedResponse.json()).toMatchObject({
      error: "results_not_ready",
      jobId: queued.id,
      status: "queued"
    });

    expect(runningResponse.statusCode).toBe(409);
    expect(runningResponse.json()).toMatchObject({
      error: "results_not_ready",
      jobId: running.id,
      status: "running"
    });

    expect(failedResponse.statusCode).toBe(409);
    expect(failedResponse.json()).toMatchObject({
      error: "results_not_ready",
      jobId: failed.id,
      status: "failed",
      failureReason: "scrape blocked"
    });
  });

  it("returns completed places with nested ordered reviews", async () => {
    ({ app, db, jobsRepo, placesRepo, placeReviewsRepo } = await createTestApp());

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

    const response = await app.inject({ method: "GET", url: `/jobs/${completed.id}/results` });
    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body).toMatchObject({
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

    expect(body.results.places.map((place: { name: string }) => place.name)).toEqual(["Alpha", "Beta"]);
    expect(body.results.places[0].reviews.map((review: { reviewId: string }) => review.reviewId)).toEqual([
      "alpha-1",
      "alpha-2"
    ]);
    expect(body.results.places[1].reviews.map((review: { reviewId: string }) => review.reviewId)).toEqual([
      "beta-1"
    ]);
  });

  it("is available from the assembled server alongside job status route", async () => {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const app = await buildServer({
      databaseFile: join(workDir, "local.db"),
      logger: false,
      workerPollIntervalMs: 60_000,
      workerHeartbeatIntervalMs: 60_000
    });

    const createResponse = await app.inject({
      method: "POST",
      url: "/jobs",
      payload: {
        inputType: "keyword_location",
        query: "coffee",
        location: "seattle",
        collection: {
          maxPlaces: 10
        }
      }
    });
    const jobId = createResponse.json().jobId as string;

    const statusResponse = await app.inject({ method: "GET", url: `/jobs/${jobId}` });
    const resultsResponse = await app.inject({ method: "GET", url: `/jobs/${jobId}/results` });

    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.json()).toMatchObject({ jobId, status: "queued" });

    expect(resultsResponse.statusCode).toBe(409);
    expect(resultsResponse.json()).toMatchObject({
      error: "results_not_ready",
      jobId,
      status: "queued"
    });

    await app.close();
  });

  async function createTestApp(): Promise<{
    app: FastifyInstance;
    jobsRepo: JobsRepo;
    placesRepo: PlacesRepo;
    placeReviewsRepo: PlaceReviewsRepo;
    db: DatabaseHandle;
  }> {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const testDb = createDatabase(join(workDir, "local.db"));
    const testJobsRepo = createJobsRepo(testDb);
    const testPlacesRepo = createPlacesRepo(testDb);
    const testPlaceReviewsRepo = createPlaceReviewsRepo(testDb);
    const testApp = Fastify({ logger: false });

    await registerJobRoutes(testApp, testJobsRepo);
    await registerJobResultsRoutes(testApp, testJobsRepo, testPlacesRepo, testPlaceReviewsRepo);

    return {
      app: testApp,
      jobsRepo: testJobsRepo,
      placesRepo: testPlacesRepo,
      placeReviewsRepo: testPlaceReviewsRepo,
      db: testDb
    };
  }
});
