# Phase 6: Results API Access - Research

**Researched:** 2026-02-25
**Domain:** Fastify API read models for completed scrape job outputs (places + reviews)
**Confidence:** HIGH

## User Constraints

- No phase `CONTEXT.md` exists yet.
- Locked decisions: none provided.
- Claude's discretion: choose the Phase 6 API contract and internal read-model pattern that satisfies `OUTP-01` in the current stack.
- Deferred ideas: none provided.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OUTP-01 | User can fetch structured job results through API endpoints | Add a dedicated results endpoint for a job read model (`/jobs/:id/results`) that returns terminal completed output (places + reviews) and explicit non-terminal behavior for queued/running/failed jobs. |
</phase_requirements>

## Summary

Phase 6 should be planned as a **read-model API phase**, not a scraper phase. The data needed for output already exists in SQLite (`places`, `place_reviews`) and lifecycle state already exists in `jobs`. The missing capability is a stable HTTP contract that joins those persisted records into user-facing structured results.

The safest path is to keep the current architecture seams: API route layer handles status-code behavior and response shape; repositories handle SQLite reads; worker behavior remains unchanged. This preserves completed Phase 1-5 reliability guarantees and avoids introducing new crawl/runtime risks for an output-only requirement.

Use one canonical endpoint for Phase 6 (`GET /jobs/:id/results`) with explicit behavior by job state: `404` for unknown jobs, `409` for known jobs not ready (queued/running/failed), and `200` for completed jobs with structured payload. This gives clear client behavior and keeps existing `POST /jobs` + `GET /jobs/:id` polling flow coherent.

**Primary recommendation:** Implement a dedicated results read endpoint backed by repository-level list queries and explicit state-gated HTTP responses (`200` completed, `409` not-ready/failed, `404` missing).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Fastify | `^5.6.0` (repo; docs latest v5.7.x) | Define `/jobs/:id/results` route, params/query validation, and response schemas | Already the app server; Fastify route schema + response schema are first-class and performance-oriented. |
| better-sqlite3 + SQLite | `^12.4.1` + SQLite bundled | Synchronous read queries for jobs/places/reviews | Existing storage layer already uses prepared statements and deterministic ordering; no new data store needed. |
| Existing repos (`jobs`, `places`, `place_reviews`) | current | Read model construction from persisted rows | Keeps data-access logic out of handlers and aligned with prior phases. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | `^3.2.4` | Route contract tests for terminal vs non-terminal behavior and payload shape | Required to lock API semantics for OUTP-01 and avoid regressions in future export phases. |
| Zod | `^4.1.0` | Optional request-query parsing if query/pagination params are added now | Use if Phase 6 introduces typed query options; otherwise Fastify JSON schema is sufficient. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dedicated `/jobs/:id/results` endpoint | Extend `GET /jobs/:id` to include full result data | Mixes status snapshot and potentially large payload; poll endpoint becomes heavy and less cacheable. |
| Repository read methods | Inline SQL in route handlers | Faster to start but breaks existing codebase layering and increases test complexity. |
| State-gated 409 for not-ready jobs | Return 200 with empty results while running | Ambiguous client semantics and hides whether job is incomplete vs genuinely empty result set. |

**Installation:**
```bash
npm install
```

No new dependency is required for baseline OUTP-01.

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── api/
│   └── routes/
│       ├── job-status.ts               # existing polling/status endpoint
│       └── job-results.ts              # NEW: structured results endpoint
├── storage/
│   ├── jobs-repo.ts                    # existing getById for state gating
│   ├── places-repo.ts                  # existing listByJob
│   └── place-reviews-repo.ts           # extend with listByJob (or equivalent)
└── server.ts                           # register new results route
```

### Pattern 1: State-Gated Results Endpoint
**What:** Gate result retrieval by persisted job state before reading output tables.
**When to use:** Every `GET /jobs/:id/results` request.
**Example:**
```typescript
// Source: Fastify route + reply status patterns
app.get("/jobs/:id/results", async (request, reply) => {
  const { id } = request.params as { id: string };
  const job = jobsRepo.getById(id);
  if (!job) return reply.code(404).send({ error: "not_found", message: `job not found: ${id}` });

  if (job.status !== "completed") {
    return reply.code(409).send({
      error: "results_not_ready",
      status: job.status,
      message: "results are available only for completed jobs"
    });
  }

  // read places/reviews and return 200
});
```

### Pattern 2: Repository-Assembled Read Model
**What:** Build response in the storage/repo layer via deterministic ordered reads (`ORDER BY`).
**When to use:** Returning places and nested reviews for completed jobs.
**Example:**
```typescript
// Source: better-sqlite3 Statement#get/all + existing repo style
const places = placesRepo.listByJob(jobId); // ORDER BY id ASC
const reviews = placeReviewsRepo.listByJob(jobId); // ORDER BY place_key, position ASC, id ASC

