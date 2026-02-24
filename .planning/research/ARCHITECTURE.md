# Architecture Research

**Domain:** Local-first Google Maps scraping API
**Researched:** 2026-02-24
**Confidence:** MEDIUM-HIGH

## Standard Architecture

### System Overview

```text
┌───────────────────────────────────────────────────────────────────────────────┐
│ API Layer (Fastify/HTTP)                                                     │
├───────────────────────────────────────────────────────────────────────────────┤
│  Input Validator  │  Job Controller  │  Result Export  │  Health/Config      │
└───────────┬───────────────────────────────────────────────────────────────────┘
            │ (create/start/status/cancel/export)
┌───────────▼───────────────────────────────────────────────────────────────────┐
│ Orchestration Layer                                                           │
├───────────────────────────────────────────────────────────────────────────────┤
│  Job Queue      │  Concurrency Guard  │  Retry/Backoff  │  Run State Machine │
└───────────┬───────────────────────────────────────────────────────────────────┘
            │ (dispatches crawl tasks)
┌───────────▼───────────────────────────────────────────────────────────────────┐
│ Crawl Engine Layer                                                            │
├───────────────────────────────────────────────────────────────────────────────┤
│  PlaywrightCrawler │ Search Expander │ Place Detail Scraper │ Normalizer      │
│  (Crawlee)         │ (grid/viewport) │ (open each place)    │ + dedupe         │
└───────────┬───────────────────────────────────────────────────────────────────┘
            │ (write progress + results)
┌───────────▼───────────────────────────────────────────────────────────────────┐
│ Local Storage Layer                                                           │
├───────────────────────────────────────────────────────────────────────────────┤
│  SQLite (jobs/index) │ Crawlee RequestQueue/Dataset/KV │ NDJSON/CSV exports │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| API server | Accept jobs, expose status/results, enforce input limits | Fastify routes with JSON schema validation and plugin encapsulation |
| Job orchestrator | Convert API inputs into deterministic crawl plans and worker tasks | In-process queue + job state machine persisted in SQLite |
| Crawl worker | Execute Google Maps browser interactions reliably | Crawlee `PlaywrightCrawler` with autoscaling and request routing |
| Search expander | Break a large location into many map viewports/queries to exceed first-page limits | Grid/polygon tiler that emits search tasks |
| Place detail extractor | Open place cards/pages and collect normalized fields | Playwright page actions + selector strategy + fallback parsing |
| Deduper/normalizer | Merge duplicate places from overlapping tiles and unify schema | `placeId`-first dedupe, fallback on `(name,address,coords)` |
| Storage adapter | Persist queue state, run metadata, and output records for local reruns | Crawlee local storage (`./storage`) + SQLite metadata db |
| Export layer | Return JSON, NDJSON, CSV with stable schema | Streamed file writer + API download endpoints |

## Recommended Project Structure

```text
src/
├── api/                     # HTTP surface and contracts
│   ├── routes/              # jobs, runs, results, health
│   ├── schemas/             # request/response JSON schemas
│   └── plugins/             # auth/rate-limit/config plugins
├── orchestration/           # job lifecycle and execution control
│   ├── planner/             # input -> search tiles/tasks
│   ├── queue/               # in-process dispatcher, cancellation
│   └── state/               # run states, transitions, retries
├── crawler/                 # Crawlee + Playwright logic
│   ├── handlers/            # search results handler, place handler
│   ├── selectors/           # Google Maps selector map/fallbacks
│   ├── extractors/          # field extraction + normalization
│   └── anti_blocking/       # pacing, jitter, cooldown policies
├── storage/                 # persistence boundaries
│   ├── sqlite/              # jobs, task index, run metrics
│   ├── crawlee/             # queue/dataset bridge helpers
│   └── exports/             # NDJSON/CSV writers
├── domain/                  # pure types, entities, interfaces
├── config/                  # runtime config and defaults
└── main.ts                  # bootstrap and graceful shutdown
```

### Structure Rationale

- **`orchestration/` is separate from `crawler/`:** keeps business workflow (jobs, retries, cancellation) independent of scraping mechanics.
- **`crawler/selectors/` is isolated:** Google Maps UI changes frequently; selector churn should not ripple through API or storage code.
- **`storage/` has adapters:** allows v1 local files/SQLite now, with optional replacement later (Postgres/Redis) without rewriting crawl logic.

## Architectural Patterns

### Pattern 1: API-to-Queue Hand-off (Never scrape in request thread)

**What:** API creates a job, enqueues work, returns `jobId` immediately.
**When to use:** Always for local scraping APIs; browser runs are long and variable.
**Trade-offs:** Slightly more complexity, but avoids request timeouts and improves recoverability.

**Example:**
```typescript
// POST /jobs
const job = await jobsRepo.create({ input, status: 'queued' });
await queue.enqueue({ jobId: job.id });
return reply.code(202).send({ jobId: job.id, status: 'queued' });
```

### Pattern 2: Two-Stage Crawl Plan (Search stage -> Detail stage)

**What:** First collect candidate places from many map viewports, then fetch details per unique place.
**When to use:** Google Maps/local business scraping where one viewport under-represents an area.
**Trade-offs:** More moving parts, but much better coverage and cleaner dedupe.

**Example:**
```typescript
for (const tile of buildTiles(input.area)) {
  await emitSearchTask({ tile, query: input.keyword });
}
for await (const candidate of candidateStream()) {
  if (!seen(candidate.placeId)) await emitDetailTask(candidate);
}
```

### Pattern 3: Local-First Durable State

**What:** Keep run metadata in SQLite and crawl payloads in Crawlee local storage.
**When to use:** Free, single-machine operation with resumability requirements.
**Trade-offs:** Simple deployment; limited horizontal scale without refactor.

## Data Flow

### Request Flow

```text
Client POST /jobs
    ↓
