# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-02-24)

**Core value:** Given a search query and location scope, return reliable, structured Google Maps place data locally with no required paid services.
**Current focus:** Phase 7 - JSON and CSV Exports

## Current Position

Phase: 7 of 7 (JSON and CSV Exports)
Plan: 1 of 2 in current phase
Status: In progress
Last activity: 2026-02-25 - Completed 07-01 shared output builder and results route refactor.

Progress: [█████████░] 93%

## Performance Metrics

**Velocity:**
- Total plans completed: 12
- Average duration: 19 min
- Total execution time: 2.2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 2 | 50 min | 25 min |
| 2 | 2 | 48 min | 24 min |
| 3 | 3 | 35 min | 12 min |

**Recent Trend:**
- Last 5 plans: 02-01 (20 min), 02-02 (28 min), 03-01 (14 min), 03-02 (11 min), 03-03 (10 min)
- Trend: Stable
| Phase 03 P01 | 14 min | 2 tasks | 8 files |
| Phase 03 P02 | 11 min | 2 tasks | 7 files |
| Phase 03 P03 | 10 min | 2 tasks | 5 files |
| Phase 04 P01 | 8min | 2 tasks | 6 files |
| Phase 04 P02 | 10min | 2 tasks | 8 files |
| Phase 05 P01 | 4min | 2 tasks | 8 files |
| Phase 05 P02 | 5min | 3 tasks | 9 files |
| Phase 06 P01 | 4min | 3 tasks | 5 files |
| Phase 07 P01 | 1 min | 2 tasks | 3 files |

## Accumulated Context

### Decisions

Decisions are logged in `PROJECT.md` Key Decisions table.
Recent decisions affecting current work:

- [Phase 1]: Start with local reliability and safety defaults before feature scale-out.
- [Phase 2]: Group all job inputs and job lifecycle visibility into one deliverable capability.
- [Phase 01]: Keep paid proxy/captcha integrations optional and disabled by default — Meets RELY-02 and ensures local startup works without paid providers
- [Phase 01]: Persist queued jobs in SQLite and return resolved policy at intake — Ensures async intake and transparent defaults for users
- [Phase 01]: Enforce retry/backoff/pacing in runtime with explicit degraded-state warning signals — Satisfies RELY-01 reliability baseline with observable behavior
- [Phase 01]: Reject sensitive field requests unless explicitly opted in and register API rate limiting at boot — Enforces SAFE-01 guardrail defaults in code
- [Phase 02]: Normalize keyword/location, canonical maps URLs, and place IDs into one intake contract — Satisfies INPT-01/02/03 without branching runner logic
- [Phase 02]: Persist lifecycle/progress metrics and expose polling job visibility endpoint — Satisfies JOBS-01/02 with durable state
- [Phase 03]: Required collection.maxPlaces on intake so each run has an explicit depth contract.
- [Phase 03]: Persisted collection controls as JSON in jobs records for worker-consumable, migration-safe config.
- [Phase 03]: Canonical place keys use placeId first with deterministic hash fallback for missing IDs.
- [Phase 03]: Dedup correctness is enforced in SQLite using UNIQUE(job_id, place_key) and ON CONFLICT no-op inserts.
- [Phase 03]: Worker completion stores discovered candidate totals separately from deduplicated unique accepted inserts.
- [Phase 03]: Status output keeps processedCount compatibility and adds uniqueAcceptedCount for dedup visibility.
- [Phase 04]: Optional numeric detail parse failures normalize to null to keep best-effort extraction non-fatal.
- [Phase 04]: SQLite place detail columns are added in place with ensureColumn for backward-compatible local DB upgrades.
- [Phase 04]: Opening hours are stored as canonical JSON text in openingHoursJson for v1 detail extraction.
- [Phase 04]: Worker enrichment remains best-effort with nullable contact outputs to avoid run-level failures.
- [Phase 05]: Review controls are persisted as JSON per job to keep migration changes additive and worker-friendly.
- [Phase 05]: Review intake defaults are explicit (enabled=false, sort='newest', maxReviews=0) for deterministic downstream behavior.
- [Phase 05]: Review rows are keyed by (job_id, place_key, review_id) so retries remain idempotent without losing per-place ordering.
- [Phase 05]: Worker review extraction remains best-effort per place and never fails whole job completion when review reads error.
- [Phase 06]: Use 409 results_not_ready for queued/running/failed jobs and reserve 200 for completed jobs only.
- [Phase 06]: Read all reviews with one ordered listByJob query and group in memory by placeKey.
- [Phase 07]: Introduced buildJobResultsModel as the single source of truth for completed-job output assembly so results and exports can share state-gated reads. — Prevents response contract drift between /jobs/:id/results and export routes.
- [Phase 07]: Kept uniqueAcceptedCount mapped to processedCount while centralizing model shaping. — Maintains Phase 6 API semantics during refactor.

### Pending Todos

From `.planning/todos/pending/` ideas captured during sessions.

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-25 04:03
Stopped at: Completed 07-01-PLAN.md
Resume file: None
