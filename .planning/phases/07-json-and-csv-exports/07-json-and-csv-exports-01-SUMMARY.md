---
phase: 07-json-and-csv-exports
plan: 01
subsystem: api
tags: [fastify, sqlite, read-model, exports]
requires:
  - phase: 06-results-api-access
    provides: completed-job API result contract with state gating
provides:
  - Shared completed-job read model builder used by results and export routes
  - Deterministic completed payload assembly independent of route handlers
affects: [07-02-PLAN, output-contract]
tech-stack:
  added: []
  patterns: [shared read model builder for multi-route output paths]
key-files:
  created:
    - src/output/build-job-results-model.ts
    - src/output/build-job-results-model.test.ts
  modified:
    - src/api/routes/job-results.ts
key-decisions:
  - "Introduced buildJobResultsModel as the single source of truth for completed-job output assembly so results and exports can share state-gated reads."
  - "Kept uniqueAcceptedCount mapped to processedCount to preserve Phase 6 response semantics while centralizing model shaping."
patterns-established:
  - "Output read model reuse: route handlers delegate completed payload shaping to output modules"
requirements-completed: [OUTP-02]
duration: 1 min
completed: 2026-02-25
---

# Phase 07 Plan 01: Shared Completed-Job Read Model Summary

**Shared completed-job read model builder now powers `/jobs/:id/results` so output shaping is centralized and reusable for exports.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-25T04:02:07+03:00
- **Completed:** 2026-02-25T04:02:11+03:00
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Added `buildJobResultsModel(jobId, deps)` with explicit `not_found`, `not_ready`, and `completed` outcomes.
- Preserved deterministic place/review nesting and existing completed payload shape in a dedicated output module.
- Refactored `GET /jobs/:id/results` to consume the builder without changing 404/409/200 response semantics.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract shared completed-job read model builder with deterministic output** - `f2899e3` (feat)
2. **Task 2: Refactor results route to consume builder and run regression verification** - `ca8a04c` (refactor)

**Plan metadata:** Included in this plan's docs commit.

## Files Created/Modified
- `src/output/build-job-results-model.ts` - Shared completed-job output read model with state gate outcomes.
- `src/output/build-job-results-model.test.ts` - Builder-level coverage for missing, not-ready, and completed deterministic output behavior.
- `src/api/routes/job-results.ts` - Results route delegates output assembly to shared builder.

## Decisions Made
- Centralized completed-job output shaping in one module to prevent divergence between API results and upcoming export routes.
- Preserved Phase 6 contract behavior and field mapping exactly while moving assembly logic out of route handlers.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 7 plan 02 can reuse `buildJobResultsModel` directly for JSON/CSV download responses.
- No blockers identified for export route and serializer implementation.

---
*Phase: 07-json-and-csv-exports*
*Completed: 2026-02-25*
