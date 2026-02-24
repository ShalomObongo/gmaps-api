---
phase: 03-coverage-and-deduplication
plan: 01
subsystem: api
tags: [zod, fastify, sqlite, intake, jobs]
requires:
  - phase: 02-job-intake-and-visibility
    provides: Durable job queue intake and worker lifecycle state model
provides:
  - Typed collection depth controls at API intake
  - Normalized accepted collection controls in POST /jobs responses
  - Persisted per-job collection control config in SQLite jobs records
affects: [worker-ingestion, coverage-collection, dedup-metrics]
tech-stack:
  added: []
  patterns:
    - Validate run controls at API boundary with strict numeric bounds
    - Persist run-level collection controls alongside policy_json
key-files:
  created: []
  modified:
    - src/api/schemas/job-input.ts
    - src/orchestration/intake/normalize-intake.ts
    - src/api/routes/jobs.ts
    - src/api/routes/jobs.test.ts
    - src/storage/schema.ts
    - src/storage/db.ts
    - src/storage/jobs-repo.ts
    - src/storage/jobs-repo.test.ts
key-decisions:
  - "Collection controls are part of intake contract and required for every job."
  - "Persist collection controls as JSON on jobs to keep schema evolution simple."
patterns-established:
  - "Collection controls: maxPlaces required, optional bounded maxScrollSteps and maxViewportPans normalized with defaults"
requirements-completed: [COVR-02]
duration: 14 min
completed: 2026-02-25
---

# Phase 3 Plan 1: Coverage Intake Controls Summary

**Per-job collection limits now flow from validated intake through accepted responses into durable job storage for worker consumption.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-02-25T02:05:00Z
- **Completed:** 2026-02-25T02:19:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Added strict `collection` controls to all `POST /jobs` input variants with bounded validation.
- Normalized collection control defaults in intake normalization and echoed them in acceptance payloads.
- Added migration-safe `collection_config_json` persistence and repository hydration for per-job run controls.

## Task Commits

1. **Task 1: Add typed collection depth controls to intake normalization and acceptance responses** - `474d304` (feat)
2. **Task 2: Persist collection controls in SQLite job records with migration-safe reads/writes** - `e98db78` (feat)

## Files Created/Modified
- `src/api/schemas/job-input.ts` - Adds bounded collection control schema.
- `src/orchestration/intake/normalize-intake.ts` - Produces shape-stable normalized collection controls.
- `src/api/routes/jobs.ts` - Echoes accepted collection controls and persists them per job.
- `src/api/routes/jobs.test.ts` - Verifies accepted controls and invalid-limit rejection behavior.
- `src/storage/schema.ts` - Extends `JobRecord` with `collectionConfigJson`.
- `src/storage/db.ts` - Adds migration-safe `collection_config_json` column creation.
- `src/storage/jobs-repo.ts` - Persists and hydrates collection config with queued jobs.
- `src/storage/jobs-repo.test.ts` - Asserts collection config durability and per-job separation.

## Decisions Made
- Required `collection.maxPlaces` on intake so every run has an explicit depth contract.
- Normalized optional controls to defaults (`maxScrollSteps=20`, `maxViewportPans=0`) to keep downstream worker config stable.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Collection control persistence is in place for deep traversal and dedup storage wiring in plan 03-02.

## Self-Check: PASSED
