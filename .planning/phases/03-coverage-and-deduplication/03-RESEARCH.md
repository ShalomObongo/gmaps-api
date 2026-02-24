# Phase 3: Coverage and Deduplication - Research

**Researched:** 2026-02-25
**Domain:** Deep Google Maps result traversal and run-level deduplication in a local Fastify + Crawlee + SQLite pipeline
**Confidence:** HIGH

## User Constraints

- No phase `CONTEXT.md` exists yet.
- Locked decisions: none provided.
- Claude's discretion: implementation strategy for `COVR-01`, `COVR-02`, `COVR-03`.
- Deferred ideas: none provided.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COVR-01 | User can collect results beyond the first visible viewport/page | Use an iterative traversal loop (scroll + optional bounded viewport panning) inside the worker, bounded by explicit stop conditions and run limits. |
| COVR-02 | User can configure collection depth/limit for a run | Add typed collection controls to job input (for example `maxPlaces`, `maxScrollSteps`, `maxViewportPans`) and persist them with each job. |
| COVR-03 | User receives deduplicated place results across overlapping scans | Deduplicate at ingest time using a canonical `placeKey` and enforce uniqueness with SQLite constraints (`UNIQUE(job_id, place_key)` or equivalent). |
</phase_requirements>

## Summary

Phase 3 should be planned as the first real data-collection phase in this repository. The current worker path (`src/orchestration/runner/jobs-worker.ts`) still executes a placeholder job and only updates counts. That means planning must include both traversal behavior and new persistence for collected places, not just minor API tweaks.

The standard stack already supports this cleanly: Crawlee `PlaywrightCrawler` handles bounded deep crawling via `maxRequestsPerCrawl`, `enqueueLinks`, and request queue mechanics; Playwright supports deterministic manual scroll strategies for infinite lists; SQLite supports hard dedup guarantees through `UNIQUE` constraints plus `INSERT ... ON CONFLICT` behavior. Use these primitives instead of custom queue or dedup engines.

For reliability, implement dedup in two layers: in-memory run-level set for fast short-circuiting, plus database-level uniqueness as the final correctness gate. This avoids double counting when overlapping scans revisit the same place and prevents race-condition duplicates if concurrency is introduced later.

**Primary recommendation:** Plan Phase 3 as one cohesive pipeline change: typed depth controls at intake -> bounded deep traversal in worker -> canonical place-key dedup enforced in SQLite.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Crawlee (`PlaywrightCrawler`, `RequestQueue`) | `^3.16.0` (repo) | Deep traversal, queueing, request dedup primitives | Already in repo and designed for recursive crawling + bounded request limits. |
| Playwright | `^1.58.0` (repo) | Deterministic page interaction for scrolling/load-more flows | Official guidance covers infinite-list loading via scrolling APIs. |
| better-sqlite3 | `^12.4.1` (repo) | Durable place storage + uniqueness constraints | Existing local DB stack; ideal for hard dedup guarantees. |
| Fastify + Zod | `^5.6.0`, `^4.1.0` (repo) | Typed run controls and request validation | Existing API boundary pattern in Phase 2; easy extension for collection options. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node `crypto` (`createHash`) | built-in | Stable fallback key derivation when place ID unavailable | Use for canonical key fallback (`name + normalized address + coords`). |
| Existing jobs worker/repo modules | current | State transitions + progress counters | Reuse instead of introducing a second orchestration path. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Crawlee request queue dedup + unique keys | Custom queue + custom visited graph | Reinvents solved crawler concerns; higher defect risk. |
| SQLite uniqueness constraints | Pure in-memory `Set` only | Faster but not durable; duplicates can reappear across restarts/retries. |
| Explicit depth controls (`max*`) | Time-based stop only | Runtime-only stop is less predictable and harder for users to reason about. |

**Installation:**
```bash
npm install
```

No new dependency is required for this phase.

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── api/
│   ├── schemas/                  # extend job input with collection depth controls
│   └── routes/                   # pass validated controls into persisted job records
├── orchestration/
│   ├── runner/jobs-worker.ts     # invoke real crawl executor and publish progress
│   └── coverage/                 # new traversal + dedup orchestration helpers
├── crawler/
│   └── maps/                     # Playwright/Crawlee extraction and scroll/pan logic
└── storage/
    ├── db.ts                     # create places table + unique indexes
    ├── schema.ts                 # place and run result types
    └── places-repo.ts            # insert/upsert and read deduped results