API validation
    ↓
Job row created (SQLite)
    ↓
Planner generates tiles/search tasks
    ↓
Queue dispatches tasks to Crawlee worker
    ↓
Playwright opens Maps search views, scrolls, enqueues place details
    ↓
Extractor normalizes fields and writes dataset rows
    ↓
Deduper merges overlaps and updates run metrics
    ↓
Client GET /jobs/:id and /jobs/:id/results
```

### State Management

```text
queued -> planning -> running -> finalizing -> completed
                      |               |
                      v               v
                    retrying        failed
```

### Key Data Flows

1. **Control flow:** API -> orchestrator -> worker -> state store -> API polling.
2. **Data flow:** browser extraction -> normalizer/deduper -> dataset/export files.
3. **Recovery flow:** startup -> scan SQLite for interrupted runs -> resume or mark failed.

## Suggested Build Order (Dependency-First)

1. **Contracts + persistence skeleton**
   - Define job/result schemas, SQLite tables, and run state machine first.
   - Dependency reason: every later component needs stable identifiers and state transitions.

2. **Minimal crawler vertical slice (single query, single area)**
   - Implement one search -> place detail -> output record path.
   - Dependency reason: validates selectors and extraction before queue complexity.

3. **Planner + two-stage orchestration**
   - Add tile generation, candidate queue, detail queue, and dedupe.
   - Dependency reason: broad coverage depends on planner outputs and dedupe identity rules.

4. **Operational controls**
   - Add retries, backoff, cancellation, per-job concurrency caps, and health metrics.
   - Dependency reason: reliability tuning only makes sense after end-to-end flow exists.

5. **Export and developer UX**
   - Add CSV/NDJSON exports, run summaries, and consistent error surfaces.
   - Dependency reason: output shape should stabilize after extraction + dedupe are stable.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k jobs/month (single dev machine) | Single process, local SQLite + Crawlee storage is enough |
| 1k-50k jobs/month (power user) | Split API and worker processes, keep shared local DB, stricter concurrency caps |
| 50k+ jobs/month | Move queue/state to external infra (Redis/Postgres), multi-worker fleet, proxy strategy |

### Scaling Priorities

1. **First bottleneck:** Browser CPU/memory pressure from over-concurrency; solve with lower `maxConcurrency`, queue backpressure, and job-level limits.
2. **Second bottleneck:** Duplicate work from overlapping tiles; solve with stronger place identity index and pre-detail dedupe.

## Anti-Patterns

### Anti-Pattern 1: Synchronous scrape endpoint

**What people do:** `POST /scrape` runs browser session and blocks until completion.
**Why it's wrong:** Timeouts, poor cancellation, no resumability, fragile UX.
**Do this instead:** `POST /jobs` + async worker + `GET /jobs/:id` polling.

### Anti-Pattern 2: Mixing selector logic into API/business code

**What people do:** Route handlers contain Google Maps DOM selectors and extraction rules.
**Why it's wrong:** Any UI change causes cross-cutting breakage and slow fixes.
**Do this instead:** Isolate selectors/extractors under `crawler/` with versioned fallback strategy.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Google Maps web UI | Browser automation via Playwright/Crawlee | Primary data source; highest selector volatility |
| OpenStreetMap/Nominatim (optional) | Geocoding/polygon preprocessing before planning | Useful for converting location text to bounded search tiles |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| API ↔ Orchestrator | In-process service interface | API never calls browser directly |
| Orchestrator ↔ Crawler worker | Queue messages + task payloads | Enables retries, cancellation, and future process split |
| Crawler ↔ Storage | Repository/adapter methods | Keeps crawler testable without direct SQL/file calls |

## Sources

- Crawlee Request Storage guide (local queue storage, default `./storage`, queue semantics): https://crawlee.dev/js/docs/guides/request-storage (HIGH)
- Crawlee Configuration guide (`CRAWLEE_STORAGE_DIR`, autoscaling memory knobs): https://crawlee.dev/js/docs/guides/configuration (HIGH)
- Crawlee Running in web server guide (`keepAlive`, API-to-crawler mapping): https://crawlee.dev/js/docs/guides/running-in-web-server (HIGH)
- Playwright Network guide (request interception/modification/abort): https://playwright.dev/docs/network (HIGH)
- Fastify Encapsulation reference (plugin boundaries for modular API): https://fastify.dev/docs/latest/Reference/Encapsulation/ (HIGH)
- Apify Google Maps Scraper README (real-world Google Maps crawl behavior, scroll and place detail workflow): https://apify.com/compass/crawler-google-places (MEDIUM)
- SQLite WAL documentation (local durability and concurrency trade-offs): https://www.sqlite.org/wal.html (HIGH)

---
*Architecture research for: Local Google Maps scraper API*
*Researched: 2026-02-24*
