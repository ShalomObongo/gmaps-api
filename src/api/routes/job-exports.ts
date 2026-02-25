import type { FastifyInstance } from "fastify";
import type { JobsRepo } from "../../storage/jobs-repo.js";
import type { PlaceReviewsRepo } from "../../storage/place-reviews-repo.js";
import type { PlacesRepo } from "../../storage/places-repo.js";
import { buildJobResultsModel } from "../../output/build-job-results-model.js";
import { serializeJobResultsCsv } from "../../output/serializers/job-results-csv.js";

type ExportFormat = "json" | "csv";

export async function registerJobExportsRoutes(
  app: FastifyInstance,
  jobsRepo: JobsRepo,
  placesRepo: PlacesRepo,
  placeReviewsRepo: PlaceReviewsRepo
): Promise<void> {
  app.get(
    "/jobs/:id/exports",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" }
          }
        },
        querystring: {
          type: "object",
          properties: {
            format: { enum: ["json", "csv"], type: "string", default: "json" }
          }
        },
        response: {
          404: {
            type: "object",
            required: ["error", "message"],
            properties: {
              error: { const: "not_found", type: "string" },
              message: { type: "string" }
            }
          },
          409: {
            type: "object",
            required: ["error", "jobId", "status", "message"],
            properties: {
              error: { const: "results_not_ready", type: "string" },
              jobId: { type: "string" },
              status: { enum: ["queued", "running", "failed"], type: "string" },
              message: { type: "string" },
              failureReason: { anyOf: [{ type: "string" }, { type: "null" }] }
            }
          }
        }
      }
    },
    async (request, reply) => {
      const params = request.params as { id: string };
      const query = request.query as { format?: ExportFormat };
      const format = query.format ?? "json";
      const result = buildJobResultsModel(params.id, {
        jobsRepo,
        placesRepo,
        placeReviewsRepo
      });

      if (result.kind === "not_found") {
        return reply.code(404).send({
          error: "not_found",
          message: `job not found: ${params.id}`
        });
      }

      if (result.kind === "not_ready") {
        return reply.code(409).send({
          error: "results_not_ready",
          jobId: result.job.id,
          status: result.job.status,
          message: "results are available only for completed jobs",
          failureReason: result.job.failureReason
        });
      }

      if (format === "csv") {
        const csv = await serializeJobResultsCsv(result.model);
        return reply
          .type("text/csv; charset=utf-8")
          .header("content-disposition", `attachment; filename=\"job-${params.id}.csv\"`)
          .send(csv);
      }

      return reply
        .type("application/json")
        .header("content-disposition", `attachment; filename=\"job-${params.id}.json\"`)
        .send(result.model);
    }
  );
}
