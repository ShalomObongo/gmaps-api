---
phase: 01-local-runtime-safety-baseline
plan: 02
subsystem: safety
tags: [retry, backoff, pacing, rate-limit, guardrails, sensitive-fields]
requires:
  - phase: 01-local-runtime-safety-baseline
    provides: local runtime boot and queued job intake
provides:
  - Retry/backoff/pacing enforcement flow with machine-readable degraded-state warnings
  - API rate limits and explicit sensitive-field opt-in enforcement
affects: [job-execution, input-validation, compliance]
tech-stack:
  added: [@fastify/rate-limit]
  patterns: [capped exponential backoff with jitter, opt-in sensitive-field gate, guardrail-first API responses]
key-files:
  created:
    - src/orchestration/backoff.ts
    - src/crawler/runner.ts
    - src/safety/guardrails.ts
    - src/safety/sensitive-fields.ts
    - src/api/plugins/rate-limit.ts
  modified:
    - src/api/routes/jobs.ts
    - src/server.ts
key-decisions:
  - "Retry behavior is deterministic and capped, with warnings surfaced when retries trend high or block-like failures occur."
  - "Sensitive fields are rejected unless explicitly opted in to keep SAFE-01 default-off behavior enforceable."
patterns-established:
  - "Runner policy enforcement: classify retryable failures, back off with jitter, and emit warning signals."
  - "API guardrail enforcement: register global limits at boot and validate sensitive-field safety at request ingress."
requirements-completed: [RELY-01, SAFE-01]
duration: 18 min
completed: 2026-02-25
---

# Phase 01 Plan 02: Reliability and guardrail enforcement Summary

**Crawler runtime now enforces retry/backoff/pacing defaults, while API guardrails actively limit usage and require sensitive-field opt-in.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-02-25T00:27:00Z
- **Completed:** 2026-02-25T00:45:00Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Added retryability classification plus capped exponential backoff with jitter and policy-driven pacing.
- Added runner-level warning signals (`BLOCK_DETECTED`, `HIGH_RETRY_RATE`) for degraded execution visibility.
- Enforced guardrails at API boundary with registered rate limits and sensitive-field opt-in validation.

## Task Commits

1. **Task 1: Enforce retry, backoff, and pacing defaults in crawler runtime** - `e162837` (feat)
2. **Task 2: Add enforceable guardrails, opt-in sensitive fields, and usage messaging** - `f56d7d2` (feat)

## Files Created/Modified
- `src/orchestration/backoff.ts` - Retryability classification and jittered capped backoff computation.
- `src/orchestration/pacing.ts` - Policy-driven inter-action pacing delay helper.
- `src/crawler/runner.ts` - Runtime execution loop with retry/backoff/pacing and warning output.
- `src/api/plugins/rate-limit.ts` - Global API rate limiter registration.
- `src/safety/sensitive-fields.ts` - Sensitive-field policy resolution with default-safe allowlist.
- `src/safety/guardrails.ts` - Guardrail notice and run-warning generation.
- `src/api/routes/jobs.ts` - `/jobs` guardrail enforcement and enriched guardrail response payload.
- `src/server.ts` - Boot-time rate-limit registration before routes.

## Decisions Made
- Kept sensitive field controls enforcement-first (explicit rejection) instead of silent field dropping.
- Exposed guardrail metadata in runtime response surfaces to make responsible-use defaults observable.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 1 reliability and guardrail baseline is complete.
- Phase 2 can build richer job inputs and lifecycle visibility on top of enforced runtime safety defaults.

---
*Phase: 01-local-runtime-safety-baseline*
*Completed: 2026-02-25*
