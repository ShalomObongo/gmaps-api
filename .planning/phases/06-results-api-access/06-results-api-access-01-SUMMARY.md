---
phase: 06-results-api-access
plan: 01
subsystem: api
tags: [fastify, sqlite, results-endpoint, read-model]
requires:
  - phase: 05-reviews-collection-controls
    provides: persisted ordered review rows keyed by job/place/review
provides:
  - GET /jobs/:id/results state-gated result retrieval
  - deterministic nested place+review read model for completed jobs
affects: [phase-07-exports, api-contracts]
tech-stack:
  added: []
  patterns: [state-gated result endpoint, single-pass review grouping]
key-files:
  created:
    - src/api/routes/job-results.ts
    - src/api/routes/job-results.test.ts
  modified:
    - src/storage/place-reviews-repo.ts
    - src/storage/place-reviews-repo.test.ts
    - src/server.ts
key-decisions:
  - "Use 409 results_not_ready for queued/running/failed jobs and reserve 200 for completed jobs only."
  - "Read all reviews with one ordered listByJob query and group in memory by placeKey."
patterns-established:
  - "Results endpoints should read persisted tables only and never invoke crawler logic."
  - "Response ordering is deterministic from SQL ORDER BY and preserved in nested payload mapping."
requirements-completed: [OUTP-01]
duration: 4min
completed: 2026-02-25
---

# Phase 6 Plan 01: Results API Access Summary

**State-gated `/jobs/:id/results` now returns completed place outputs with nested ordered reviews from persisted SQLite read models.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-25T00:30:23Z
- **Completed:** 2026-02-25T00:34:19Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Added job-scoped review repository read support (`listByJob`) with deterministic ordering for results assembly.
- Implemented `GET /jobs/:id/results` with explicit `404`/`409`/`200` contracts and structured completed payload.
- Registered results route in server bootstrap and verified it coexists with existing `/jobs/:id` status polling.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add job-scoped ordered review read support for results assembly** - `4233a45` (feat)
2. **Task 2: Implement state-gated GET /jobs/:id/results with structured read-model response** - `b0a59cc` (feat)
3. **Task 3: Register results route in server runtime without regressing existing endpoints** - `c3870ef` (feat)

## Files Created/Modified
- `src/storage/place-reviews-repo.ts` - added `listByJob(jobId)` ordered query for one-pass review reads.
- `src/storage/place-reviews-repo.test.ts` - added ordering/scoping coverage for `listByJob`.
- `src/api/routes/job-results.ts` - added new results route with state gate + response schemas.
- `src/api/routes/job-results.test.ts` - added route contract tests and assembled-server availability coverage.
- `src/server.ts` - wired `registerJobResultsRoutes` into app bootstrap.

## Decisions Made
- Return `409 results_not_ready` for queued/running/failed jobs so clients can distinguish incomplete/failed execution from true empty completed outputs.
- Keep completed payload ordering deterministic by relying on repo SQL ordering (`places.id`, `place_reviews.place_key/position/id`) and stable grouping logic.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Initial route tests exposed invalid assumptions about mutable job state transitions and place key matching; test setup was corrected to use running jobs for failure transitions and canonical returned `placeKey` values.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Results contract and deterministic nested output are in place for Phase 7 JSON/CSV export surfaces.
- No blockers identified.

## Self-Check: PASSED

---
*Phase: 06-results-api-access*
*Completed: 2026-02-25*
