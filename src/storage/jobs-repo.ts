import { randomUUID } from "node:crypto";
import type { DatabaseHandle } from "./db.js";
import type { JobProgress, JobRecord, JobStatus } from "./schema.js";

export type CreateJobInput = {
  query: string;
  location?: string;
  status?: JobStatus;
  policyJson: string;
};

export type JobsRepo = {
  create(input: CreateJobInput): JobRecord;
  getById(id: string): JobRecord | null;
  getProgressSnapshot(id: string): JobProgress | null;
  claimNextQueued(now?: string): JobRecord | null;
  updateProgress(id: string, input: UpdateProgressInput): JobRecord;
  markCompleted(id: string, input?: CompleteJobInput): JobRecord;
  markFailed(id: string, input: FailJobInput): JobRecord;
};

export type UpdateProgressInput = {
  discoveredCount?: number;
  processedCount?: number;
  failedCount?: number;
  lastHeartbeatAt?: string;
};

export type CompleteJobInput = {
  discoveredCount?: number;
  processedCount?: number;
  failedCount?: number;
  finishedAt?: string;
};

export type FailJobInput = {
  reason: string;
  discoveredCount?: number;
  processedCount?: number;
  failedCount?: number;
  failedAt?: string;
};

export function createJobsRepo(db: DatabaseHandle): JobsRepo {
  const insert = db.prepare(`
    INSERT INTO jobs (
      id,
      query,
      location,
      status,
      policy_json,
      created_at,
      started_at,
      finished_at,
      failed_at,
      last_heartbeat_at,
      discovered_count,
      processed_count,
      failed_count,
      failure_reason
    )
    VALUES (
      @id,
      @query,
      @location,
      @status,
      @policyJson,
      @createdAt,
      @startedAt,
      @finishedAt,
      @failedAt,
      @lastHeartbeatAt,
      @discoveredCount,
      @processedCount,
      @failedCount,
      @failureReason
    )
  `);
  const byId = db.prepare(selectByIdSql());
  const claimQueued = db.prepare(`
    UPDATE jobs
    SET status = 'running',
        started_at = COALESCE(started_at, @now),
        last_heartbeat_at = @now,
        failure_reason = NULL
    WHERE id = @id
      AND status = 'queued'
  `);
  const updateProgress = db.prepare(`
    UPDATE jobs
    SET discovered_count = @discoveredCount,
        processed_count = @processedCount,
        failed_count = @failedCount,
        last_heartbeat_at = @lastHeartbeatAt
    WHERE id = @id
      AND status = 'running'
  `);
  const markCompleted = db.prepare(`
    UPDATE jobs
    SET status = 'completed',
        finished_at = @finishedAt,
        failed_at = NULL,
        discovered_count = @discoveredCount,
        processed_count = @processedCount,
        failed_count = @failedCount,
        last_heartbeat_at = @lastHeartbeatAt,
        failure_reason = NULL
    WHERE id = @id
      AND status = 'running'
  `);
  const markFailed = db.prepare(`
    UPDATE jobs
    SET status = 'failed',
        failed_at = @failedAt,
        finished_at = COALESCE(finished_at, @failedAt),
        discovered_count = @discoveredCount,
        processed_count = @processedCount,
        failed_count = @failedCount,
        last_heartbeat_at = @lastHeartbeatAt,
        failure_reason = @reason
    WHERE id = @id
      AND status = 'running'
  `);
  const nextQueued = db.prepare(`
    SELECT id
    FROM jobs
    WHERE status = 'queued'
    ORDER BY created_at ASC
    LIMIT 1
  `);
  const readById = (id: string): JobRecord | null => {
    const row = byId.get(id) as JobRecord | undefined;
    return row ?? null;
  };

  return {
    create(input) {
      const id = randomUUID();
      const now = new Date().toISOString();
      const record: JobRecord = {
        id,
        query: input.query,
        location: input.location ?? null,
        status: input.status ?? "queued",
        policyJson: input.policyJson,
        createdAt: now,
        startedAt: null,
        finishedAt: null,
        failedAt: null,
        lastHeartbeatAt: null,
        discoveredCount: 0,
        processedCount: 0,
        failedCount: 0,
        failureReason: null
      };

      insert.run(record);
      return record;
    },
    getById(id) {
      return readById(id);
    },
    getProgressSnapshot(id) {
      const row = readById(id);
      if (!row) {
        return null;
      }

      return {
        discoveredCount: row.discoveredCount,
        processedCount: row.processedCount,
        failedCount: row.failedCount,
        startedAt: row.startedAt,
        finishedAt: row.finishedAt,
        failedAt: row.failedAt,
        lastHeartbeatAt: row.lastHeartbeatAt,
        failureReason: row.failureReason
      };
    },
    claimNextQueued(now = new Date().toISOString()) {
      const result = db.transaction(() => {
        const next = nextQueued.get() as { id: string } | undefined;
        if (!next) {
          return null;
        }

        const updated = claimQueued.run({ id: next.id, now });
        if (updated.changes === 0) {
          return null;
        }

        return byId.get(next.id) as JobRecord;
      })();

      return result;
    },
    updateProgress(id, input) {
      return db.transaction(() => {
        const existing = assertMutableJob(readById, id);
        const lastHeartbeatAt = input.lastHeartbeatAt ?? new Date().toISOString();
        const payload = {
          id,
          discoveredCount: input.discoveredCount ?? existing.discoveredCount,
          processedCount: input.processedCount ?? existing.processedCount,
          failedCount: input.failedCount ?? existing.failedCount,
          lastHeartbeatAt
        };

        const updated = updateProgress.run(payload);
        if (updated.changes === 0) {
          throw new Error("progress updates are only allowed for running jobs");
        }

        return readById(id) as JobRecord;
      })();
    },
    markCompleted(id, input = {}) {
      return db.transaction(() => {
        const existing = assertMutableJob(readById, id);
        const finishedAt = input.finishedAt ?? new Date().toISOString();
        const payload = {
          id,
          finishedAt,
          discoveredCount: input.discoveredCount ?? existing.discoveredCount,
          processedCount: input.processedCount ?? existing.processedCount,
          failedCount: input.failedCount ?? existing.failedCount,
          lastHeartbeatAt: finishedAt
        };

        const updated = markCompleted.run(payload);
        if (updated.changes === 0) {
          throw new Error("job must be running before completion");
        }

        return readById(id) as JobRecord;
      })();
    },
    markFailed(id, input) {
      return db.transaction(() => {
        const existing = assertMutableJob(readById, id);
        const failedAt = input.failedAt ?? new Date().toISOString();
        const payload = {
          id,
          reason: input.reason,
          failedAt,
          discoveredCount: input.discoveredCount ?? existing.discoveredCount,
          processedCount: input.processedCount ?? existing.processedCount,
          failedCount: input.failedCount ?? existing.failedCount,
          lastHeartbeatAt: failedAt
        };

        const updated = markFailed.run(payload);
        if (updated.changes === 0) {
          throw new Error("job must be running before failure");
        }

        return readById(id) as JobRecord;
      })();
    }
  };
}

function selectByIdSql(): string {
  return `
    SELECT
      id,
      query,
      location,
      status,
      policy_json AS policyJson,
      created_at AS createdAt,
      started_at AS startedAt,
      finished_at AS finishedAt,
      failed_at AS failedAt,
      last_heartbeat_at AS lastHeartbeatAt,
      discovered_count AS discoveredCount,
      processed_count AS processedCount,
      failed_count AS failedCount,
      failure_reason AS failureReason
    FROM jobs
    WHERE id = ?
  `;
}

function assertMutableJob(getById: (id: string) => JobRecord | null, id: string): JobRecord {
  const existing = getById(id);
  if (!existing) {
    throw new Error(`job not found: ${id}`);
  }

  if (existing.status === "completed" || existing.status === "failed") {
    throw new Error(`terminal jobs are immutable: ${id}`);
  }

  return existing;
}
