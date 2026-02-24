import { randomUUID } from "node:crypto";
import type { DatabaseHandle } from "./db.js";
import type { JobRecord, JobStatus } from "./schema.js";

export type CreateJobInput = {
  query: string;
  location?: string;
  status?: JobStatus;
  policyJson: string;
};

export type JobsRepo = {
  create(input: CreateJobInput): JobRecord;
  getById(id: string): JobRecord | null;
};

export function createJobsRepo(db: DatabaseHandle): JobsRepo {
  const insert = db.prepare(`
    INSERT INTO jobs (id, query, location, status, policy_json, created_at)
    VALUES (@id, @query, @location, @status, @policyJson, @createdAt)
  `);
  const byId = db.prepare(`
    SELECT id, query, location, status, policy_json AS policyJson, created_at AS createdAt
    FROM jobs
    WHERE id = ?
  `);

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
        createdAt: now
      };

      insert.run(record);
      return record;
    },
    getById(id) {
      const row = byId.get(id) as JobRecord | undefined;
      return row ?? null;
    }
  };
}
