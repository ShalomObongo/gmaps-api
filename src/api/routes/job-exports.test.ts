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
import { registerJobExportsRoutes } from "./job-exports.js";

describe("GET /jobs/:id/exports", () => {
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

    const response = await app.inject({ method: "GET", url: "/jobs/missing/exports" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "not_found",
      message: "job not found: missing"
    });
  });

  it("returns 409 for queued jobs", async () => {
    ({ app, db, jobsRepo } = await createTestApp());
    const queued = jobsRepo.create({
      query: "coffee",
      location: "seattle",
      status: "queued",
      policyJson: "{}",
      collectionConfigJson: "{}",
      reviewConfigJson: "{}"
    });

    const response = await app.inject({ method: "GET", url: `/jobs/${queued.id}/exports` });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({
      error: "results_not_ready",
      jobId: queued.id,
      status: "queued"
    });
  });

  it("returns JSON attachment by default for completed jobs", async () => {
    ({ app, db, jobsRepo, placesRepo, placeReviewsRepo } = await createTestApp());
    const completedId = seedCompletedJob(jobsRepo, placesRepo, placeReviewsRepo);

    const response = await app.inject({ method: "GET", url: `/jobs/${completedId}/exports` });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.headers["content-disposition"]).toBe(`attachment; filename=\"job-${completedId}.json\"`);
    expect(response.json()).toMatchObject({
      jobId: completedId,
      status: "completed",
      progress: {
        uniqueAcceptedCount: 1
      }
    });
  });

  it("returns CSV attachment for completed jobs", async () => {
    ({ app, db, jobsRepo, placesRepo, placeReviewsRepo } = await createTestApp());
    const completedId = seedCompletedJob(jobsRepo, placesRepo, placeReviewsRepo);

    const response = await app.inject({ method: "GET", url: `/jobs/${completedId}/exports?format=csv` });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/csv");
    expect(response.headers["content-disposition"]).toBe(`attachment; filename=\"job-${completedId}.csv\"`);
    expect(response.body).toContain("jobId,placeKey,placeId,name,category");
    expect(response.body).toContain("Alpha");
    expect(response.body).toContain("\"[{\"\"reviewId\"\":");
  });

  it("returns 400 for unsupported format", async () => {
    ({ app, db, jobsRepo } = await createTestApp());
    const queued = jobsRepo.create({
      query: "coffee",
      location: "seattle",
      status: "queued",
      policyJson: "{}",
      collectionConfigJson: "{}",
      reviewConfigJson: "{}"
    });

    const response = await app.inject({
      method: "GET",
      url: `/jobs/${queued.id}/exports?format=xml`
    });

    expect(response.statusCode).toBe(400);
  });

  it("is available from assembled server with the same state-gated behavior", async () => {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const server = await buildServer({
      databaseFile: join(workDir, "local.db"),
      logger: false,
      workerPollIntervalMs: 60_000,
      workerHeartbeatIntervalMs: 60_000
    });

    const createResponse = await server.inject({
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

    const jsonResponse = await server.inject({ method: "GET", url: `/jobs/${jobId}/exports` });
    const csvResponse = await server.inject({ method: "GET", url: `/jobs/${jobId}/exports?format=csv` });

    expect(jsonResponse.statusCode).toBe(409);
    expect(csvResponse.statusCode).toBe(409);

    await server.close();
  });

  function seedCompletedJob(jobs: JobsRepo, places: PlacesRepo, reviews: PlaceReviewsRepo): string {
    const completed = jobs.create({
      query: "coffee",
      location: "seattle",
      status: "queued",
      policyJson: "{}",
      collectionConfigJson: "{}",
      reviewConfigJson: "{}"
    });
    jobs.claimNextQueued("2026-02-25T01:10:00.000Z");

    const alphaInsert = places.insert({
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

    reviews.insertMany({
      jobId: completed.id,
      placeKey: alphaInsert.placeKey,
      collectedAt: "2026-02-25T01:12:00.000Z",
      reviews: [
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

    jobs.markCompleted(completed.id, {
      discoveredCount: 1,
      processedCount: 1,
      failedCount: 0,
      finishedAt: "2026-02-25T01:13:00.000Z"
    });

    return completed.id;
  }

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
    await registerJobExportsRoutes(testApp, testJobsRepo, testPlacesRepo, testPlaceReviewsRepo);

    return {
      app: testApp,
      jobsRepo: testJobsRepo,
      placesRepo: testPlacesRepo,
      placeReviewsRepo: testPlaceReviewsRepo,
      db: testDb
    };
  }
});
