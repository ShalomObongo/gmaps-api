export type JobStatus = "queued" | "running" | "completed" | "failed";

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