const reviewsByPlace = new Map<string, PlaceReviewRecord[]>();
for (const review of reviews) {
  const bucket = reviewsByPlace.get(review.placeKey) ?? [];
  bucket.push(review);
  reviewsByPlace.set(review.placeKey, bucket);
}
```

### Pattern 3: Schema-Defined Response Contracts
**What:** Define Fastify response schema per status code for stable payload and output filtering.
**When to use:** New results endpoint with 200/404/409 variants.
**Example:**
```typescript
// Source: Fastify validation/serialization docs
const schema = {
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string" } }
  },
  response: {
    200: { type: "object", properties: { jobId: { type: "string" }, results: { type: "array" } } },
    404: { type: "object", properties: { error: { type: "string" }, message: { type: "string" } } },
    409: { type: "object", properties: { error: { type: "string" }, status: { type: "string" }, message: { type: "string" } } }
  }
};
```

### Anti-Patterns to Avoid
- **Re-running crawl logic in read path:** results endpoint must read persisted data only.
- **N+1 review fetch loops at route level:** avoid per-place DB calls in handlers when a single `listByJob` query can feed grouping.
- **Unordered SQL reads:** without explicit `ORDER BY`, output order is undefined.
- **Conflating status and result contracts:** keep `/jobs/:id` for lifecycle polling and `/jobs/:id/results` for completed output.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP validation/response filtering | Ad-hoc manual `if` chains for params and payload shape | Fastify `schema.params` + `schema.response` | Faster, consistent, and already standard in framework docs. |
| Transaction-safe batched reads | Custom mutable cache layer for result assembly | Existing SQLite + repo methods with prepared statements | Data is already persisted locally and queryable; extra cache adds coherence risk. |
| Dedup/order reconciliation in API route | Post-hoc JS dedup/sort patches | Storage invariants (`UNIQUE` constraints + ordered selects) | Correctness should come from storage model built in earlier phases. |

**Key insight:** OUTP-01 is mostly a contract/read-model problem; hand-rolled orchestration is unnecessary because Phase 3-5 persistence already established deduped, typed output tables.

## Common Pitfalls

### Pitfall 1: Returning partial results for running jobs
**What goes wrong:** Clients treat incomplete data as final.
**Why it happens:** Endpoint reads `places` regardless of `jobs.status`.
**How to avoid:** Gate on `job.status === "completed"` before reading output rows.
**Warning signs:** Same job returns growing result count from repeated results calls while still `running`.

### Pitfall 2: Ambiguous failure behavior
**What goes wrong:** Failed jobs return empty arrays, masking execution errors.
**Why it happens:** Failed state not mapped to explicit response contract.
**How to avoid:** Return non-200 state payload with `status`, `failureReason`, and client guidance.
**Warning signs:** Users cannot distinguish “no places found” from “crawl failed”.

### Pitfall 3: Unstable output ordering
**What goes wrong:** Place/review order changes across identical reads.
**Why it happens:** Missing SQL `ORDER BY` guarantees.
**How to avoid:** Keep deterministic ordering in repo queries (`places.id ASC`, `reviews.position ASC, id ASC`).
**Warning signs:** Snapshot tests fail intermittently with same data.

### Pitfall 4: Route-layer N+1 review queries
**What goes wrong:** Response latency scales poorly with place count.
**Why it happens:** Handler loops `listByJobAndPlace` for each place.
**How to avoid:** Add `listByJob(jobId)` in `place-reviews-repo` and group in memory once.
**Warning signs:** High query count and slow responses for larger completed jobs.

## Code Examples

Verified patterns from official sources:

### Fastify route with querystring/response schema
```typescript
// Source: https://fastify.dev/docs/latest/Reference/Routes/
fastify.route({
  method: "GET",
  url: "/",
  schema: {
    querystring: {
      type: "object",
      properties: {
        name: { type: "string" },
        excitement: { type: "integer" }
      }
    },
    response: {
      200: {
        type: "object",
        properties: { hello: { type: "string" } }
      }
    }
  },
  handler(request, reply) {
    reply.send({ hello: "world" });
  }
});
```

### better-sqlite3 transaction wrapper for batched work
```typescript
// Source: https://raw.githubusercontent.com/WiseLibs/better-sqlite3/master/docs/api.md
const insertMany = db.transaction((rows) => {
  for (const row of rows) insert.run(row);
});
```

### SQLite UPSERT no-op for duplicate keys
```sql
-- Source: https://www.sqlite.org/lang_upsert.html
INSERT INTO place_reviews (job_id, place_key, review_id, sort_order, position, collected_at)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT(job_id, place_key, review_id) DO NOTHING;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Poll-only lifecycle API (`/jobs/:id`) with no output endpoint | Separate status and results resources (`/jobs/:id`, `/jobs/:id/results`) | Common modern async-job API pattern | Cleaner client flow: poll status, then fetch result payload. |
| Unstructured route responses | Schema-defined responses by status code | Fastify v5 docs baseline | Better throughput and safer output contract stability. |
| Manual duplicate handling in app logic | Storage-level uniqueness + conflict no-op | SQLite UPSERT-era pattern (3.24+) | Idempotent writes and simpler read-path assumptions. |

