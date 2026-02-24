---
phase: 02-job-intake-and-visibility
plan: 02
subsystem: orchestration
tags: [jobs, lifecycle, sqlite, worker, polling, status]
requires:
  - phase: 02-job-intake-and-visibility
    provides: multi-format intake and canonical target normalization
provides:
  - Durable lifecycle/progress read model with transactional transitions
  - Background worker loop that claims queued jobs and writes running/completed/failed state
  - Polling `GET /jobs/:id` endpoint exposing lifecycle timestamps, progress, and metrics
affects: [job-visibility, worker-runtime, persistence]
tech-stack:
  added: []
  patterns: [sqlite transition state machine, heartbeat/progress updates, polling-first status endpoint]
key-files:
  created:
    - src/storage/jobs-repo.test.ts
    - src/orchestration/runner/jobs-worker.ts
    - src/api/routes/job-status.ts
    - src/api/routes/job-status.test.ts
  modified:
    - src/storage/schema.ts
    - src/storage/db.ts
    - src/storage/jobs-repo.ts
    - src/server.ts
key-decisions:
  - "Kept lifecycle transitions terminal-safe by rejecting updates from completed/failed states."
  - "Used polling-first API visibility backed by persisted read model instead of in-memory worker state."
patterns-established:
  - "Worker claims queued jobs out-of-band and writes lifecycle/progress into SQLite."
  - "Status endpoint derives metrics from persisted timestamps and counters for durable observability."
requirements-completed: [JOBS-01, JOBS-02]
duration: 28 min
completed: 2026-02-25
---

# Phase 02 Plan 02: Lifecycle and visibility Summary

- Extended SQLite jobs model with lifecycle timestamps, heartbeat, counters, and failure reason fields.
- Added repository transition APIs (`claimNextQueued`, `updateProgress`, `markCompleted`, `markFailed`) with transaction boundaries and terminal-state immutability.
- Added a background jobs worker and wired server boot/shutdown hooks so lifecycle changes happen during runtime, not request threads.
- Added `GET /jobs/:id` polling endpoint with lifecycle/progress read model responses and basic elapsed/heartbeat metrics.
- Added tests for repository transitions and status snapshots across queued/running/completed plus not-found behavior.

## Task Commits

1. **Task 1: Extend SQLite job read model for lifecycle timestamps and live counters** - `6152b7c` (feat)
2. **Task 2: Add background worker loop to claim queued jobs and update lifecycle/progress** - `0247813` (feat)
3. **Task 3: Expose polling visibility endpoint for lifecycle, progress, and basic metrics** - `b414c3f` (feat)

## Verification

- `npm run test -- src/storage/jobs-repo.test.ts -x` -> passed
- `npm run test -- src/storage/jobs-repo.test.ts src/server.test.ts -x` -> passed
- `npm run test -- src/api/routes/job-status.test.ts src/api/routes/jobs.test.ts -x` -> passed
