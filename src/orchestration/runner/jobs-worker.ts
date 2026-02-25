import { runWithPolicy } from "../../crawler/runner.js";
import { resolveJobPolicy } from "../policy.js";
import type { JobsRepo, UpdateProgressInput } from "../../storage/jobs-repo.js";
import type { CollectionConfig, JobRecord, PlaceCandidate, ReviewConfig, ReviewSort } from "../../storage/schema.js";
import type { RuntimePolicyInput } from "../../config/runtime-defaults.js";
import type { PlacesRepo } from "../../storage/places-repo.js";
import type { PlaceReviewsRepo } from "../../storage/place-reviews-repo.js";
import { normalizePlaceRecord } from "../../crawler/maps/normalize-place-record.js";
import type { ExtractedPlaceDetails } from "../../crawler/maps/extract-place-details.js";
import { extractPlaceReviews, type NormalizedPlaceReview } from "../../crawler/maps/extract-place-reviews.js";
import {
  collectPlacesFromMaps,
  type CollectPlacesParams,
  type CollectStep
} from "../../crawler/maps/collect-places.js";
import { closeLiveDiscoverySession, discoverPlacesLive } from "../../crawler/maps/discover-places-live.js";

export type WorkerResult = {
  discoveredCount?: number;
  processedCount?: number;
  uniqueAcceptedCount?: number;
  failedCount?: number;
};

export type WorkerExecutionContext = {
  job: JobRecord;
  jobsRepo: JobsRepo;
  placesRepo: PlacesRepo;
  placeReviewsRepo: PlaceReviewsRepo;
};

export type WorkerExecuteJob = (context: WorkerExecutionContext) => Promise<WorkerResult | void>;

export type CreateJobsWorkerOptions = {
  jobsRepo: JobsRepo;
  placesRepo: PlacesRepo;
  placeReviewsRepo: PlaceReviewsRepo;
  pollIntervalMs?: number;
  heartbeatIntervalMs?: number;
  executeJob?: WorkerExecuteJob;
  discoverStep?: (step: CollectStep, job: JobRecord) => Promise<PlaceCandidate[]>;
  enrichCandidate?: (candidate: PlaceCandidate, job: JobRecord) => Promise<ExtractedPlaceDetails>;
  extractReviewsForPlace?: (input: ExtractReviewsForPlaceInput) => Promise<NormalizedPlaceReview[]>;
};

export type ExtractReviewsForPlaceInput = {
  candidate: PlaceCandidate;
  job: JobRecord;
  sort: ReviewSort;
  maxReviews: number;
};

export type JobsWorker = {
  start(): void;
  stop(): Promise<void>;
};