**Deprecated/outdated:**
- Overloading the status endpoint with full result payloads.
- Treating non-completed jobs as successful empty results.

## Open Questions

1. **Should Phase 6 include pagination now or return full completed result set?**
   - What we know: OUTP-01 only requires structured API retrieval for completed jobs.
   - What's unclear: Expected maximum payload size for local runs in v1.
   - Recommendation: Ship unpaginated baseline now; add optional pagination query params only if tests show payload/latency issues.

2. **What exact 409 payload fields should be standardized for non-terminal states?**
   - What we know: Requirement asks for clear behavior for in-progress/completed/failed jobs.
   - What's unclear: Whether to include progress snapshot inline vs pointer to `/jobs/:id`.
   - Recommendation: Include `status` and concise `message`; optionally include minimal progress fields to reduce extra client round-trips.

3. **How much review detail should be nested in Phase 6 responses?**
   - What we know: Review rows exist and are ordered/capped from Phase 5.
   - What's unclear: Whether full review text is always desired in baseline response.
   - Recommendation: Return stored normalized review fields as-is for now; defer projection/filtering controls to Phase 7 export concerns.

## Sources

### Primary (HIGH confidence)
- `/fastify/fastify` (Context7) - route schema, params/query validation, response status-code schema patterns.
- https://fastify.dev/docs/latest/Reference/Routes/ - Fastify v5 route declarations and schema options.
- https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/ - Fastify validation and response serialization behavior.
- https://raw.githubusercontent.com/WiseLibs/better-sqlite3/master/docs/api.md - authoritative API for `prepare`, `get`, `all`, `transaction`.
- https://www.sqlite.org/lang_upsert.html - conflict/no-op semantics for idempotent inserts.

### Secondary (MEDIUM confidence)
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/202 - async accepted semantics for job submission/polling flow.
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/409 - conflict semantics for state-dependent request handling.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - entirely aligned with current repository dependencies and official docs.
- Architecture: HIGH - directly derived from existing repo seams (`server` + routes + repos).
- Pitfalls: MEDIUM-HIGH - strongly evidenced by async-job API patterns and current project shape.

**Research date:** 2026-02-25
**Valid until:** 2026-03-27
