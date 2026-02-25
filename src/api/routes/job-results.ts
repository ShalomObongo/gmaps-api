import type { FastifyInstance } from "fastify";
import type { JobsRepo } from "../../storage/jobs-repo.js";
import type { PlaceReviewsRepo } from "../../storage/place-reviews-repo.js";
import type { PlacesRepo } from "../../storage/places-repo.js";

export async function registerJobResultsRoutes(
  app: FastifyInstance,
  jobsRepo: JobsRepo,
  placesRepo: PlacesRepo,
  placeReviewsRepo: PlaceReviewsRepo
): Promise<void> {
  app.get(
    "/jobs/:id/results",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" }
          }
        },
        response: {
          200: {
            type: "object",
            required: ["jobId", "status", "timestamps", "progress", "results"],
            properties: {
              jobId: { type: "string" },
              status: { const: "completed", type: "string" },
              timestamps: {
                type: "object",
                required: ["createdAt", "startedAt", "finishedAt", "failedAt", "lastHeartbeatAt"],
                properties: {
                  createdAt: { type: "string" },
                  startedAt: { anyOf: [{ type: "string" }, { type: "null" }] },
                  finishedAt: { anyOf: [{ type: "string" }, { type: "null" }] },
                  failedAt: { anyOf: [{ type: "string" }, { type: "null" }] },
                  lastHeartbeatAt: { anyOf: [{ type: "string" }, { type: "null" }] }
                }
              },
              progress: {
                type: "object",
                required: ["discoveredCount", "processedCount", "uniqueAcceptedCount", "failedCount", "failureReason"],
                properties: {
                  discoveredCount: { type: "number" },
                  processedCount: { type: "number" },
                  uniqueAcceptedCount: { type: "number" },
                  failedCount: { type: "number" },
                  failureReason: { anyOf: [{ type: "string" }, { type: "null" }] }
                }
              },
              results: {
                type: "object",
                required: ["places"],
                properties: {
                  places: {
                    type: "array",
                    items: {
                      type: "object",
                      required: [
                        "placeKey",
                        "placeId",
                        "name",
                        "category",
                        "rating",
                        "reviewsCount",
                        "address",
                        "mapsUrl",
                        "lat",
                        "lng",
                        "website",
                        "phone",
                        "openingHoursJson",
                        "discoveredAt",
                        "reviews"
                      ],
                      properties: {
                        placeKey: { type: "string" },
                        placeId: { anyOf: [{ type: "string" }, { type: "null" }] },
                        name: { type: "string" },
                        category: { anyOf: [{ type: "string" }, { type: "null" }] },
                        rating: { anyOf: [{ type: "number" }, { type: "null" }] },
                        reviewsCount: { anyOf: [{ type: "number" }, { type: "null" }] },
                        address: { anyOf: [{ type: "string" }, { type: "null" }] },
                        mapsUrl: { anyOf: [{ type: "string" }, { type: "null" }] },
                        lat: { anyOf: [{ type: "number" }, { type: "null" }] },
                        lng: { anyOf: [{ type: "number" }, { type: "null" }] },
                        website: { anyOf: [{ type: "string" }, { type: "null" }] },
                        phone: { anyOf: [{ type: "string" }, { type: "null" }] },
                        openingHoursJson: { anyOf: [{ type: "string" }, { type: "null" }] },
                        discoveredAt: { type: "string" },
                        reviews: {
                          type: "array",
                          items: {
                            type: "object",
                            required: [
                              "reviewId",
                              "sortOrder",
                              "position",
                              "authorName",
                              "rating",
                              "text",
                              "publishedAt",
                              "collectedAt"
                            ],
                            properties: {
                              reviewId: { type: "string" },
                              sortOrder: { type: "string" },
                              position: { type: "number" },
                              authorName: { anyOf: [{ type: "string" }, { type: "null" }] },
                              rating: { anyOf: [{ type: "number" }, { type: "null" }] },
                              text: { anyOf: [{ type: "string" }, { type: "null" }] },
                              publishedAt: { anyOf: [{ type: "string" }, { type: "null" }] },
                              collectedAt: { type: "string" }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
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
      const job = jobsRepo.getById(params.id);

      if (!job) {
        return reply.code(404).send({
          error: "not_found",
          message: `job not found: ${params.id}`
        });
      }

      if (job.status !== "completed") {
        return reply.code(409).send({
          error: "results_not_ready",
          jobId: job.id,
          status: job.status,
          message: "results are available only for completed jobs",
          failureReason: job.failureReason
        });
      }

      const places = placesRepo.listByJob(job.id);
      const reviews = placeReviewsRepo.listByJob(job.id);
      const reviewsByPlace = new Map<string, typeof reviews>();
      for (const review of reviews) {
        const existing = reviewsByPlace.get(review.placeKey);
        if (existing) {
          existing.push(review);
        } else {
          reviewsByPlace.set(review.placeKey, [review]);
        }
      }

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
          uniqueAcceptedCount: job.processedCount,
          failedCount: job.failedCount,
          failureReason: job.failureReason
        },
        results: {
          places: places.map((place) => ({
            placeKey: place.placeKey,
            placeId: place.placeId,
            name: place.name,
            category: place.category,
            rating: place.rating,
            reviewsCount: place.reviewsCount,
            address: place.address,
            mapsUrl: place.mapsUrl,
            lat: place.lat,
            lng: place.lng,
            website: place.website,
            phone: place.phone,
            openingHoursJson: place.openingHoursJson,
            discoveredAt: place.discoveredAt,
            reviews: (reviewsByPlace.get(place.placeKey) ?? []).map((review) => ({
              reviewId: review.reviewId,
              sortOrder: review.sortOrder,
              position: review.position,
              authorName: review.authorName,
              rating: review.rating,
              text: review.text,
              publishedAt: review.publishedAt,
              collectedAt: review.collectedAt
            }))
          }))
        }
      };
    }
  );
}
