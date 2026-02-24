# Phase 2: Job Intake and Visibility - Research

**Researched:** 2026-02-25
**Domain:** Async job intake contracts, lifecycle state tracking, and live run visibility for a local Fastify + Crawlee service
**Confidence:** HIGH

## User Constraints

- No phase `CONTEXT.md` exists yet.
- Locked decisions: none provided.
- Claude's discretion: all implementation details for Phase 2.
- Deferred ideas: none provided.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INPT-01 | User can submit a scrape job with keyword and location | Use a normalized intake schema with a `keyword_location` variant and keep `POST /jobs` asynchronous (`202` + `jobId`). |
| INPT-02 | User can submit a scrape job using Google Maps URL input | Add a `maps_url` variant; parse and normalize Maps URL inputs (`query`, `query_place_id`) before persistence. |
| INPT-03 | User can submit a scrape job using place ID input | Add a `place_id` variant that normalizes to an internal canonical search target. |
| JOBS-01 | User can view job status lifecycle (queued, running, completed, failed) | Persist status transitions in SQLite and expose `GET /jobs/:id` read model with explicit lifecycle timestamps. |
| JOBS-02 | User can view run progress and basic metrics while a job executes | Track mutable progress counters and expose them through polling endpoint(s); optional SSE stream can mirror same read model. |
</phase_requirements>

## Summary

Phase 2 should be planned as an orchestration and API-contract phase, not a deep scraping phase. The codebase already has async `POST /jobs` intake, SQLite-backed job persistence, and a `JobStatus` union with the exact lifecycle values required by `JOBS-01`. The missing capability is breadth of accepted input formats and observable run-state progression while work is executing.

For planning, use one canonical job model internally and multiple validated intake variants at the API boundary. This keeps the crawler/orchestrator independent of user-facing input format while satisfying `INPT-01/02/03`. For visibility, treat progress as a durable read model (`jobs` + metrics fields/table), updated by the worker as it runs, and exposed via lightweight polling endpoints. Polling is the safest default for this codebase; optional SSE can be added later without changing the underlying state model.

**Primary recommendation:** Plan Phase 2 around (1) typed multi-format intake normalization and (2) durable lifecycle/progress read models in SQLite, exposed via `GET` status endpoints with near-real-time polling.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Fastify | `^5.6.0` (repo) | API routes and lifecycle hooks | Already in project; route/plugin model is ideal for async job APIs. |
| Zod | `^4.1.0` (repo) | Intake schema validation and normalization | Supports discriminated unions and URL validation for multi-input contracts. |
| better-sqlite3 | `^12.4.1` (repo) | Durable job + progress state | Already used; synchronous local DB access is simple and predictable for this phase. |
| Crawlee + PlaywrightCrawler | `^3.16.0` + `^1.58.0` (repo) | Job execution and runtime stats source | Existing worker foundation; exposes queue/run behavior and stats hooks. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@fastify/rate-limit` | `^10.3.0` (repo) | Protect intake/status routes | Keep existing route/global limits as visibility endpoints are added. |
| `@fastify/sse` | current | Optional push-based progress stream | Use only if polling UX is insufficient; keep polling as baseline. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Polling `GET /jobs/:id` every 1-2s | SSE/WebSocket streaming | Better immediacy, but more connection/state complexity for v1 local API. |
| SQLite-backed progress read model | In-memory progress only | In-memory loses visibility on restart and breaks local durability expectations. |
| One canonical internal job target | Per-input execution branches | Branching increases bug surface and makes lifecycle metrics inconsistent. |

**Installation:**
```bash
npm install @fastify/sse
```

(Only needed if you choose SSE in this phase. No new dependency is required for polling-first implementation.)

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── api/
│   ├── routes/              # POST /jobs, GET /jobs/:id, optional events endpoint
│   └── schemas/             # intake variants + response schemas
├── orchestration/
│   ├── intake/              # input normalization (keyword/location, maps_url, place_id)
│   └── runner/              # queue dispatcher + status/progress transitions
├── storage/
│   ├── jobs-repo.ts         # job CRUD + status/progress updates
│   └── schema.ts            # JobRecord + JobProgress types
└── crawler/
    └── runner.ts            # execution wrapper feeding progress metrics
```

