# Project Research Summary

**Project:** Google Maps Scraper API
**Domain:** Local-first Google Maps scraping API (Apify-like crawler behavior)
**Researched:** 2026-02-24
**Confidence:** MEDIUM

## Executive Summary

This project is a local-first scraping API that should behave like an Apify-style Google Maps crawler while running on a single machine with no required paid services. Across the research, the strongest recommendation is a browser-driven architecture with an async job API: Fastify receives jobs, an orchestration layer plans and queues work, and Crawlee + Playwright execute a two-stage crawl (search expansion first, place details second) with SQLite + local storage for durability.

The recommended v1 approach is to prioritize reliable core extraction and coverage before advanced platform features. Launch with table-stakes inputs (keyword/location/URL/place ID), deep traversal + dedupe, structured JSON/CSV output, and visible job state. Keep enrichment and advanced automation optional. This keeps scope aligned with the user value proposition: practical, repeatable local place data collection.

The key risks are not primarily framework risk; they are operational and governance risk: anti-bot degradation under free/local constraints, brittle selectors, coverage illusions from shallow traversal, and compliance/PII handling mistakes. Mitigation is clear in the combined research: enforce conservative defaults early (rate limits, backoff, opt-in sensitive fields), isolate selectors/extractors for fast breakage recovery, and build observability + resumability as core product behavior instead of polish.

## Key Findings

### Recommended Stack

`STACK.md` strongly converges on a modern TypeScript crawler stack optimized for local durability and low ops cost. The stack is intentionally conservative: stable LTS runtime, mature scraper primitives, and file-based persistence that avoids introducing Redis/Postgres too early.

**Core technologies:**
- **Node.js 22 LTS:** Runtime baseline with strong compatibility for Fastify v5 and Playwright.
- **TypeScript 5.9:** Typed contracts for API payloads and extractor outputs; reduces breakage blast radius.
- **Crawlee 3.16 + Playwright 1.58:** Industry-standard queue/session/retry orchestration plus robust browser automation for dynamic Maps UI.
- **Fastify 5.7:** Async job API surface with schema-first contracts and low overhead.
- **SQLite + Drizzle + better-sqlite3:** Local durable job/run metadata with simple migrations and no external infra.

Critical compatibility requirements: keep `node >=20` (target 22), align `@fastify/rate-limit@10.x` with Fastify 5, and preserve Crawlee/Playwright version compatibility as a pair.

### Expected Features

`FEATURES.md` is clear on parity expectations: users care first about coverage and usable structured output, not hosted-SaaS extras. The product wins or loses on collection depth, dedupe quality, and run reliability under local constraints.

**Must have (table stakes):**
- Input model supporting keyword + location + URL/place ID.
- Deep traversal/pagination beyond first viewport.
- Core place fields extraction with canonical identity.
- Deduplication across overlapping scans.
- Job API with status/progress and JSON/CSV export.
- Basic anti-blocking resilience (retry/backoff/pacing).

**Should have (competitive):**
- Reliability modes (`fast`, `balanced`, `deep`) for speed-vs-completeness control.
- Reviews depth controls (sort/filter/caps).
- Optional enrichment stage (contacts/social) as a disabled-by-default pipeline.
- Adaptive geospatial traversal tuning for higher recall per run.

**Defer (v2+):**
- Incremental recrawl + diff feeds.
- Distributed multi-node execution.
- Hosted multi-tenant SaaS concerns (auth/billing/scheduling).

### Architecture Approach

`ARCHITECTURE.md` recommends a strict boundary model: API layer, orchestration layer, crawl engine, and storage layer. The critical pattern is async API-to-queue handoff (`POST /jobs` returns `202`), followed by a two-stage crawl plan (search candidate discovery, then unique place detail extraction). This design directly supports resumability, cancellation, dedupe, and later process splitting without rewriting extraction logic.

**Major components:**
1. **API server:** Validates inputs, creates jobs, exposes status/results/exports, never runs browser logic inline.
2. **Job orchestrator + planner:** Converts inputs to tile/query tasks, manages state transitions/retries/cancellation.
3. **Crawler workers:** Execute Playwright/Crawlee interactions, extract normalized place data, emit candidates/details.
4. **Dedupe/normalizer:** Applies placeId-first identity with deterministic fallback matching.
5. **Storage/export adapters:** Persist run metadata and queue state, produce stable JSON/NDJSON/CSV artifacts.

### Critical Pitfalls

Top pitfalls from `PITFALLS.md` that should actively shape planning:

1. **Compliance deferred until late** - define usage policy, throttling defaults, and opt-in sensitive fields in Phase 0.
2. **Overpromising anti-bot reliability on free/local setup** - treat reliability as probabilistic, publish SLOs, expose degraded-run status.
3. **Brittle selectors + hard sleeps** - use locator/event-driven waits, fallback parsers, and contract fixtures.
4. **Coverage illusion from single viewport/query** - implement tiling + overlap dedupe + coverage metrics early.
5. **Weak identity/dedupe** - enforce stable ID-first model with deterministic fallback matching rules.

## Implications for Roadmap

Based on combined research, the strongest phase structure is dependency-first and reliability-led.

