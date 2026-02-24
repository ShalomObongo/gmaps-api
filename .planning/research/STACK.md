# Stack Research

**Domain:** Local Google Maps scraper API (Apify-like crawler behavior, local-first)
**Researched:** 2026-02-24
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | 22 LTS (2025 baseline) | Runtime for scraper + API | Fastify v5 requires Node 20+, Playwright supports 20/22/24, and Node 22 was the safest 2025 LTS target for local installs without chasing Current releases. **Confidence: HIGH** |
| TypeScript | 5.9.3 | Type-safe scraper/API codebase | Strong typing reduces parser breakage risk as Google Maps DOM changes; TS is first-class across Crawlee/Fastify/Drizzle ecosystems. **Confidence: HIGH** |
| Crawlee | 3.16.0 | Crawl orchestration (queue, retries, sessions, autoscaling, storage) | This is the standard Apify-adjacent crawler framework; it gives persistent request queues, retries, session management, and local storage out of the box (`./storage` by default). **Confidence: HIGH** |
| Playwright | 1.58.2 | Browser automation for Google Maps dynamic UI | Google Maps is JavaScript-heavy; Playwright-based crawling is the reliable modern path and is explicitly recommended by Crawlee for advanced browser crawling. **Confidence: HIGH** |
| Fastify | 5.7.4 | Local HTTP API surface for job submission/results | Fastify gives high-throughput JSON APIs with low overhead and built-in schema-focused patterns, ideal for local worker + API in one process. **Confidence: HIGH** |
| SQLite + Drizzle ORM | SQLite engine + drizzle-orm 0.45.1 + better-sqlite3 12.6.2 | Local durable state (jobs, runs, dedupe, exports metadata) | Free, serverless, file-based persistence is the right default under local/free constraints; Drizzle adds typed SQL and simple migrations without running Postgres/Redis services. **Confidence: HIGH** |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | 4.3.6 | Input/output validation for API and scraper configs | Use for all external inputs (`query`, `location`, limits, export format) to fail fast and keep job payloads safe. **Confidence: HIGH** |
| pino | 10.3.1 | Structured JSON logging | Use for all runtime logs; pair with `pino-pretty` only in local dev for readability. **Confidence: HIGH** |
| @fastify/rate-limit | 10.3.0 | Abuse guardrails on API endpoints | Use global and per-route limits to enforce ethical usage/backoff and reduce accidental hammering. **Confidence: HIGH** |
| @fastify/swagger + @fastify/swagger-ui | 9.7.0 + 5.2.5 | OpenAPI docs for local developer UX | Use when exposing API to scripts/teams; skip only for private one-off CLI usage. **Confidence: MEDIUM** |
| p-queue | 9.1.0 | In-process concurrency control around expensive operations | Use for throttling detail-page enrichment/export tasks in addition to Crawlee concurrency controls. **Confidence: MEDIUM** |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| tsx (4.21.0) | Run TS scripts directly | Best for local iteration (`tsx src/index.ts`) without separate build loop. |
| vitest (4.0.18) | Unit/integration testing | Use for parser regression tests against stored HTML/JSON fixtures. |
| eslint (10.0.2) | Linting and maintainability | Keep strict rules for scraper selectors/parsers to reduce brittle ad-hoc code. |
| drizzle-kit (latest with drizzle-orm 0.45.1) | Migrations and schema ops | Use `generate` + `migrate` for repeatable local DB evolution. |

## Installation

