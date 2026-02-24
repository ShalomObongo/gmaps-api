import type { JobInput } from "../../api/schemas/job-input.js";

export const DEFAULT_COLLECTION_CONTROLS = {
  maxScrollSteps: 20,
  maxViewportPans: 0
} as const;

export type NormalizedCollectionControls = {
  maxPlaces: number;
  maxScrollSteps: number;
  maxViewportPans: number;
};

export type NormalizedIntakeTarget = {
  source: JobInput["inputType"];
  query: string | null;
  location: string | null;
  placeId: string | null;
  collection: NormalizedCollectionControls;
};

export function normalizeIntakeInput(input: JobInput): NormalizedIntakeTarget {
  const collection = normalizeCollectionControls(input);

  if (input.inputType === "keyword_location") {
    return {
      source: input.inputType,
      query: input.query,
      location: input.location,
      placeId: null,
      collection
    };
  }

  if (input.inputType === "place_id") {
    return {
      source: input.inputType,
      query: null,
      location: null,
      placeId: input.placeId,
      collection
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
    collection
  };
}

function normalizeCollectionControls(input: JobInput): NormalizedCollectionControls {
  return {
    maxPlaces: input.collection.maxPlaces,
    maxScrollSteps: input.collection.maxScrollSteps ?? DEFAULT_COLLECTION_CONTROLS.maxScrollSteps,
    maxViewportPans: input.collection.maxViewportPans ?? DEFAULT_COLLECTION_CONTROLS.maxViewportPans
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
