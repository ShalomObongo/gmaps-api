import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createDatabase } from "./db.js";
import { createJobsRepo } from "./jobs-repo.js";

describe("jobs repository lifecycle", () => {
  let workDir: string | undefined;

  afterEach(() => {
    if (workDir) {
      rmSync(workDir, { recursive: true, force: true });
      workDir = undefined;
    }
  });

  it("persists running progress and completion metrics", () => {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const db = createDatabase(join(workDir, "local.db"));
    const repo = createJobsRepo(db);

    const created = repo.create({
      query: "coffee",
      location: "seattle",
      policyJson: "{}",
      collectionConfigJson: '{"maxPlaces":50,"maxScrollSteps":20,"maxViewportPans":0}'
    });
    const claimed = repo.claimNextQueued("2026-02-25T01:00:00.000Z");
    expect(claimed?.id).toBe(created.id);
    expect(claimed?.status).toBe("running");

    const progressed = repo.updateProgress(created.id, {
      discoveredCount: 12,
      processedCount: 5,
      failedCount: 1,
      lastHeartbeatAt: "2026-02-25T01:00:03.000Z"
    });
    expect(progressed.discoveredCount).toBe(12);
    expect(progressed.processedCount).toBe(5);
    expect(progressed.failedCount).toBe(1);

    const completed = repo.markCompleted(created.id, {
      discoveredCount: 12,
      processedCount: 11,
      failedCount: 1,
      finishedAt: "2026-02-25T01:00:10.000Z"
    });
    expect(completed.status).toBe("completed");
    expect(completed.startedAt).toBe("2026-02-25T01:00:00.000Z");
    expect(completed.finishedAt).toBe("2026-02-25T01:00:10.000Z");

    const snapshot = repo.getProgressSnapshot(created.id);
    expect(snapshot).toMatchObject({
      discoveredCount: 12,
      processedCount: 11,
      failedCount: 1,
      failureReason: null
    });

    db.close();
  });

  it("rejects invalid transitions and terminal rewrites", () => {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const db = createDatabase(join(workDir, "local.db"));
    const repo = createJobsRepo(db);

    const job = repo.create({
      query: "pizza",
      policyJson: "{}",
      collectionConfigJson: '{"maxPlaces":25,"maxScrollSteps":10,"maxViewportPans":0}'
    });

    expect(() => repo.markCompleted(job.id)).toThrow("job must be running before completion");
    expect(() => repo.updateProgress(job.id, { processedCount: 1 })).toThrow(
      "progress updates are only allowed for running jobs"
    );

    repo.claimNextQueued();
    repo.markFailed(job.id, { reason: "upstream timeout", failedCount: 1 });

    expect(() => repo.markCompleted(job.id)).toThrow("terminal jobs are immutable");

    db.close();
  });

  it("claims queued jobs in created order", () => {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const db = createDatabase(join(workDir, "local.db"));
    const repo = createJobsRepo(db);

    const first = repo.create({
      query: "first",
      policyJson: "{}",
      collectionConfigJson: '{"maxPlaces":15,"maxScrollSteps":8,"maxViewportPans":0}'
    });
    const second = repo.create({
      query: "second",
      policyJson: "{}",
      collectionConfigJson: '{"maxPlaces":35,"maxScrollSteps":12,"maxViewportPans":1}'
    });

    const claimedFirst = repo.claimNextQueued();
    const claimedSecond = repo.claimNextQueued();

    expect(claimedFirst?.id).toBe(first.id);
    expect(claimedSecond?.id).toBe(second.id);

    db.close();
  });

  it("stores collection config per job without cross-job leakage", () => {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const db = createDatabase(join(workDir, "local.db"));
    const repo = createJobsRepo(db);

    const low = repo.create({
      query: "coffee",
      policyJson: "{}",
      collectionConfigJson: '{"maxPlaces":10,"maxScrollSteps":4,"maxViewportPans":0}',
      reviewConfigJson: '{"enabled":true,"sort":"newest","maxReviews":5}'
    });
    const high = repo.create({
      query: "coffee",
      policyJson: "{}",
      collectionConfigJson: '{"maxPlaces":120,"maxScrollSteps":40,"maxViewportPans":3}',
      reviewConfigJson: '{"enabled":true,"sort":"lowest_rating","maxReviews":2}'
    });

    expect(repo.getById(low.id)?.collectionConfigJson).toBe(
      '{"maxPlaces":10,"maxScrollSteps":4,"maxViewportPans":0}'
    );
    expect(repo.getById(high.id)?.collectionConfigJson).toBe(
      '{"maxPlaces":120,"maxScrollSteps":40,"maxViewportPans":3}'
    );
    expect(repo.getById(low.id)?.reviewConfigJson).toBe(
      '{"enabled":true,"sort":"newest","maxReviews":5}'
    );
    expect(repo.getById(high.id)?.reviewConfigJson).toBe(
      '{"enabled":true,"sort":"lowest_rating","maxReviews":2}'
    );

    db.close();
  });

  it("hydrates deterministic review controls when omitted", () => {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const db = createDatabase(join(workDir, "local.db"));
    const repo = createJobsRepo(db);

    const job = repo.create({
      query: "bakery",
      policyJson: "{}",
      collectionConfigJson: '{"maxPlaces":12,"maxScrollSteps":4,"maxViewportPans":0}'
    });

    expect(repo.getById(job.id)?.reviewConfigJson).toBe(
      '{"enabled":false,"sort":"newest","maxReviews":0}'
    );

    db.close();
  });
});
