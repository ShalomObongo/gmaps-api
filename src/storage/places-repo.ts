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
      address,
      maps_url,
      lat,
      lng,
      discovered_at
    )
    VALUES (
      @jobId,
      @placeKey,
      @placeId,
      @name,
      @address,
      @mapsUrl,
      @lat,
      @lng,
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
      address,
      maps_url AS mapsUrl,
      lat,
      lng,
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
        address: candidate.address,
        mapsUrl: candidate.mapsUrl,
        lat: candidate.lat,
        lng: candidate.lng,
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