### Pattern 1: Input Variant Normalization
**What:** Validate multiple user-facing input formats, then normalize to one internal target model before persistence.
**When to use:** Every `POST /jobs` request.
**Example:**
```typescript
// Source: https://zod.dev/api#discriminated-unions
import { z } from "zod";

const intakeSchema = z.discriminatedUnion("inputType", [
  z.object({ inputType: z.literal("keyword_location"), query: z.string().min(1), location: z.string().min(1) }),
  z.object({ inputType: z.literal("maps_url"), mapsUrl: z.url() }),
  z.object({ inputType: z.literal("place_id"), placeId: z.string().min(1) })
]);
```

### Pattern 2: Explicit Lifecycle State Machine in Storage
**What:** Persist state transitions (`queued -> running -> completed|failed`) with timestamps and immutable terminal states.
**When to use:** At queue claim/start, successful finish, and failure handling.
**Example:**
```typescript
type JobStatus = "queued" | "running" | "completed" | "failed";

type JobProgress = {
  discoveredCount: number;
  processedCount: number;
  failedCount: number;
  startedAt: string | null;
  finishedAt: string | null;
  lastHeartbeatAt: string | null;
};
```

### Pattern 3: Polling-First Visibility Endpoint
**What:** Return a consolidated read model from `GET /jobs/:id` (status + progress + basic metrics).
**When to use:** Baseline for `JOBS-01` and `JOBS-02`.
**Example:**
```typescript
// Source: https://fastify.dev/docs/latest/Reference/Routes/
app.get("/jobs/:id", async (request, reply) => {
  const job = jobsRepo.getById((request.params as { id: string }).id);
  if (!job) return reply.code(404).send({ error: "not_found" });
  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    metrics: {
      elapsedMs: job.progress.startedAt ? Date.now() - Date.parse(job.progress.startedAt) : 0,
    },
  };
});
```

### Anti-Patterns to Avoid
- **Scraping inside request thread:** never run browser flow directly in `POST /jobs`; keep async `202` behavior.
- **Input-specific business branches everywhere:** normalize once at ingress, avoid duplicating runner logic.
- **Ephemeral progress only:** progress that is not persisted cannot satisfy lifecycle visibility after restarts.
- **Terminal-state rewrites:** once `completed` or `failed`, never transition back.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-format input parser | Ad hoc nested `if/else` validation | Zod discriminated union schemas | Better error reporting and safer type narrowing. |
| Crawl queue semantics | Custom queue framework | Crawlee request queue + existing runner | Existing stack already solves queueing/retry primitives. |
| Real-time transport framework (first pass) | Custom socket protocol | Polling on status read model (optional `@fastify/sse`) | Polling meets requirements with lower complexity and easier tests. |
| Progress aggregation math | One-off scattered counters | Single repo-level progress update API | Prevents inconsistent metrics and race-prone updates. |

**Key insight:** The hard part of this phase is correctness of state transitions and read-model consistency, not transport novelty.

## Common Pitfalls

### Pitfall 1: Ambiguous intake payloads
**What goes wrong:** A payload accidentally includes URL + place ID + query fields; server picks one implicitly.
**Why it happens:** No discriminant key, loose schema.
**How to avoid:** Require `inputType` and enforce variant-specific required fields.
**Warning signs:** Intake bugs where same payload behaves differently after refactors.

### Pitfall 2: "Running" jobs with stale progress
**What goes wrong:** Status moves to `running`, but progress never advances or heartbeat is stale.
**Why it happens:** Worker updates status but not metrics in same orchestration path.
**How to avoid:** Centralize status/progress updates and record `lastHeartbeatAt` periodically.
**Warning signs:** Long-running jobs with unchanged counters and no recent heartbeat.

### Pitfall 3: Non-atomic lifecycle updates
**What goes wrong:** Metrics update succeeds but status transition fails (or vice versa), producing contradictory read models.
**Why it happens:** Multiple SQL writes without transaction boundary.
**How to avoid:** Use SQLite transactions for transition + metrics writes that must stay consistent.
**Warning signs:** `completed` job with `finishedAt = null`, or `queued` job with `startedAt` set.

