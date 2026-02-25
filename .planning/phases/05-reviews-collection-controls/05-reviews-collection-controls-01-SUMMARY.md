---
phase: 05-reviews-collection-controls
plan: 01
subsystem: api
tags: [zod, fastify, sqlite, intake]
requires:
  - phase: 03-coverage-and-deduplication
    provides: collection control persistence and deterministic worker contracts
provides:
  - strict review intake contract with bounded caps and sort enum validation
  - normalized default review controls on every accepted job payload
  - migration-safe per-job review control persistence in SQLite jobs table
affects: [worker-review-extraction, results-api]
tech-stack:
  added: []
  patterns: [normalized intake defaults, additive sqlite column migrations]
key-files:
  created: []
  modified:
    - src/storage/schema.ts
    - src/storage/db.ts
    - src/storage/jobs-repo.ts
    - src/storage/jobs-repo.test.ts
    - src/api/schemas/job-input.ts
    - src/orchestration/intake/normalize-intake.ts
    - src/api/routes/jobs.ts
    - src/api/routes/jobs.test.ts
key-decisions:
  - "Review controls are persisted as JSON per job to keep migration changes additive and worker-friendly."
  - "Review intake defaults are explicit (`enabled=false`, `sort='newest'`, `maxReviews=0`) for deterministic downstream behavior."
patterns-established:
  - "New intake controls must normalize into explicit worker-ready objects before persistence."
  - "Control-scope DB changes use ensureColumn additive upgrades for local SQLite compatibility."
requirements-completed: [DATA-03]
duration: 4min
completed: 2026-02-25
---

# Phase 5 Plan 1: Reviews Collection Controls Summary

**Job intake now enforces strict review control validation and stores a deterministic per-job review config payload for downstream extraction.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-25T00:07:00Z
- **Completed:** 2026-02-25T00:11:12Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Added migration-safe `review_config_json` persistence on `jobs` with repository mappings and deterministic defaults.
- Extended `/jobs` schema and normalization to accept strict review controls (sort enum and bounded `maxReviews`) with explicit defaults.
- Updated route responses/tests so accepted jobs always echo normalized review controls and invalid sort/cap inputs fail fast with 400 responses.

## Task Commits

1. **Task 1: Add migration-safe job persistence for resolved review controls** - `d86d7d8` (feat)
2. **Task 2: Extend POST /jobs contract with strict review controls and normalized defaults** - `e389d65` (feat)

## Files Created/Modified

- `src/storage/schema.ts` - adds typed review control contract and job record field.
- `src/storage/db.ts` - adds additive `jobs.review_config_json` migration support.
- `src/storage/jobs-repo.ts` - persists and hydrates per-job review config JSON.
- `src/storage/jobs-repo.test.ts` - validates review-config isolation and default hydration.
- `src/api/schemas/job-input.ts` - introduces strict optional `reviews` schema with enum sort and bounded cap.
- `src/orchestration/intake/normalize-intake.ts` - normalizes reviews defaults into worker-ready shape.
- `src/api/routes/jobs.ts` - persists and echoes normalized review controls on intake response.
- `src/api/routes/jobs.test.ts` - covers valid review controls plus invalid sort/cap rejection.

## Decisions Made

- Kept review cap lower bound at `0` so disabling extraction is expressed by defaults without extra sentinel values.
- Stored normalized reviews as JSON at intake time to avoid recomputing defaults in worker execution paths.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 2 can now consume stable per-job review controls (`enabled`, `sort`, `maxReviews`) directly from storage for extraction and persistence wiring.

## Self-Check: PASSED
