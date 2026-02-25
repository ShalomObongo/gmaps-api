import type { DatabaseHandle } from "./db.js";
import type { PlaceCandidate, PlaceRecord } from "./schema.js";
import { buildCanonicalPlaceKey } from "../orchestration/coverage/place-key.js";

export type InsertPlaceInput = {
  jobId: string;
  candidate: PlaceCandidate;
  discoveredAt?: string;
};

export type InsertPlaceResult = {
  inserted: boolean;
  placeKey: string;
};

export type PlacesRepo = {
  insert(input: InsertPlaceInput): InsertPlaceResult;
  listByJob(jobId: string): PlaceRecord[];
};

export function createPlacesRepo(db: DatabaseHandle): PlacesRepo {
  const insert = db.prepare(`
    INSERT INTO places (
      job_id,
      place_key,
      place_id,
      name,
      category,
      rating,
      reviews_count,
      address,
      maps_url,
      lat,
      lng,
      website,
      email,
      phone,
      opening_hours_json,
      discovered_at
    )
    VALUES (
      @jobId,
      @placeKey,
      @placeId,
      @name,
      @category,
      @rating,
      @reviewsCount,
      @address,
      @mapsUrl,
      @lat,
      @lng,
      @website,
      @email,
      @phone,
      @openingHoursJson,
      @discoveredAt
    )
    ON CONFLICT(job_id, place_key) DO NOTHING
  `);

  const listByJob = db.prepare(`
    SELECT
      id,
      job_id AS jobId,
      place_key AS placeKey,
      place_id AS placeId,
      name,
      category,
      rating,
      reviews_count AS reviewsCount,
      address,
      maps_url AS mapsUrl,
      lat,
      lng,
      website,
      email,
      phone,
      opening_hours_json AS openingHoursJson,
      discovered_at AS discoveredAt
    FROM places
    WHERE job_id = ?
    ORDER BY id ASC
  `);

  return {
    insert({ jobId, candidate, discoveredAt = new Date().toISOString() }) {
      const placeKey = buildCanonicalPlaceKey(candidate);
      const result = insert.run({
        jobId,
        placeKey,
        placeId: candidate.placeId,
        name: candidate.name,
        category: candidate.category,
        rating: candidate.rating,
        reviewsCount: candidate.reviewsCount,
        address: candidate.address,
        mapsUrl: candidate.mapsUrl,
        lat: candidate.lat,
        lng: candidate.lng,
        website: candidate.website,
        email: candidate.email,
        phone: candidate.phone,
        openingHoursJson: candidate.openingHoursJson,
        discoveredAt
      });

      return {
        inserted: result.changes > 0,
        placeKey
      };
    },
    listByJob(jobId) {
      return listByJob.all(jobId) as PlaceRecord[];
    }
  };
}
