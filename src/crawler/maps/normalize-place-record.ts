import { z } from "zod";
import type { PlaceCandidate } from "../../storage/schema.js";

export const PlaceRecordSchema = z.strictObject({
  placeId: z.string().nullable(),
  name: z.string().min(1),
  category: z.string().nullable(),
  rating: z.number().nullable(),
  reviewsCount: z.number().int().nullable(),
  address: z.string().nullable(),
  mapsUrl: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  website: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  openingHoursJson: z.string().nullable()
});

export type NormalizePlaceRecordInput = {
  placeId?: unknown;
  name?: unknown;
  category?: unknown;
  rating?: unknown;
  reviewsCount?: unknown;
  address?: unknown;
  mapsUrl?: unknown;
  lat?: unknown;
  lng?: unknown;
  website?: unknown;
  email?: unknown;
  phone?: unknown;
  openingHoursJson?: unknown;
};

export function normalizePlaceRecord(input: NormalizePlaceRecordInput): PlaceCandidate {
  return PlaceRecordSchema.parse({
    placeId: normalizeNullableText(input.placeId),
    name: normalizeName(input.name),
    category: normalizeNullableText(input.category),
    rating: normalizeNullableNumber(input.rating),
    reviewsCount: normalizeNullableInteger(input.reviewsCount),
    address: normalizeNullableText(input.address),
    mapsUrl: normalizeNullableText(input.mapsUrl),
    lat: normalizeNullableNumber(input.lat),
    lng: normalizeNullableNumber(input.lng),
    website: normalizeNullableText(input.website),
    email: normalizeNullableText(input.email),
    phone: normalizeNullableText(input.phone),
    openingHoursJson: normalizeNullableText(input.openingHoursJson)
  });
}

function normalizeName(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("name is required");
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new Error("name is required");
  }

  return normalized;
}

function normalizeNullableText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeNullableNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(/,/g, "");
    if (!normalized) {
      return null;
    }

    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeNullableInteger(value: unknown): number | null {
  const parsed = normalizeNullableNumber(value);
  if (parsed === null) {
    return null;
  }

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.round(parsed);
}