```bash
# Core
npm install fastify crawlee playwright drizzle-orm better-sqlite3 zod pino @fastify/rate-limit @fastify/swagger @fastify/swagger-ui p-queue

# Supporting
npm install @fastify/cors

# Dev dependencies
npm install -D typescript @types/node tsx vitest eslint drizzle-kit pino-pretty
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Crawlee + Playwright | Raw Playwright only | Use raw Playwright only for tiny one-off scripts; for production-like crawling you will quickly re-implement queue/retry/session logic Crawlee already solves. |
| Fastify | Express | Use Express only if team already has deep Express middleware investment and does not need Fastify's schema-driven performance model. |
| SQLite + Drizzle | PostgreSQL + Prisma | Use Postgres only when you need multi-machine writes/concurrent operators; for local-first v1 this adds avoidable ops cost and setup friction. |
| better-sqlite3 | libSQL/Turso client | Use libSQL/Turso only when you intentionally add remote sync or distributed reads; not needed for strict local free execution. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Selenium/WebDriver stack as default | Higher setup/runtime overhead and weaker local DX for modern JS-heavy scraping compared to Playwright+Crawlee pipeline | Playwright + Crawlee |
| Redis/BullMQ as mandatory baseline | Adds always-on infra service that violates "free local, minimal dependencies" goal for v1 | Crawlee request queue + SQLite-backed job metadata |
| Google Places API as primary data path | Has quota/cost and result-limit constraints that conflict with "Apify-like deep collection" objective | Browser-driven Maps scraping workflow |
| Paid anti-bot/proxy APIs as required dependency | Breaks hard free/local constraint and changes MVP from local tool to paid pipeline | Optional-only proxy integration, local-first defaults |

## Stack Patterns by Variant

**If staying strictly single-machine/local:**
- Use SQLite file + `better-sqlite3`, single Fastify process, Crawlee local storage (`CRAWLEE_STORAGE_DIR`).
- Because this minimizes moving parts while preserving persistence, retries, and reproducibility.

**If later scaling beyond one machine:**
- Keep Fastify/Crawlee/Playwright, swap persistence to Postgres and add distributed queue (Redis or managed queue).
- Because crawler orchestration concerns change before scraper logic does; keep extraction code portable.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `fastify@5.7.x` | `node >=20` | Fastify v5 requires Node 20+; Node 22 LTS is safe baseline. |
| `@fastify/rate-limit@10.x` | `fastify ^5.x` | Plugin compatibility table explicitly maps 10.x to Fastify 5.x. |
| `playwright@1.58.x` | `node 20.x/22.x/24.x` | Official system requirements list these Node majors. |
| `crawlee@3.16.x` | `playwright` crawler classes | PlaywrightCrawler is the recommended browser crawler path in Crawlee docs. |
| `drizzle-orm@0.45.1` | `better-sqlite3@12.6.x` | Official Drizzle docs include better-sqlite3 driver setup for SQLite. |

## Sources

- /apify/crawlee (Context7) - features, PlaywrightCrawler guidance, local storage defaults (`./storage`), session/retry/autoscaling details. **Confidence: HIGH**
- https://crawlee.dev/js/docs/introduction - current JS docs versioning (3.16), crawler capability positioning. **Confidence: HIGH**
- /microsoft/playwright (Context7) + https://playwright.dev/docs/intro - Node support and installation/system requirements. **Confidence: HIGH**
- https://github.com/microsoft/playwright/releases - latest stable release evidence (`v1.58.2`, 2026-02-06). **Confidence: HIGH**
- /fastify/fastify (Context7) + https://fastify.dev/docs/latest/Guides/Migration-Guide-V5/ - Node 20+ requirement and v5 production baseline. **Confidence: HIGH**
- https://github.com/fastify/fastify-rate-limit - Fastify v5 plugin compatibility table (`@fastify/rate-limit >=10.x`). **Confidence: HIGH**
- /drizzle-team/drizzle-orm (Context7) + https://orm.drizzle.team/docs/get-started/sqlite-new - SQLite driver and migration workflow. **Confidence: HIGH**
- https://www.sqlite.org/about.html - SQLite serverless, single-file, zero-config rationale for local-first architecture. **Confidence: HIGH**
- https://apify.com/compass/crawler-google-places - target behavior reference and feature expectations for parity scope. **Confidence: MEDIUM**
- npm registry package versions via `npm view` on 2026-02-24 - exact package pins in this document. **Confidence: MEDIUM**

---
*Stack research for: local Google Maps scraper API*
*Researched: 2026-02-24*
