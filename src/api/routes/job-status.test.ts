import { afterEach, describe, expect, it } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createDatabase, type DatabaseHandle } from "../../storage/db.js";
import { createJobsRepo, type JobsRepo } from "../../storage/jobs-repo.js";
import { registerJobRoutes } from "./jobs.js";
import { registerJobStatusRoutes } from "./job-status.js";

describe("GET /jobs/:id", () => {
  let workDir: string | undefined;
  let app: FastifyInstance | undefined;
  let db: DatabaseHandle | undefined;
  let jobsRepo: JobsRepo | undefined;

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

  it("returns queued, running, and completed snapshots from persisted read model", async () => {
    ({ app, jobsRepo, db } = await createTestApp());

    const createResponse = await app.inject({
      method: "POST",
      url: "/jobs",
      payload: {
        inputType: "keyword_location",
        query: "coffee",
        location: "seattle"
      }
    });
    const jobId = createResponse.json().jobId as string;

    const queuedResponse = await app.inject({ method: "GET", url: `/jobs/${jobId}` });
    expect(queuedResponse.statusCode).toBe(200);
    expect(queuedResponse.json()).toMatchObject({
      jobId,
      status: "queued",
      progress: {
        discoveredCount: 0,
        processedCount: 0,
        failedCount: 0
      }
    });

    jobsRepo.claimNextQueued("2026-02-25T01:00:00.000Z");
    jobsRepo.updateProgress(jobId, {
      discoveredCount: 3,
      processedCount: 1,
      failedCount: 0,
      lastHeartbeatAt: "2026-02-25T01:00:04.000Z"
    });

    const runningResponse = await app.inject({ method: "GET", url: `/jobs/${jobId}` });
    expect(runningResponse.json()).toMatchObject({
      jobId,
      status: "running",
      progress: {
        discoveredCount: 3,
        processedCount: 1,
        failedCount: 0
      }
    });

    jobsRepo.markCompleted(jobId, {
      discoveredCount: 3,
      processedCount: 3,
      failedCount: 0,
      finishedAt: "2026-02-25T01:00:10.000Z"
    });

    const completedResponse = await app.inject({ method: "GET", url: `/jobs/${jobId}` });
    expect(completedResponse.json()).toMatchObject({
      jobId,
      status: "completed",
      progress: {
        discoveredCount: 3,
        processedCount: 3,
        failedCount: 0,
        failureReason: null
      }
    });
  });

  it("returns 404 for unknown jobs", async () => {
    ({ app, db } = await createTestApp());

    const response = await app.inject({ method: "GET", url: "/jobs/missing-id" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: "not_found" });
  });

  async function createTestApp(): Promise<{ app: FastifyInstance; jobsRepo: JobsRepo; db: DatabaseHandle }> {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const testDb = createDatabase(join(workDir, "local.db"));
    const testJobsRepo = createJobsRepo(testDb);
    const testApp = Fastify({ logger: false });

    await registerJobRoutes(testApp, testJobsRepo);
    await registerJobStatusRoutes(testApp, testJobsRepo);

    return { app: testApp, jobsRepo: testJobsRepo, db: testDb };
  }
});
