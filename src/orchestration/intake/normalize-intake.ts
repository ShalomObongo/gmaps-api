import type { JobInput } from "../../api/schemas/job-input.js";
import type { ReviewSort } from "../../storage/schema.js";

export const DEFAULT_COLLECTION_CONTROLS = {
  maxScrollSteps: 20,
  maxViewportPans: 0
} as const;

export const DEFAULT_REVIEW_CONTROLS = {
  enabled: false,
  sort: "newest" as ReviewSort,
  maxReviews: 0
} as const;

export type NormalizedCollectionControls = {
  maxPlaces: number;
  maxScrollSteps: number;
  maxViewportPans: number;
};

export type NormalizedReviewControls = {
  enabled: boolean;
  sort: ReviewSort;
  maxReviews: number;
};

export type NormalizedIntakeTarget = {
  source: JobInput["inputType"];
  query: string | null;
  location: string | null;
  placeId: string | null;
  collection: NormalizedCollectionControls;
  reviews: NormalizedReviewControls;
};

export function normalizeIntakeInput(input: JobInput): NormalizedIntakeTarget {
  const collection = normalizeCollectionControls(input);
  const reviews = normalizeReviewControls(input);

  if (input.inputType === "keyword_location") {
    return {
      source: input.inputType,
      query: input.query,
      location: input.location,
      placeId: null,
      collection,
      reviews
    };
  }

  if (input.inputType === "place_id") {
    return {
      source: input.inputType,
      query: null,
      location: null,
      placeId: input.placeId,
      collection,
      reviews
    };
  }

  const parsed = new URL(input.mapsUrl);
  if (!isCanonicalMapsSearchUrl(parsed)) {
    throw new Error(
      "mapsUrl must use canonical Google Maps search format: https://www.google.com/maps/search/?api=1&query=..."
    );
  }

  const query = parsed.searchParams.get("query")?.trim();
  if (!query) {
    throw new Error("mapsUrl is missing required query parameter: query");
  }

  const placeId = parsed.searchParams.get("query_place_id")?.trim();

  return {
    source: input.inputType,
    query,
    location: null,
    placeId: placeId?.length ? placeId : null,
    collection,
    reviews
  };
}

function normalizeCollectionControls(input: JobInput): NormalizedCollectionControls {
  return {
    maxPlaces: input.collection.maxPlaces,
    maxScrollSteps: input.collection.maxScrollSteps ?? DEFAULT_COLLECTION_CONTROLS.maxScrollSteps,
    maxViewportPans: input.collection.maxViewportPans ?? DEFAULT_COLLECTION_CONTROLS.maxViewportPans
  };
}

function normalizeReviewControls(input: JobInput): NormalizedReviewControls {
  return {
    enabled: input.reviews?.enabled ?? DEFAULT_REVIEW_CONTROLS.enabled,
    sort: input.reviews?.sort ?? DEFAULT_REVIEW_CONTROLS.sort,
    maxReviews: input.reviews?.maxReviews ?? DEFAULT_REVIEW_CONTROLS.maxReviews
  };
}

function isCanonicalMapsSearchUrl(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();
  const pathname = url.pathname.toLowerCase();

  const isGoogleHost = hostname === "google.com" || hostname.endsWith(".google.com");
  if (!isGoogleHost) {
    return false;
  }

  if (pathname !== "/maps/search" && pathname !== "/maps/search/") {
    return false;
  }

  return url.searchParams.get("api") === "1";
}