```

### Pattern 1: Bounded Deep Traversal
**What:** Iterate result discovery beyond first viewport using controlled scroll/pagination loops and optional bounded panning seeds.
**When to use:** Every run where `maxPlaces` or equivalent depth control exceeds initial visible results.
**Example:**
```typescript
// Source: https://crawlee.dev/js/docs/introduction/adding-urls
import { PlaywrightCrawler } from "crawlee";

const crawler = new PlaywrightCrawler({
  maxRequestsPerCrawl: 50,
  async requestHandler({ page, enqueueLinks }) {
    await page.waitForSelector(".result-card");
    await enqueueLinks({ selector: "a.next-page" });
  }
});
```

### Pattern 2: Queue-Level Request Dedup
**What:** Ensure repeated traversal seeds do not explode crawl work by relying on `RequestQueue` `uniqueKey` semantics.
**When to use:** When adding overlapping scan URLs or repeated pagination URLs.
**Example:**
```typescript
// Source: https://crawlee.dev/js/api/core/class/RequestQueue
import { RequestQueue } from "crawlee";

const queue = await RequestQueue.open();
await queue.addRequest({ url: "https://example.com/search?q=coffee" });
await queue.addRequest({
  url: "https://example.com/search?q=coffee",
  uniqueKey: "coffee:scan-b" // override only if you intentionally want a second pass
});
```

### Pattern 3: Database-Enforced Place Dedup
**What:** Write extracted rows with uniqueness constraints and conflict handling.
**When to use:** On every extracted place candidate.
**Example:**
```sql
-- Source: https://sqlite.org/lang_upsert.html
CREATE TABLE IF NOT EXISTS places (
  id INTEGER PRIMARY KEY,
  job_id TEXT NOT NULL,
  place_key TEXT NOT NULL,
  name TEXT,
  address TEXT,
  lat REAL,
  lng REAL,
  UNIQUE(job_id, place_key)
);

INSERT INTO places (job_id, place_key, name, address, lat, lng)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT(job_id, place_key) DO NOTHING;
```

### Anti-Patterns to Avoid
- **Unbounded crawl loops:** never run infinite scroll/pagination without explicit user-facing stop controls.
- **Dedup by display name only:** names collide often; use place ID first, canonicalized fallback key second.
- **Dedup only in memory:** this fails durability and can produce duplicates after retries/restarts.
- **Coupling traversal depth to retry policy:** coverage controls are business behavior; retry/backoff is reliability behavior.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Crawl frontier/visited tracking | Custom graph/queue engine | Crawlee `RequestQueue` + `uniqueKey` | Already handles duplicate requests and crawl ordering semantics. |
| SQL merge logic in app loops | Manual select-then-insert branching | SQLite `UNIQUE` + `ON CONFLICT` | Simpler, atomic, and less race-prone. |
| Infinite-list interaction framework | Ad hoc brittle wait/sleep loops | Playwright locators + `scrollIntoViewIfNeeded` / `mouse.wheel` | Officially supported primitives reduce flakiness. |
| Per-run config parser | Free-form JSON parsing in worker | Zod schema extension at API boundary | Keeps invalid depth values out of runtime logic. |

**Key insight:** Coverage and dedup are mostly control-flow and data-integrity problems; the stack already provides the hard primitives.

## Common Pitfalls

### Pitfall 1: Depth controls that are not persisted
**What goes wrong:** Job accepted with custom limits but worker uses defaults.
**Why it happens:** Controls validated at API layer but not serialized into job record/policy.
**How to avoid:** Persist depth controls alongside policy JSON and use only persisted values in worker.
**Warning signs:** Re-running same payload yields identical counts despite different limits.

### Pitfall 2: Counting discovered rows before dedup
**What goes wrong:** Progress/metrics claim large discovery while final unique rows are much lower.
**Why it happens:** Counters increment before uniqueness checks.
**How to avoid:** Track both raw discovered and unique accepted counts explicitly.
**Warning signs:** `processedCount > uniquePlaceCount` with no explanation in status output.

### Pitfall 3: Overlapping scans produce duplicate place rows
**What goes wrong:** Multi-viewport scans return repeated places.
**Why it happens:** No canonical key and no unique index in storage.
**How to avoid:** Build deterministic `placeKey` and enforce `UNIQUE(job_id, place_key)`.
**Warning signs:** Same place appears multiple times with only minor URL/coordinate differences.

### Pitfall 4: Scroll automation stalls silently
**What goes wrong:** Collector stops expanding results but run appears healthy.
**Why it happens:** Scroll executed without a post-scroll growth check.
**How to avoid:** After each scroll step, compare result-card count delta and stop after N no-growth iterations.
**Warning signs:** Many scroll actions logged with unchanged card count.

## Code Examples

Verified patterns from official sources:

### Crawl with explicit request cap
```typescript
// Source: https://crawlee.dev/js/docs/introduction/adding-urls
import { PlaywrightCrawler } from "crawlee";

