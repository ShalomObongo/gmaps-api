---
phase: 02-job-intake-and-visibility
plan: 01
subsystem: api
tags: [intake, validation, normalization, fastify, zod]
requires: []
provides:
  - Typed multi-format intake contract for keyword/location, maps URL, and place ID submissions
  - Canonical intake normalization before queue persistence
  - Integration coverage for accepted variants and invalid payload rejection
affects: [job-intake, request-validation, guardrails]
tech-stack:
  added: []
  patterns: [zod discriminated union intake, canonical normalization, actionable 400 validation errors]
key-files:
  created:
    - src/orchestration/intake/normalize-intake.ts
  modified:
    - src/api/schemas/job-input.ts
    - src/api/routes/jobs.ts
    - src/api/routes/jobs.test.ts
    - src/api/routes/jobs.guardrails.test.ts
key-decisions:
  - "Required explicit inputType discriminator to prevent ambiguous mixed-shape requests."
  - "Supported canonical Google Maps search URLs only and return actionable errors for unsupported URL forms."
patterns-established:
  - "Ingress normalization: all intake variants map into one canonical target shape before persistence."
requirements-completed: [INPT-01, INPT-02, INPT-03]
duration: 20 min
completed: 2026-02-25
---

# Phase 02 Plan 01: Multi-format intake normalization Summary

- Added a strict discriminated union intake schema keyed by `inputType` for `keyword_location`, `maps_url`, and `place_id`.
- Added `normalizeIntakeInput` for canonical intake transformation and canonical Maps URL parsing (`/maps/search/?api=1&query=...` + optional `query_place_id`).
- Updated `POST /jobs` to parse normalized intake, preserve `202` async queue semantics, and return normalized input metadata for downstream visibility.
- Extended integration tests to prove all supported input variants are accepted and unsupported/ambiguous payloads are rejected with `400`.

## Task Commits

1. **Task 1: Define typed multi-format intake schema and canonical normalization** - `39b82bc` (feat)
2. **Task 2: Wire POST /jobs to variant-aware intake and prove all v1 inputs** - `6742b37` (feat)

## Verification

- `npm run test -- src/api/routes/jobs.test.ts -x` -> passed
- `npm run test -- src/api/routes/jobs.test.ts src/api/routes/jobs.guardrails.test.ts -x` -> passed
