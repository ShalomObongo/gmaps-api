import { writeToString } from "@fast-csv/format";
import type { CompletedJobResultsModel } from "../build-job-results-model.js";

export const JOB_RESULTS_CSV_HEADERS = [
  "jobId",
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
  "reviewsJson"
] as const;

type JobResultsCsvRow = {
  jobId: string;
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
  phone: string | null;
  openingHoursJson: string | null;
  discoveredAt: string;
  reviewsJson: string;
};

export async function serializeJobResultsCsv(model: CompletedJobResultsModel): Promise<string> {
  const rows: JobResultsCsvRow[] = model.results.places.map((place) => ({
    jobId: model.jobId,
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
    reviewsJson: JSON.stringify(place.reviews)
  }));

  return writeToString(rows, {
    headers: [...JOB_RESULTS_CSV_HEADERS],
    alwaysWriteHeaders: true,
    includeEndRowDelimiter: true
  });
}
