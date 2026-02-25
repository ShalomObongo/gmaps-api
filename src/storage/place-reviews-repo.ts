import type { DatabaseHandle } from "./db.js";
import type { PlaceReview, PlaceReviewRecord } from "./schema.js";

export type InsertPlaceReviewsInput = {
  jobId: string;
  placeKey: string;
  reviews: PlaceReview[];
  collectedAt?: string;
};

export type PlaceReviewsRepo = {
  insertMany(input: InsertPlaceReviewsInput): number;
  listByJobAndPlace(jobId: string, placeKey: string): PlaceReviewRecord[];
};

export function createPlaceReviewsRepo(db: DatabaseHandle): PlaceReviewsRepo {
  const insert = db.prepare(`
    INSERT INTO place_reviews (
      job_id,
      place_key,
      review_id,
      sort_order,
      position,
      author_name,
      rating,
      text,
      published_at,
      collected_at
    )
    VALUES (
      @jobId,
      @placeKey,
      @reviewId,
      @sortOrder,
      @position,
      @authorName,
      @rating,
      @text,
      @publishedAt,
      @collectedAt
    )
    ON CONFLICT(job_id, place_key, review_id) DO NOTHING
  `);

  const listByJobAndPlace = db.prepare(`
    SELECT
      id,
      job_id AS jobId,
      place_key AS placeKey,
      review_id AS reviewId,
      sort_order AS sortOrder,
      position,
      author_name AS authorName,
      rating,
      text,
      published_at AS publishedAt,
      collected_at AS collectedAt
    FROM place_reviews
    WHERE job_id = ?
      AND place_key = ?
    ORDER BY position ASC, id ASC
  `);

  return {
    insertMany({ jobId, placeKey, reviews, collectedAt = new Date().toISOString() }) {
      if (reviews.length === 0) {
        return 0;
      }

      const runInsert = db.transaction(() => {
        let inserted = 0;
        for (const review of reviews) {
          const result = insert.run({
            jobId,
            placeKey,
            reviewId: review.reviewId,
            sortOrder: review.sortOrder,
            position: review.position,
            authorName: review.authorName,
            rating: review.rating,
            text: review.text,
            publishedAt: review.publishedAt,
            collectedAt
          });

          inserted += result.changes > 0 ? 1 : 0;
        }

        return inserted;
      });

      return runInsert();
    },
    listByJobAndPlace(jobId, placeKey) {
      return listByJobAndPlace.all(jobId, placeKey) as PlaceReviewRecord[];
    }
  };
}
