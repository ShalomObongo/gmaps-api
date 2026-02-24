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

    const created = repo.create({ query: "coffee", location: "seattle", policyJson: "{}" });
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

    const job = repo.create({ query: "pizza", policyJson: "{}" });

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

    const first = repo.create({ query: "first", policyJson: "{}" });
    const second = repo.create({ query: "second", policyJson: "{}" });

    const claimedFirst = repo.claimNextQueued();
    const claimedSecond = repo.claimNextQueued();

    expect(claimedFirst?.id).toBe(first.id);
    expect(claimedSecond?.id).toBe(second.id);

    db.close();
  });
});
