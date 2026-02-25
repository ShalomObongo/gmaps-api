---
phase: 07-json-and-csv-exports
plan: 02
subsystem: api
tags: [fastify, csv, exports, attachments]
requires:
  - phase: 07-json-and-csv-exports
    provides: shared buildJobResultsModel read model for completed jobs
provides:
  - GET /jobs/:id/exports with format=json|csv attachment responses
  - Deterministic CSV serialization with standards-safe escaping and reviewsJson column
  - Server registration of export routes alongside status and results routes
affects: [api-contracts, output-contract]
tech-stack:
  added: [@fast-csv/format]
  patterns: [format-branching export endpoint with shared read model]
key-files:
  created:
    - src/output/serializers/job-results-csv.ts
    - src/output/serializers/job-results-csv.test.ts
    - src/api/routes/job-exports.ts
    - src/api/routes/job-exports.test.ts
  modified:
    - package.json
    - package-lock.json
    - src/server.ts
key-decisions:
  - "Used `@fast-csv/format` to generate CSV output to guarantee standards-safe escaping for commas, quotes, and newlines."
  - "Kept `/jobs/:id/exports` state gates aligned with `/jobs/:id/results` by reusing `buildJobResultsModel` before format branching."
patterns-established:
  - "Export endpoints return attachment headers with stable job-scoped filenames per format"
  - "Completed-job output is assembled once, then serialized by format-specific layers"
requirements-completed: [OUTP-02, OUTP-03]
duration: 1 min
completed: 2026-02-25
---

# Phase 07 Plan 02: JSON and CSV Export Delivery Summary

**Completed jobs can now be downloaded as JSON or CSV attachments through `/jobs/:id/exports` using a shared read model and deterministic CSV serialization.**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-25T04:07:11+03:00
- **Completed:** 2026-02-25T04:07:32+03:00
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Added `serializeJobResultsCsv` using `@fast-csv/format` with deterministic headers and `reviewsJson` output.
- Implemented `GET /jobs/:id/exports` with `format=json|csv` (default json), attachment headers, and unchanged 404/409 state gates.
- Registered export routes in server bootstrap and validated assembled-server availability alongside existing status/results endpoints.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add CSV serializer and implement export route contract** - `9605807` (feat)
2. **Task 2: Register export route in server and run endpoint regression checks** - `78f2cf2` (feat)
3. **Post-task stabilization: Preserve JSON payload under Fastify response typing** - `8c60f8f` (fix)

**Plan metadata:** Included in this plan's docs commit.

## Files Created/Modified
- `src/output/serializers/job-results-csv.ts` - fast-csv-backed serializer for completed job place rows plus `reviewsJson`.
- `src/output/serializers/job-results-csv.test.ts` - serializer coverage for deterministic headers and escaping behavior.
- `src/api/routes/job-exports.ts` - export route with format switching and attachment semantics.
- `src/api/routes/job-exports.test.ts` - route contract, format behavior, and assembled-server route tests.
- `src/server.ts` - registered exports route in server bootstrap.
- `package.json` / `package-lock.json` - added `@fast-csv/format` dependency.

## Decisions Made
- Use `@fast-csv/format` (instead of manual string escaping) to produce parseable CSV output for special characters.
- Reuse `buildJobResultsModel` to keep `/jobs/:id/results` and `/jobs/:id/exports` synchronized on state and payload shape.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fastify response typing narrowed `reply.code(200)` and caused JSON export payload serialization drift**
- **Found during:** Post-plan verification (`npm run build` + targeted route tests)
- **Issue:** With only `404/409` response schemas declared, explicit `.code(200)` calls were typed to error-status responses and a temporary broad `200` schema caused JSON payload to serialize as `{}`.
- **Fix:** Removed explicit `.code(200)` from success branches and relied on default 200 responses with explicit content-type/attachment headers.
- **Files modified:** `src/api/routes/job-exports.ts`
- **Verification:** `npm run build` and `npm run test -- src/api/routes/job-exports.test.ts src/output/serializers/job-results-csv.test.ts src/api/routes/job-results.test.ts -x`
- **Committed in:** `8c60f8f`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** No scope expansion; change preserves intended export behavior and compile safety.

## Issues Encountered
- Initial post-implementation type-check exposed status-code typing constraints in Fastify route schemas; fixed by using default 200 sends for success branches.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 7 now has both planned implementation summaries and passing endpoint regression tests.
- Ready for phase-level verification and completion routing.

---
*Phase: 07-json-and-csv-exports*
*Completed: 2026-02-25*
