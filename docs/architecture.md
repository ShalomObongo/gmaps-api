# Architecture Overview

This document maps the current runtime composition and data flow implemented in the codebase.

## Runtime composition

Server assembly happens in `src/server.ts`.

At startup, the server:

1. Loads environment config (`src/config/env.ts`).
2. Creates SQLite-backed repositories (`src/storage/*-repo.ts`).
3. Registers API plugins/routes:
   - `registerRateLimitPlugin`
   - `registerUiRoutes`
   - `registerJobRoutes`
   - `registerJobStatusRoutes`
   - `registerJobResultsRoutes`
   - `registerJobExportsRoutes`
4. Starts the background worker via `createJobsWorker`.

`/health` returns service liveness and the guardrail notice.

## Module boundaries

## 1) API layer (`src/api`)

- Validates and normalizes incoming payloads.
- Persists queued jobs.
- Exposes job status, results, and export endpoints.
- Serves the Control Center UI at `/` and `/ui`.
- Enforces rate limits and request-level guardrail behavior.

Important files:

- `src/api/routes/jobs.ts`
- `src/api/routes/job-status.ts`
- `src/api/routes/job-results.ts`
- `src/api/routes/job-exports.ts`
- `src/api/schemas/job-input.ts`

## 2) Orchestration layer (`src/orchestration`)

- Resolves runtime policy (`src/orchestration/policy.ts`).
- Normalizes intake targets (`src/orchestration/intake/normalize-intake.ts`).
- Runs background polling/execution (`src/orchestration/runner/jobs-worker.ts`).

Worker responsibilities:

- Claim next queued job.
- Update heartbeat/progress while processing.
- Run collection under retry/backoff policy.
- Mark jobs `completed` or `failed`.

## 3) Crawler layer (`src/crawler`)

- Discovers place candidates.
- Enriches place details (website/email/phone/opening hours).
- Extracts reviews when enabled.

Collection and enrichment are invoked from `jobs-worker.ts` through functions such as:

- `collectPlacesFromMaps`
- `discoverPlacesLive`
- `enrichPlaceLive`
- `extractPlaceReviews`

## 4) Storage layer (`src/storage`)

- SQLite database setup and schema/migrations (`src/storage/db.ts`, `src/storage/migrations.ts`).
- Job persistence + lifecycle updates (`src/storage/jobs-repo.ts`).
- Deduplicated place persistence (`src/storage/places-repo.ts`).
- Review persistence keyed by job/place/review (`src/storage/place-reviews-repo.ts`).

## 5) Output layer (`src/output`)

- Builds canonical completed-job read model (`src/output/build-job-results-model.ts`).
- Serializes CSV export from that model (`src/output/serializers/job-results-csv.ts`).

`buildJobResultsModel` is the shared contract point used by both:

- `GET /jobs/:id/results`
- `GET /jobs/:id/exports`

This keeps state-gated behavior and payload shape aligned between read and export routes.

## End-to-end data flow

1. Client sends `POST /jobs` with one of three input types.
2. API validates payload (`zod` schemas), normalizes target, and resolves safe policy.
3. API writes a `queued` job row and returns `202` with `jobId`.
4. Worker loop claims queued job, marks `running`, and updates heartbeat/progress.
5. Worker discovers candidates, enriches details, persists unique places, and optionally persists reviews.
6. Worker marks job:
   - `completed` with discovered/processed counts, or
   - `failed` with failure reason.
7. Read paths:
   - `GET /jobs/:id` returns lifecycle/progress snapshots.
   - `GET /jobs/:id/results` and `/exports` call `buildJobResultsModel`.
   - Non-completed jobs return `409 results_not_ready`; missing jobs return `404`.

## Guardrails and rate limiting

- Global rate limit: `60/min` (`src/api/plugins/rate-limit.ts`).
- `POST /jobs` route limit: `10/min` (`src/api/routes/jobs.ts`).
- Sensitive fields are blocked unless explicitly opted in (`src/safety/sensitive-fields.ts`).
- Runtime defaults emphasize conservative retries/backoff/pacing (`src/config/runtime-defaults.ts`).

## Test-backed contract surfaces

The following tests anchor the most important behavior documented above:

- Route contracts and status semantics:
  - `src/api/routes/jobs.test.ts`
  - `src/api/routes/job-status.test.ts`
  - `src/api/routes/job-results.test.ts`
  - `src/api/routes/job-exports.test.ts`
- Guardrails:
  - `src/api/routes/jobs.guardrails.test.ts`
- Shared results model:
  - `src/output/build-job-results-model.test.ts`
- Server wiring:
  - `src/server.test.ts`
