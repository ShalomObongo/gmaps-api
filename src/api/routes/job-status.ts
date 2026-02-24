import type { FastifyInstance } from "fastify";
import type { JobsRepo } from "../../storage/jobs-repo.js";

export async function registerJobStatusRoutes(
  app: FastifyInstance,
  jobsRepo: JobsRepo
): Promise<void> {
  app.get("/jobs/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const job = jobsRepo.getById(params.id);

    if (!job) {
      return reply.code(404).send({
        error: "not_found",
        message: `job not found: ${params.id}`
      });
    }

    const now = Date.now();
    const startedAtMs = job.startedAt ? Date.parse(job.startedAt) : null;
    const finishedAtMs = job.finishedAt ? Date.parse(job.finishedAt) : null;
    const lastHeartbeatAtMs = job.lastHeartbeatAt ? Date.parse(job.lastHeartbeatAt) : null;

    return {
      jobId: job.id,
      status: job.status,
      timestamps: {
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
        failedAt: job.failedAt,
        lastHeartbeatAt: job.lastHeartbeatAt
      },
      progress: {
        discoveredCount: job.discoveredCount,
        processedCount: job.processedCount,
        failedCount: job.failedCount,
        failureReason: job.failureReason
      },
      metrics: {
        elapsedMs:
          startedAtMs === null ? null : Math.max(0, (finishedAtMs ?? now) - startedAtMs),
        heartbeatAgeMs:
          lastHeartbeatAtMs === null ? null : Math.max(0, now - lastHeartbeatAtMs)
      }
    };
  });
}