export function createJobsWorker(options: CreateJobsWorkerOptions): JobsWorker {
  const pollIntervalMs = Math.max(100, options.pollIntervalMs ?? 500);
  const heartbeatIntervalMs = Math.max(100, options.heartbeatIntervalMs ?? 1_000);
  const executeJob = options.executeJob ?? defaultExecuteJob;
  const discoverStep = options.discoverStep ?? defaultDiscoverStep;
  const enrichCandidate = options.enrichCandidate ?? defaultEnrichCandidate;
  const extractReviewsForPlace = options.extractReviewsForPlace ?? defaultExtractReviewsForPlace;

  let timer: NodeJS.Timeout | undefined;
  let inFlight = false;
  let shuttingDown = false;

  const tick = async () => {
    if (inFlight || shuttingDown) {
      return;
    }

    inFlight = true;
    try {
      await processNextJob(
        options.jobsRepo,
        options.placesRepo,
        options.placeReviewsRepo,
        executeJob,
        discoverStep,
        enrichCandidate,
        extractReviewsForPlace,
        heartbeatIntervalMs
      );
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
  placesRepo: PlacesRepo,
  placeReviewsRepo: PlaceReviewsRepo,
  executeJob: WorkerExecuteJob,
  discoverStep: (step: CollectStep, job: JobRecord) => Promise<PlaceCandidate[]>,
  enrichCandidate: (candidate: PlaceCandidate, job: JobRecord) => Promise<ExtractedPlaceDetails>,
  extractReviewsForPlace: (input: ExtractReviewsForPlaceInput) => Promise<NormalizedPlaceReview[]>,
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

    const runResult = await runWithPolicy(
      async () =>
        executeJob({
          job: claimedJob,
          jobsRepo,
          placesRepo,
          placeReviewsRepo
        }),
      {
        ...policy,
        pacingMs: Math.max(0, policy.pacingMs)
      }
    );
    let result = runResult.value ?? {};

    if (optionsUsesDefaultExecute(executeJob)) {
      result = await executeCollectorJob({
        job: claimedJob,
        placesRepo,
        discoverStep,
        enrichCandidate,
        placeReviewsRepo,
        extractReviewsForPlace,
        collectPlaces: collectPlacesFromMaps
      });
    }

    jobsRepo.markCompleted(claimedJob.id, {
      discoveredCount: result.discoveredCount,
      processedCount: result.uniqueAcceptedCount ?? result.processedCount,
      failedCount: result.failedCount
    });
  } catch (error) {
    jobsRepo.markFailed(claimedJob.id, {
      reason: (error as Error).message,
      failedCount: 1
    });
  } finally {
    clearInterval(heartbeatTimer);
    if (discoverStep === defaultDiscoverStep) {
      await closeDefaultDiscoverySession(claimedJob.id);
    }
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
  return {
    discoveredCount: 0,
    processedCount: 0,
    uniqueAcceptedCount: 0,
    failedCount: 0
  };
}

function optionsUsesDefaultExecute(executeJob: WorkerExecuteJob): boolean {
  return executeJob === defaultExecuteJob;
}

type ExecuteCollectorJobInput = {
  job: JobRecord;
  placesRepo: PlacesRepo;
  placeReviewsRepo: PlaceReviewsRepo;
  discoverStep: (step: CollectStep, job: JobRecord) => Promise<PlaceCandidate[]>;
  enrichCandidate: (candidate: PlaceCandidate, job: JobRecord) => Promise<ExtractedPlaceDetails>;
  extractReviewsForPlace: (input: ExtractReviewsForPlaceInput) => Promise<NormalizedPlaceReview[]>;
  collectPlaces: (params: CollectPlacesParams) => Promise<{
    candidates: PlaceCandidate[];
    discoveredCount: number;
  }>;
};

async function executeCollectorJob(input: ExecuteCollectorJobInput): Promise<WorkerResult> {
  const controls = parseCollectionConfig(input.job.collectionConfigJson);
  const reviewConfig = parseReviewConfig(input.job.reviewConfigJson);
  const collected = await input.collectPlaces({
    controls,
    discoverStep: (step) => input.discoverStep(step, input.job)
  });

  let uniqueAcceptedCount = 0;
  for (const candidate of collected.candidates) {
    const normalizedCore = normalizePlaceRecord(candidate);
    const details = await input.enrichCandidate(normalizedCore, input.job);
    const enrichedCandidate: PlaceCandidate = {
      ...normalizedCore,
      website: details.website,
      phone: details.phone,
      openingHoursJson: details.openingHoursJson
    };

    const inserted = input.placesRepo.insert({
      jobId: input.job.id,
      candidate: enrichedCandidate
    });

    if (inserted.inserted) {
      uniqueAcceptedCount += 1;

      if (reviewConfig.enabled && reviewConfig.maxReviews > 0) {
        try {
          const extracted = await input.extractReviewsForPlace({
            candidate: enrichedCandidate,
            job: input.job,
            sort: reviewConfig.sort,
            maxReviews: reviewConfig.maxReviews
          });
          const capped = extracted.slice(0, reviewConfig.maxReviews);
          if (capped.length > 0) {
            input.placeReviewsRepo.insertMany({
              jobId: input.job.id,
              placeKey: inserted.placeKey,
              reviews: capped
            });
          }
        } catch {
          // review extraction is best-effort per place
        }
      }
    }
  }

  return {
    discoveredCount: collected.discoveredCount,
    processedCount: uniqueAcceptedCount,
    uniqueAcceptedCount,
    failedCount: 0
  };
}

function parseReviewConfig(raw: string): ReviewConfig {
  const parsed = JSON.parse(raw) as Partial<ReviewConfig>;
  return {
    enabled: parsed.enabled ?? false,
    sort: parsed.sort ?? "newest",
    maxReviews: parsed.maxReviews ?? 0
  };
}

function parseCollectionConfig(raw: string): CollectionConfig {
  const parsed = JSON.parse(raw) as Partial<CollectionConfig>;
  return {
    maxPlaces: parsed.maxPlaces ?? 25,
    maxScrollSteps: parsed.maxScrollSteps ?? 20,
    maxViewportPans: parsed.maxViewportPans ?? 0
  };
}

async function defaultDiscoverStep(step: CollectStep, job: JobRecord): Promise<PlaceCandidate[]> {
  if (useStubDiscovery()) {
    const suffix = `${step.viewportPan}-${step.scrollStep}`;
    return [
      {
        placeId: `stub-${suffix}`,
        name: `Stub Place ${suffix}`,
        category: null,
        rating: null,
        reviewsCount: null,
        address: null,
        mapsUrl: null,
        lat: null,
        lng: null,
        website: null,
        phone: null,
        openingHoursJson: null
      }
    ];
  }

  return discoverPlacesLive(step, job);
}

async function closeDefaultDiscoverySession(jobId: string): Promise<void> {
  if (useStubDiscovery()) {
    return;
  }

  await closeLiveDiscoverySession(jobId);
}

function useStubDiscovery(): boolean {
  return process.env.NODE_ENV === "test" || process.env.GMAPS_USE_STUB_DISCOVERY === "1";
}

async function defaultEnrichCandidate(candidate: PlaceCandidate): Promise<ExtractedPlaceDetails> {
  return {
    website: null,
    phone: null,
    openingHoursJson: null
  };
}

async function defaultExtractReviewsForPlace(
  input: ExtractReviewsForPlaceInput
): Promise<NormalizedPlaceReview[]> {
  return extractPlaceReviews({
    sort: input.sort,
    maxReviews: input.maxReviews,
    fetchReviews: async () => []
  });
}
