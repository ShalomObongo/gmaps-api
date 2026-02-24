import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { jobInputSchema } from "../schemas/job-input.js";
import { resolveJobPolicy } from "../../orchestration/policy.js";
import type { JobsRepo } from "../../storage/jobs-repo.js";

const payloadSchema = z.object({
  query: z.string(),
  location: z.string().optional(),
  policy: z.unknown().optional()
});

export async function registerJobRoutes(app: FastifyInstance, jobsRepo: JobsRepo): Promise<void> {
  app.post(
    "/jobs",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute"
        }
      }
    },
    async (request, reply) => {
      const parsedPayload = payloadSchema.parse(request.body);
      const validatedInput = jobInputSchema.parse(parsedPayload);
      const policy = resolveJobPolicy(validatedInput.policy);

      const queuedJob = jobsRepo.create({
        query: validatedInput.query,
        location: validatedInput.location,
        status: "queued",
        policyJson: JSON.stringify(policy)
      });

      return reply.code(202).send({
        jobId: queuedJob.id,
        status: queuedJob.status,
        policy
      });
    }
  );
}
