export type JobStatus = "queued" | "running" | "completed" | "failed";

export type CollectionConfig = {
  maxPlaces: number;
  maxScrollSteps: number;
  maxViewportPans: number;
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
  address: string | null;
  mapsUrl: string | null;
  lat: number | null;
  lng: number | null;
};

export type PlaceRecord = PlaceCandidate & {
  id: number;
  jobId: string;
  placeKey: string;
  discoveredAt: string;
};
