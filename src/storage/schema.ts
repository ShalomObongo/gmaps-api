export type JobStatus = "queued" | "running" | "completed" | "failed";

export type JobRecord = {
  id: string;
  query: string;
  location: string | null;
  status: JobStatus;
  policyJson: string;
  createdAt: string;
};
