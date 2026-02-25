import { createHash } from "node:crypto";
import type { ReviewSort } from "../../storage/schema.js";

export type NormalizedPlaceReview = {
  reviewId: string;
  sortOrder: ReviewSort;
  position: number;
  authorName: string | null;
  rating: number | null;
  text: string | null;
  publishedAt: string | null;
};

export type RawPlaceReview = {
  reviewId?: string | null;
  authorName?: string | null;
  rating?: number | string | null;
  text?: string | null;
  publishedAt?: string | null;
};

export type ExtractPlaceReviewsParams = {
  sort: ReviewSort;
  maxReviews: number;
  fetchReviews: (sortToken: string) => Promise<RawPlaceReview[]>;
};

const SORT_TO_TOKEN: Record<ReviewSort, string> = {
  newest: "newest",
  most_relevant: "relevant",
  highest_rating: "highest",
  lowest_rating: "lowest"
};

export async function extractPlaceReviews(params: ExtractPlaceReviewsParams): Promise<NormalizedPlaceReview[]> {
  if (params.maxReviews <= 0) {
    return [];
  }

  const sortToken = SORT_TO_TOKEN[params.sort];
  const raw = await params.fetchReviews(sortToken);
  const accepted: NormalizedPlaceReview[] = [];

  for (const candidate of raw) {
    if (accepted.length >= params.maxReviews) {
      break;
    }

    const position = accepted.length + 1;
    accepted.push({
      reviewId: resolveReviewId(candidate, position),
      sortOrder: params.sort,
      position,
      authorName: normalizeText(candidate.authorName),
      rating: normalizeRating(candidate.rating),
      text: normalizeText(candidate.text),
      publishedAt: normalizeText(candidate.publishedAt)
    });
  }

  return accepted;
}

function resolveReviewId(candidate: RawPlaceReview, position: number): string {
  const explicit = normalizeText(candidate.reviewId);
  if (explicit) {
    return explicit;
  }

  const fingerprint = [candidate.authorName, candidate.text, candidate.publishedAt, position]
    .map((value) => normalizeText(value) ?? "")
    .join("|");
  return `generated-${createHash("sha1").update(fingerprint).digest("hex")}`;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
}

function normalizeRating(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
