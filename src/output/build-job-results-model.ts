import type { JobRecord } from "../storage/schema.js";
import type { JobsRepo } from "../storage/jobs-repo.js";
import type { PlaceReviewsRepo } from "../storage/place-reviews-repo.js";
import type { PlacesRepo } from "../storage/places-repo.js";

export type JobResultReview = {
  reviewId: string;
  sortOrder: string;
  position: number;
  authorName: string | null;
  rating: number | null;
  text: string | null;
  publishedAt: string | null;
  collectedAt: string;
};

export type JobResultPlace = {
  placeKey: string;
  placeId: string | null;
  name: string;
  category: string | null;
  rating: number | null;
  reviewsCount: number | null;
  address: string | null;
  mapsUrl: string | null;
  lat: number | null;
  lng: number | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  openingHoursJson: string | null;
  discoveredAt: string;
  reviews: JobResultReview[];
};

export type CompletedJobResultsModel = {
  jobId: string;
  status: "completed";
  timestamps: {
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
    failedAt: string | null;
    lastHeartbeatAt: string | null;
  };
  progress: {
    discoveredCount: number;
    processedCount: number;
    uniqueAcceptedCount: number;
    failedCount: number;
    failureReason: string | null;
  };
  results: {
    places: JobResultPlace[];
  };
};

export type BuildJobResultsModelResult =
  | {
      kind: "not_found";
      jobId: string;
    }
  | {
      kind: "not_ready";
      job: JobRecord;
    }
  | {
      kind: "completed";
      model: CompletedJobResultsModel;
    };

export type BuildJobResultsModelDeps = {
  jobsRepo: JobsRepo;
  placesRepo: PlacesRepo;
  placeReviewsRepo: PlaceReviewsRepo;
};

export function buildJobResultsModel(
  jobId: string,
  deps: BuildJobResultsModelDeps
): BuildJobResultsModelResult {
  const job = deps.jobsRepo.getById(jobId);
  if (!job) {
    return { kind: "not_found", jobId };
  }

  if (job.status !== "completed") {
    return { kind: "not_ready", job };
  }

  const places = deps.placesRepo.listByJob(job.id);
  const reviews = deps.placeReviewsRepo.listByJob(job.id);
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
    kind: "completed",
    model: {
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
          email: place.email,
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
    }
  };
}
