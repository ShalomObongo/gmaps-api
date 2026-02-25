---
phase: 05-reviews-collection-controls
phase_number: "05"
status: passed
verified_on: 2026-02-25
requirements_checked: [DATA-03]
---

# Phase 05 Verification

## Goal

Users can extract review data with explicit control over ordering and collection size.

## Automated Checks

- `npm run test -- src/storage/jobs-repo.test.ts -x` -> passed
- `npm run test -- src/api/routes/jobs.test.ts -x` -> passed
- `npm run test -- src/crawler/maps/extract-place-reviews.test.ts -x` -> passed
- `npm run test -- src/storage/place-reviews-repo.test.ts -x` -> passed
- `npm run test -- src/orchestration/runner/jobs-worker.test.ts -x` -> passed
- `npm run test -- src/storage/jobs-repo.test.ts src/api/routes/jobs.test.ts src/crawler/maps/extract-place-reviews.test.ts src/storage/place-reviews-repo.test.ts src/orchestration/runner/jobs-worker.test.ts -x` -> passed

## Requirement Trace

### DATA-03

- Evidence: `src/api/schemas/job-input.ts` validates review controls with strict sort enum and bounded `maxReviews`; invalid values are rejected at intake.
- Evidence: `src/orchestration/intake/normalize-intake.ts` resolves deterministic review defaults (`enabled=false`, `sort='newest'`, `maxReviews=0`) for all accepted jobs.
- Evidence: `src/storage/db.ts` and `src/storage/jobs-repo.ts` persist per-job `review_config_json` so worker runs consume a fixed extraction contract.
- Evidence: `src/crawler/maps/extract-place-reviews.ts` enforces sort mapping and hard cap semantics while emitting ordered `position` values.
- Evidence: `src/storage/place-reviews-repo.ts` stores ordered review rows with `UNIQUE(job_id, place_key, review_id)` idempotency and stable retrieval ordering.
- Evidence: `src/orchestration/runner/jobs-worker.ts` applies persisted review controls and persists per-place review rows without failing whole runs on review extraction errors.

## Result

All Phase 5 must-haves are implemented and verified. No gaps found.
