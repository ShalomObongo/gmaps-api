import { createHash } from "node:crypto";
import type { PlaceCandidate } from "../../storage/schema.js";

export function buildCanonicalPlaceKey(candidate: PlaceCandidate): string {
  if (candidate.placeId?.trim()) {
    return `pid:${candidate.placeId.trim()}`;
  }

  const normalizedName = normalizeText(candidate.name);
  const normalizedAddress = normalizeText(candidate.address ?? "");
  const normalizedLat = normalizeCoordinate(candidate.lat);
  const normalizedLng = normalizeCoordinate(candidate.lng);
  const digest = createHash("sha256")
    .update(`${normalizedName}|${normalizedAddress}|${normalizedLat}|${normalizedLng}`)
    .digest("hex");

  return `hash:${digest}`;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeCoordinate(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "";
  }

  return value.toFixed(5);
}
