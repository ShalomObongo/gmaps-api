import { runWithPolicy } from "../../crawler/runner.js";
import { resolveJobPolicy } from "../policy.js";
import type { JobsRepo, UpdateProgressInput } from "../../storage/jobs-repo.js";
import type { JobRecord } from "../../storage/schema.js";
import type { RuntimePolicyInput } from "../../config/runtime-defaults.js";

export type WorkerResult = {
  discoveredCount?: number;
  processedCount?: number;
  failedCount?: number;
};

export type WorkerExecutionContext = {
  job: JobRecord;
  jobsRepo: JobsRepo;
};

export type WorkerExecuteJob = (context: WorkerExecutionContext) => Promise<WorkerResult | void>;

export type CreateJobsWorkerOptions = {
  jobsRepo: JobsRepo;
  pollIntervalMs?: number;
  heartbeatIntervalMs?: number;
  executeJob?: WorkerExecuteJob;
};

export type JobsWorker = {
  start(): void;
  stop(): Promise<void>;
};

export function createJobsWorker(options: CreateJobsWorkerOptions): JobsWorker {
  const pollIntervalMs = Math.max(100, options.pollIntervalMs ?? 500);
  const heartbeatIntervalMs = Math.max(100, options.heartbeatIntervalMs ?? 1_000);
  const executeJob = options.executeJob ?? defaultExecuteJob;

  let timer: NodeJS.Timeout | undefined;
  let inFlight = false;
  let shuttingDown = false;

  const tick = async () => {
    if (inFlight || shuttingDown) {
      return;
    }

    inFlight = true;
    try {
      await processNextJob(options.jobsRepo, executeJob, heartbeatIntervalMs);
    } finally {
      inFlight = false;
    }
  };

  return {
    start() {
      if (timer) {
        return;
      }

      void tick();
      timer = setInterval(() => {
        void tick();
      }, pollIntervalMs);
    },
    async stop() {
      shuttingDown = true;
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }

      while (inFlight) {
        await new Promise<void>((resolve) => setTimeout(resolve, 10));
      }
    }
  };
}

async function processNextJob(
  jobsRepo: JobsRepo,
  executeJob: WorkerExecuteJob,
  heartbeatIntervalMs: number
): Promise<void> {
  const claimedJob = jobsRepo.claimNextQueued();
  if (!claimedJob) {
    return;
  }

  const heartbeatTimer = setInterval(() => {
    safeUpdateProgress(jobsRepo, claimedJob.id, { lastHeartbeatAt: new Date().toISOString() });
  }, heartbeatIntervalMs);

  try {
    const policy = resolveJobPolicy(JSON.parse(claimedJob.policyJson) as RuntimePolicyInput);
    safeUpdateProgress(jobsRepo, claimedJob.id, { lastHeartbeatAt: new Date().toISOString() });

    const runResult = await runWithPolicy(async () => executeJob({ job: claimedJob, jobsRepo }), {
      ...policy,
      pacingMs: Math.max(0, policy.pacingMs)
    });
    const result = runResult.value ?? {};

    jobsRepo.markCompleted(claimedJob.id, {
      discoveredCount: result.discoveredCount,
      processedCount: result.processedCount,
      failedCount: result.failedCount
    });
  } catch (error) {
    jobsRepo.markFailed(claimedJob.id, {
      reason: (error as Error).message,
      failedCount: 1
    });
  } finally {
    clearInterval(heartbeatTimer);
  }
}

function safeUpdateProgress(jobsRepo: JobsRepo, jobId: string, update: UpdateProgressInput): void {
  try {
    jobsRepo.updateProgress(jobId, update);
  } catch {
    // no-op when job has already transitioned
  }
}

async function defaultExecuteJob(): Promise<WorkerResult> {
  await new Promise<void>((resolve) => setTimeout(resolve, 25));
  return {
    discoveredCount: 1,
    processedCount: 1,
    failedCount: 0
  };
}
