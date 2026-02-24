import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { jobInputSchema } from "../schemas/job-input.js";
import { resolveJobPolicy } from "../../orchestration/policy.js";
import { GUARDRAIL_NOTICE } from "../../safety/guardrails.js";
import { resolveSensitiveFieldPolicy } from "../../safety/sensitive-fields.js";
import type { JobsRepo } from "../../storage/jobs-repo.js";

const payloadSchema = z.object({
  query: z.string(),
  location: z.string().optional(),
  policy: z.unknown().optional(),
  includeSensitiveFields: z.boolean().optional(),
  requestedFields: z.array(z.string()).optional()
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

      let sensitivePolicy;
      try {
        sensitivePolicy = resolveSensitiveFieldPolicy({
          includeSensitiveFields:
            validatedInput.includeSensitiveFields ?? validatedInput.policy?.includeSensitiveFields,
          requestedFields: validatedInput.requestedFields
        });
      } catch (error) {
        return reply.code(400).send({
          error: "unsafe_request",
          message: (error as Error).message
        });
      }

      const policy = resolveJobPolicy({
        ...validatedInput.policy,
        includeSensitiveFields: sensitivePolicy.includeSensitiveFields
      });

      const queuedJob = jobsRepo.create({
        query: validatedInput.query,
        location: validatedInput.location,
        status: "queued",
        policyJson: JSON.stringify(policy)
      });

      return reply.code(202).send({
        jobId: queuedJob.id,
        status: queuedJob.status,
        policy,
        fields: sensitivePolicy.fields,
        guardrails: {
          notice: GUARDRAIL_NOTICE,
          rateLimit: "global:60/min route:/jobs:10/min"
        }
      });
    }
  );
}
