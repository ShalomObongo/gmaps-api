import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { jobInputSchema } from "../schemas/job-input.js";
import { resolveJobPolicy } from "../../orchestration/policy.js";
import { GUARDRAIL_NOTICE } from "../../safety/guardrails.js";
import { resolveSensitiveFieldPolicy } from "../../safety/sensitive-fields.js";
import type { JobsRepo } from "../../storage/jobs-repo.js";
import { normalizeIntakeInput } from "../../orchestration/intake/normalize-intake.js";
import type { JobInput } from "../schemas/job-input.js";
import type { NormalizedIntakeTarget } from "../../orchestration/intake/normalize-intake.js";

const payloadSchema = z.unknown();

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
      let validatedInput: JobInput;
      try {
        const parsedPayload = payloadSchema.parse(request.body);
        validatedInput = jobInputSchema.parse(parsedPayload);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: "invalid_request",
            message: z.prettifyError(error)
          });
        }
        throw error;
      }

      let normalizedTarget: NormalizedIntakeTarget;
      try {
        normalizedTarget = normalizeIntakeInput(validatedInput);
      } catch (error) {
        return reply.code(400).send({
          error: "invalid_request",
          message: (error as Error).message
        });
      }

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
        query: normalizedTarget.query ?? `place_id:${normalizedTarget.placeId}`,
        location: normalizedTarget.location ?? undefined,
        status: "queued",
        policyJson: JSON.stringify(policy)
      });

      return reply.code(202).send({
        jobId: queuedJob.id,
        status: queuedJob.status,
        policy,
        input: {
          inputType: normalizedTarget.source,
          query: normalizedTarget.query,
          location: normalizedTarget.location,
          placeId: normalizedTarget.placeId
        },
        fields: sensitivePolicy.fields,
        guardrails: {
          notice: GUARDRAIL_NOTICE,
          rateLimit: "global:60/min route:/jobs:10/min"
        }
      });
    }
  );
}
