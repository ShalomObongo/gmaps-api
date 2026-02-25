export type JobStatus = "queued" | "running" | "completed" | "failed";

export type CollectionConfig = {
  maxPlaces: number;
  maxScrollSteps: number;
  maxViewportPans: number;
};

export type ReviewSort = "newest" | "most_relevant" | "highest_rating" | "lowest_rating";

export type ReviewConfig = {
  enabled: boolean;
  sort: ReviewSort;
  maxReviews: number;
};

export type JobProgress = {
  discoveredCount: number;
  processedCount: number;
  failedCount: number;
  startedAt: string | null;
  finishedAt: string | null;
  failedAt: string | null;
  lastHeartbeatAt: string | null;
  failureReason: string | null;
};

export type JobRecord = {
  id: string;
  query: string;
  location: string | null;
  status: JobStatus;
  policyJson: string;
  collectionConfigJson: string;
  reviewConfigJson: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  failedAt: string | null;
  lastHeartbeatAt: string | null;
  discoveredCount: number;
  processedCount: number;
  failedCount: number;
  failureReason: string | null;
};

export type PlaceCandidate = {
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
};

export type PlaceRecord = PlaceCandidate & {
  id: number;
  jobId: string;
  placeKey: string;
  discoveredAt: string;
};

export type PlaceReview = {
  reviewId: string;
  sortOrder: ReviewSort;
  position: number;
  authorName: string | null;
  rating: number | null;
  text: string | null;
  publishedAt: string | null;
};

export type PlaceReviewRecord = PlaceReview & {
  id: number;
  jobId: string;
  placeKey: string;
  collectedAt: string;
};
