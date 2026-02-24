---
phase: 04-place-detail-extraction
plan: 02
subsystem: api
tags: [playwright, worker, sqlite, extraction]
requires:
  - phase: 04-place-detail-extraction
    provides: strict normalized DATA-01 place contract and storage wiring
provides:
  - locator-first contact detail extractor with fallback selectors
  - worker enrichment path that writes consistent DATA-01 and DATA-02 shapes
  - additive persistence support for website, phone, and opening hours JSON
affects: [results-api, exports]
tech-stack:
  added: []
  patterns: [field-level best-effort extraction, nullable enrichment pipeline]
key-files:
  created:
    - src/crawler/maps/extract-place-details.ts
    - src/crawler/maps/extract-place-details.test.ts
  modified:
    - src/orchestration/runner/jobs-worker.ts
    - src/orchestration/runner/jobs-worker.test.ts
    - src/storage/schema.ts
    - src/storage/db.ts
    - src/storage/places-repo.ts
    - src/storage/places-repo.test.ts
key-decisions:
  - "Opening hours are stored as canonical JSON text in openingHoursJson for this phase."
  - "Worker enrichment never hard-fails on optional detail misses; nullable fallbacks preserve run completion reliability."
patterns-established:
  - "Extractor field failures are isolated and converted to null outputs."
  - "Worker normalizes core fields first, then applies contact enrichment before insert."
requirements-completed: [DATA-02]
duration: 10min
completed: 2026-02-25
---

# Phase 4 Plan 2: Place Detail Extraction Summary

**Worker runs now emit consistently shaped place records with nullable website, phone, and opening-hours fields enriched through fallback-safe detail extraction.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-25T02:41:00Z
- **Completed:** 2026-02-25T02:51:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Added `extractPlaceDetails` with locator-first/fallback selector reads for website, phone, and opening hours.
- Integrated worker enrichment so normalized core records always include DATA-02 fields with explicit nullable values.
- Persisted DATA-02 fields through SQLite and repository mappings with backward-compatible additive columns.

## Task Commits

1. **Task 1: Implement locator-first detail extraction with fallback selectors for contact/business fields** - `0b631ef` (feat)
2. **Task 2: Integrate detail extraction into worker persistence path without degrading run reliability** - `3be9ae2` (feat)

## Files Created/Modified
- `src/crawler/maps/extract-place-details.ts` - fallback-safe website/phone/hours extractor returning nullable fields.
- `src/crawler/maps/extract-place-details.test.ts` - coverage for fallback selector use and missing-field behavior.
- `src/orchestration/runner/jobs-worker.ts` - normalize-plus-enrich pipeline before place inserts.
- `src/orchestration/runner/jobs-worker.test.ts` - verifies mixed-detail ingestion still completes with dedup metrics.
- `src/storage/schema.ts` - DATA-02 typed place fields.
- `src/storage/db.ts` - additive website/phone/opening_hours_json columns.
- `src/storage/places-repo.ts` - read/write support for contact fields.
- `src/storage/places-repo.test.ts` - persistence and migration assertions for new contact columns.

## Decisions Made
- Used canonical JSON text (`openingHoursJson`) for hours to keep schema simple while preserving source detail.
- Preserved run resilience by treating all contact/business extraction failures as nullable outcomes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added DATA-02 storage persistence wiring**
- **Found during:** Task 2 (worker integration)
- **Issue:** Plan task file list omitted DB/repository updates, but without them extracted contact fields could not be durably stored.
- **Fix:** Added additive SQLite columns and repository insert/select mappings for `website`, `phone`, and `openingHoursJson`.
- **Files modified:** `src/storage/db.ts`, `src/storage/places-repo.ts`, `src/storage/places-repo.test.ts`
- **Verification:** `npm run test -- src/storage/places-repo.test.ts -x`
- **Committed in:** `3be9ae2`

**2. [Rule 1 - Bug] Fixed worker crash from missing enrichCandidate propagation**
- **Found during:** Task 2 verification
- **Issue:** `processNextJob` referenced `enrichCandidate` without receiving it, causing runtime failure (`enrichCandidate is not defined`).
- **Fix:** Threaded `enrichCandidate` through `tick -> processNextJob -> executeCollectorJob` call chain.
- **Files modified:** `src/orchestration/runner/jobs-worker.ts`
- **Verification:** `npm run test -- src/orchestration/runner/jobs-worker.test.ts -x`
- **Committed in:** `3be9ae2`

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Both fixes were required for correctness and reliable completion of DATA-02 scope.

## Issues Encountered

Worker verification initially timed out due an enrichment wiring bug; corrected immediately and re-ran tests to green.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 4 now has both core and contact detail contracts/persistence in place, ready for Phase 4 verification and downstream result shaping.

## Self-Check: PASSED