### Phase 0: Constraints, Policy, and Contracts
**Rationale:** Compliance and data-governance mistakes are high-impact and easiest to prevent early.
**Delivers:** Usage policy, sensitive-field defaults (opt-in), API contracts, SQLite schema, run-state model.
**Addresses:** Input model, job control baseline, governance constraints.
**Avoids:** Deferred compliance, uncontrolled PII, non-resumable lifecycle design.

### Phase 1: Vertical Slice Reliability Baseline
**Rationale:** Validate real extraction reliability before building full planner complexity.
**Delivers:** One end-to-end run path (single query/area), async job execution, core fields, retries/backoff, structured logs.
**Addresses:** Core extraction, job visibility, baseline anti-blocking behavior.
**Avoids:** Synchronous scrape endpoints, brittle waits/selectors, false stability assumptions.

### Phase 2: Coverage Engine (Traversal + Dedup)
**Rationale:** Product value depends on recall quality, not just single-run success.
**Delivers:** Tile/polygon planning, two-stage search->detail pipeline, pre-detail dedupe, overlap-aware metrics.
**Addresses:** Deep traversal, broad collection, dedupe across overlap.
**Avoids:** Coverage illusion, duplicate-heavy exports, wasted detail-page work.

### Phase 3: Data Quality and Output Hardening
**Rationale:** Once coverage exists, correctness and usability determine adoption.
**Delivers:** Locale-safe normalization, review controls, CSV/NDJSON stability, quality regression tests.
**Addresses:** Core schema reliability, reviews extraction controls, developer-ready exports.
**Avoids:** Locale parsing corruption, schema drift, silent field regressions.

### Phase 4: Operational Hardening + Differentiators
**Rationale:** Advanced value should be added after stable core throughput and quality baselines.
**Delivers:** Reliability modes (`fast/balanced/deep`), checkpoint recovery UX, optional enrichment pipeline, proxy hooks.
**Addresses:** Competitive control knobs and long-run operability.
**Avoids:** Scope explosion and premature optimization before baseline stability.

### Phase Ordering Rationale

- Identity, state, and contracts are prerequisite for traversal, dedupe, and exports.
- Two-stage crawl architecture naturally groups Phase 1 (vertical slice) before Phase 2 (coverage scale-out).
- Pitfall mapping shows compliance/reliability/coverage/quality should be solved in that order to avoid costly rework.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 0:** Legal/compliance boundary details (jurisdiction, retention, responsible-use wording).
- **Phase 2:** Geospatial strategy tuning (tile sizing, polygon splitting heuristics, recall measurement).
- **Phase 4:** Proxy/session strategy and optional enrichment sources under local constraints.

Phases with standard patterns (can usually skip research-phase):
- **Phase 1:** Fastify async jobs + queue handoff + Crawlee Playwright worker patterns are well documented.
- **Phase 3:** CSV/NDJSON export patterns and schema validation/test harness approaches are standard.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Mostly official docs + compatibility tables; versions are concrete and coherent. |
| Features | MEDIUM | Strong cross-source convergence, but some competitor evidence is marketing-heavy. |
| Architecture | MEDIUM | Core patterns are well-established, but Google Maps-specific selector volatility adds uncertainty. |
| Pitfalls | MEDIUM | High-quality best-practice backing, but real-world failure rates depend on local environment variability. |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Compliance envelope specifics:** translate high-level policy into precise enforceable defaults and user-facing terms during Phase 0 planning.
- **Coverage benchmark dataset:** define a repeatable benchmark city/query set to objectively evaluate recall and duplicate rates.
- **Reliability SLO targets:** set concrete local-mode SLOs (success rate, block rate, places/min) before differentiator work.
- **Locale strategy scope:** choose initial locale matrix for parser fixture tests and define expansion criteria.

## Sources

### Primary (HIGH confidence)
- `/apify/crawlee` (Context7) and Crawlee docs (`https://crawlee.dev/js/docs/*`) — queue/storage/session/autoscaling architecture patterns.
- `/microsoft/playwright` (Context7) and Playwright docs (`https://playwright.dev/docs/*`) — browser automation requirements, reliability practices.
- `/fastify/fastify` (Context7) and Fastify docs (`https://fastify.dev/docs/latest/*`) — API/plugin encapsulation and Node compatibility.
- `/drizzle-team/drizzle-orm` (Context7) + Drizzle SQLite docs (`https://orm.drizzle.team/docs/get-started/sqlite-new`) — typed SQLite persistence and migration flow.
- Google/SQLite official docs (`https://cloud.google.com/maps-platform/terms`, `https://www.google.com/help/terms_maps/`, `https://www.sqlite.org/*`) — legal boundary and storage behavior.

### Secondary (MEDIUM confidence)
- Apify Google Maps actor pages (`https://apify.com/compass/crawler-google-places*`) — practical feature envelope and workflow expectations.
- SerpApi Maps docs (`https://serpapi.com/google-maps-api`, place/reviews endpoints) — parameter and output expectations.
- Open-source local scrapers (`https://github.com/gosom/google-maps-scraper`, `https://github.com/omkarcloud/google-maps-scraper`) — operational behavior and local constraints.

### Tertiary (LOW confidence)
- Marketing-oriented competitor pages (`https://outscraper.com/google-maps-scraper/`, `https://brightdata.com/products/serp-api/google-search/maps`) — useful for positioning, not implementation truth.

---
*Research completed: 2026-02-24*
*Ready for roadmap: yes*