const crawler = new PlaywrightCrawler({
  maxRequestsPerCrawl: 20,
  async requestHandler({ enqueueLinks }) {
    await enqueueLinks();
  }
});
```

### RequestQueue deduplicates by uniqueKey
```typescript
// Source: https://crawlee.dev/js/api/core/class/RequestQueue
import { RequestQueue } from "crawlee";

const queue = await RequestQueue.open();
const first = await queue.addRequest({ url: "https://example.com/a" });
const second = await queue.addRequest({ url: "https://example.com/a" });
// second reflects duplicate based on same uniqueKey
```

### Force infinite list loading with Playwright scrolling
```typescript
// Source: https://playwright.dev/docs/input#scrolling
await page.getByText("Footer text").scrollIntoViewIfNeeded();
await page.mouse.wheel(0, 400);
```

### SQLite upsert/no-op on duplicate place key
```sql
-- Source: https://sqlite.org/lang_upsert.html
INSERT INTO places (job_id, place_key, name)
VALUES (?, ?, ?)
ON CONFLICT(job_id, place_key) DO NOTHING;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| First-page-only scrape | Bounded deep traversal (`maxRequestsPerCrawl`, explicit depth controls) | Mainstream in modern crawler tooling (Crawlee 3.x docs) | Predictable collection depth and larger recall. |
| App-level duplicate filtering only | Storage-level uniqueness + optional in-memory fast path | Standard in data pipelines | Stronger correctness and restart safety. |
| Blind fixed sleeps for dynamic loading | Actionability-aware scrolling and growth checks | Modern Playwright guidance | Fewer flaky runs and better runtime efficiency. |

**Deprecated/outdated:**
- Treating dedup as a post-processing-only step: dedup should happen at write time to keep metrics and outputs consistent.

## Open Questions

1. **What is the canonical fallback key when `placeId` is missing from scraped cards?**
   - What we know: Place IDs are unique identifiers but can change over time and may be absent from partial listings.
   - What's unclear: Which fallback tuple yields best precision/recall in this dataset (`name+address`, plus rounded coordinates, etc.).
   - Recommendation: Start with `placeId || hash(lower(name)|lower(address)|round(lat,lng,5))`; validate collisions in Phase 3 tests.

2. **Should depth control expose one field or multiple knobs?**
   - What we know: Requirement asks for configurable depth/limit, not a specific shape.
   - What's unclear: User ergonomics for one `maxPlaces` versus `maxPlaces + maxScrollSteps + maxViewportPans`.
   - Recommendation: Expose `maxPlaces` as required primary control, keep additional knobs optional with safe defaults.

3. **Where should deduplicated places be surfaced before Phase 6 results endpoints?**
   - What we know: Requirement says user receives deduplicated results; Phase 6 is dedicated retrieval API.
   - What's unclear: Whether Phase 3 should add an interim read endpoint or only persist for Phase 6 consumption.
   - Recommendation: Persist now and expose minimal read path if needed for requirement verification; avoid overbuilding export APIs early.

## Sources

### Primary (HIGH confidence)
- `/websites/crawlee_dev_js` (Context7) - `PlaywrightCrawler` patterns, `enqueueLinks`, `maxRequestsPerCrawl`, request dedup semantics.
- https://crawlee.dev/js/docs/introduction/adding-urls - URL discovery, request dedup via `uniqueKey`, depth limiting. (Last updated Feb 24, 2026)
- https://crawlee.dev/js/api/core/class/RequestQueue - queue uniqueness guarantees and request operations.
- https://playwright.dev/docs/input#scrolling - official scrolling strategies for infinite lists.
- https://sqlite.org/lang_upsert.html - canonical `ON CONFLICT` semantics for dedup writes. (Updated 2024-04-11)
- https://sqlite.org/lang_createtable.html - `UNIQUE` constraint semantics. (Updated 2025-04-30)

### Secondary (MEDIUM confidence)
- https://developers.google.com/maps/documentation/places/web-service/place-id - place ID behavior (unique identifier, may change, refresh guidance). (Updated 2026-02-18)

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - matches current repo dependencies and official docs.
- Architecture: HIGH - directly grounded in existing codebase seams (`jobs-worker`, `jobs-repo`, `job-input`) plus Crawlee/SQLite guidance.
- Pitfalls: MEDIUM-HIGH - strongly supported by crawler/data-pipeline practice; exact Google Maps DOM edge cases still require implementation-time validation.

**Research date:** 2026-02-25
**Valid until:** 2026-03-27