### Pitfall 4: Over-validating place IDs by brittle regex
**What goes wrong:** Valid place IDs from real links are rejected.
**Why it happens:** Assumed fixed place ID shape.
**How to avoid:** Validate as non-empty bounded string; rely on downstream resolution/errors.
**Warning signs:** Frequent 400s for user-provided IDs copied from Maps links.

## Code Examples

Verified patterns from official sources:

### Crawlee long-running worker with keepAlive
```typescript
// Source: https://crawlee.dev/js/docs/guides/running-in-web-server
import { CheerioCrawler } from "crawlee";

const crawler = new CheerioCrawler({
  keepAlive: true,
  async requestHandler({ request, log }) {
    log.info(`processing ${request.url}`);
  }
});

await crawler.run();
```

### Crawlee stats access for progress snapshots
```typescript
// Source: https://crawlee.dev/js/api/playwright-crawler/class/PlaywrightCrawler
const stats = crawler.stats.calculate();
// stats.requestsTotal, stats.requestsFinishedPerMinute, etc.
```

### Google Maps URL search shape (for URL intake normalization)
```text
// Source: https://developers.google.com/maps/documentation/urls/get-started
https://www.google.com/maps/search/?api=1&query=pizza+seattle+wa
https://www.google.com/maps/search/?api=1&query=starbucks&query_place_id=ChI...
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single-form intake (`query` only) | Multi-variant typed intake + canonical normalization | Common in modern typed API stacks | Enables input expansion without runner complexity growth. |
| In-memory only status flags | Durable status/progress read models in local DB | Standard in job APIs | Survives restarts, enables trustworthy lifecycle visibility. |
| Push-first transport as default | Polling-first baseline with optional SSE | Current pragmatic backend pattern | Faster delivery with lower operational risk for v1. |

**Deprecated/outdated:**
- Treating "real-time" as WebSocket-only: near-real-time polling is often the correct first implementation for local job APIs.

## Open Questions

1. **Should Phase 2 include SSE, or polling only?**
   - What we know: Polling satisfies requirements with current stack.
   - What's unclear: UX expectation for latency and client complexity.
   - Recommendation: Plan polling-first; add SSE as a follow-up plan only if needed.

2. **How strict should Maps URL parsing be for v1?**
   - What we know: Official Maps URLs define `api=1`, `query`, and optional `query_place_id` patterns.
   - What's unclear: Coverage of non-canonical user-copied URL forms.
   - Recommendation: Support documented canonical forms first; return actionable 400 errors for unsupported variants.

## Sources

### Primary (HIGH confidence)
- `/fastify/fastify` (Context7) - route options, hooks, lifecycle boundaries for async job APIs.
- `/apify/crawlee` (Context7) - crawler API surface (`run`, `setStatusMessage`, `stats`, queue operations).
- `/colinhacks/zod` (Context7) - discriminated unions and input validation primitives.
- https://crawlee.dev/js/docs/guides/running-in-web-server - `keepAlive` worker pattern for request-driven systems. (Updated Feb 24, 2026)
- https://crawlee.dev/js/docs/guides/request-storage - queue persistence defaults and storage behavior. (Updated Feb 24, 2026)
- https://crawlee.dev/js/api/playwright-crawler/class/PlaywrightCrawler - `stats` and status APIs for progress snapshots.
- https://crawlee.dev/js/api/core/class/Statistics - available progress counters and runtime metrics.
- https://developers.google.com/maps/documentation/urls/get-started - canonical Maps URL forms, `api=1` requirement, `query_place_id` usage. (Updated 2026-02-18)
- https://zod.dev/api#discriminated-unions - discriminated union guidance in Zod 4 docs.

### Secondary (MEDIUM confidence)
- `/fastify/sse` (Context7) - SSE plugin patterns for optional live progress streaming.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - directly matches existing repository dependencies and official docs.
- Architecture: HIGH - aligns with current code patterns (`POST /jobs` async intake + SQLite repo) and official framework guidance.
- Pitfalls: MEDIUM-HIGH - strongly supported by established async-job patterns; exact URL edge-case distribution depends on real user input.

**Research date:** 2026-02-25
**Valid until:** 2026-03-27
