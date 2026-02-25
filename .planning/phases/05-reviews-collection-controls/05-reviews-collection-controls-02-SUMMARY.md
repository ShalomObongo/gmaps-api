---
phase: 05-reviews-collection-controls
plan: 02
subsystem: api
tags: [worker, sqlite, reviews, extraction]
requires:
  - phase: 05-reviews-collection-controls
    provides: normalized review controls persisted on queued jobs
provides:
  - sort-aware review extraction with deterministic order and hard caps
  - additive place_reviews storage with per-place dedupe identity
  - worker wiring that persists ordered capped review rows for enabled jobs
affects: [results-api, exports, analytics]
tech-stack:
  added: []
  patterns: [best-effort per-place review extraction, ordered position persistence]
key-files:
  created:
    - src/crawler/maps/extract-place-reviews.ts
    - src/crawler/maps/extract-place-reviews.test.ts
    - src/storage/place-reviews-repo.ts
    - src/storage/place-reviews-repo.test.ts
  modified:
    - src/storage/schema.ts
    - src/storage/db.ts
    - src/orchestration/runner/jobs-worker.ts
    - src/orchestration/runner/jobs-worker.test.ts
    - src/server.ts
key-decisions:
  - "Review rows are keyed by (job_id, place_key, review_id) so retries remain idempotent without losing per-place ordering."
  - "Worker review extraction remains best-effort per place and never fails whole job completion when review reads error."
patterns-established:
  - "Extractor output includes explicit sortOrder and position before persistence."
  - "Worker applies review controls only when enabled and maxReviews is greater than zero."
requirements-completed: [DATA-03]
duration: 5min
completed: 2026-02-25
---

# Phase 5 Plan 2: Reviews Collection Controls Summary

**Enabled runs now extract and persist ordered, cap-limited review rows per place with retry-safe dedup semantics.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-25T00:11:20Z
- **Completed:** 2026-02-25T00:15:50Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Built a dedicated review extractor that maps configured sort controls to deterministic sort tokens and hard-enforces `maxReviews`.
- Added migration-safe `place_reviews` table/repository with ordered position reads and conflict-safe dedupe by `(job_id, place_key, review_id)`.
- Wired worker ingestion to apply persisted review controls, execute per-place review extraction only when enabled, and persist ordered capped review rows without breaking job completion reliability.

## Task Commits

1. **Task 1: Build sort-aware review extraction module with hard-cap enforcement** - `4863ecc` (feat)
2. **Task 2: Add migration-safe place_reviews storage and ordered review repository** - `2698e88` (feat)
3. **Task 3: Wire worker ingestion to apply review controls and persist ordered capped reviews** - `a543bd3` (feat)

## Files Created/Modified

- `src/crawler/maps/extract-place-reviews.ts` - review normalization pipeline with sort mapping and hard-cap slicing.
- `src/crawler/maps/extract-place-reviews.test.ts` - verifies sort token mapping, cap enforcement, and nullable fallback handling.
- `src/storage/schema.ts` - adds typed place review entities.
- `src/storage/db.ts` - creates additive `place_reviews` schema and compatibility ensures.
- `src/storage/place-reviews-repo.ts` - persists/list review rows with ordered retrieval and dedupe conflict handling.
- `src/storage/place-reviews-repo.test.ts` - validates dedupe behavior and migration-safe table upgrades.
- `src/orchestration/runner/jobs-worker.ts` - adds review control parsing, extractor seam, and per-place persistence wiring.
- `src/orchestration/runner/jobs-worker.test.ts` - asserts worker persists capped ordered reviews using configured sort.
- `src/server.ts` - registers `placeReviewsRepo` dependency for worker runtime.

## Decisions Made

- Persisted review rows only for newly inserted places to avoid duplicate work on deduped candidate collisions.
- Enforced cap both in extractor and worker insertion path for defensive correctness under custom extractors.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Review extraction output path is now end-to-end ready for retrieval/export surfaces that need ordered per-place review records.

## Self-Check: PASSED
