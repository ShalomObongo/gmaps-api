# Phase 1: Local Runtime Safety Baseline - Research

**Researched:** 2026-02-25
**Domain:** Local-first scraper runtime safety and reliability defaults
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RELY-01 | User jobs apply retry, backoff, and pacing defaults to reduce block risk | Use Crawlee retry/session/fingerprint defaults, plus explicit per-job pacing policy and failure classification. |
| RELY-02 | User can run scraper locally without required paid proxy/captcha services | Use local-only default stack (Crawlee + Playwright + SQLite), optional proxy/captcha hooks disabled by default. |
| SAFE-01 | User receives explicit responsible-use and guardrail defaults (rate limit/backoff + sensitive field opt-in model) | Expose startup/runtime guardrail notices, enforce API rate limits, and gate sensitive fields behind explicit opt-in flags. |
</phase_requirements>

## Summary

Phase 1 should be planned as an "operational baseline" phase, not a feature breadth phase. The objective is to make local runs predictable, bounded, and safe by default before building deeper crawl capabilities. For this phase, success is mostly about runtime policy and control surfaces: retries, backoff, pacing, run-state visibility, and explicit guardrails.

The standard implementation path is a local Node.js service using Fastify + Crawlee PlaywrightCrawler with persisted local storage (`./storage` by default) and no mandatory paid integrations. Crawlee already provides key primitives (request retries, queue persistence, fingerprints, session support), so planning should focus on wiring explicit defaults, ensuring they are visible to users, and adding guardrail enforcement at API boundaries.

Compliance and abuse-risk handling must be first-class in this phase. Google Maps terms explicitly prohibit scraping/bulk extraction for external reuse; even in a local tool, you should include explicit responsible-use messaging, conservative defaults, and opt-in-only sensitive extraction settings. This phase should produce reliable local behavior with transparent limits, not "guaranteed unblock" claims.

**Primary recommendation:** Plan Phase 1 around a small vertical slice that hardens runtime policy (retry/backoff/pacing + guardrails + opt-in sensitive fields) before expanding crawl coverage depth.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | 22 LTS | Runtime | Stable, current LTS baseline compatible with Fastify v5 and Playwright. |
| TypeScript | 5.9.x | Typed runtime/config contracts | Reduces config and extraction drift in reliability-critical paths. |
| Crawlee | 3.16.x | Crawl orchestration (queue, retries, storage, sessions) | Built-in retry/session/storage primitives avoid custom reliability framework work. |
| Playwright | 1.58.x | Browser automation for Maps UI | Robust for dynamic pages; locator/auto-wait model improves runtime stability. |
| Fastify | 5.7.x | Local API surface | Simple high-performance API with plugin ecosystem for guardrails. |
| SQLite + better-sqlite3 + Drizzle | drizzle-orm 0.45.x, better-sqlite3 12.6.x | Local durable metadata | Keeps phase fully local/free while persisting job state and runtime metrics. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @fastify/rate-limit | 10.x | API-level guardrails and abuse prevention | Apply globally, with stricter limits on job creation routes. |
| zod | 4.x | Runtime config/input validation | Validate reliability knobs and sensitive field flags at ingress. |
| pino | 10.x | Structured logs | Emit retry/backoff/block/pacing events for diagnostics. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Crawlee retry/session/storage | Hand-rolled queue + retry engine | High edge-case risk and slower delivery for no Phase 1 value gain. |
| Local-only baseline | Mandatory proxy/captcha services | Violates RELY-02 and raises cost/ops burden prematurely. |
| Fastify rate limiting plugin | Custom middleware throttler | More bugs/maintenance, less confidence than standard plugin path. |

**Installation:**
```bash
npm install fastify crawlee playwright drizzle-orm better-sqlite3 zod pino @fastify/rate-limit
npm install -D typescript @types/node tsx
```

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── api/                 # Fastify routes, schemas, guardrail middleware
├── orchestration/       # job lifecycle, retry/backoff policy, pacing policy
├── crawler/             # Crawlee PlaywrightCrawler handlers and block signals
├── safety/              # responsible-use notices, sensitive field policy
├── storage/             # SQLite repositories and Crawlee storage bridge
└── config/              # validated defaults and env overrides
```

### Pattern 1: Policy-first Job Envelope
**What:** Resolve each submitted job into a normalized runtime policy object (`retry`, `backoff`, `pacing`, `sensitiveFields`) before enqueueing.
**When to use:** Always, for every submitted run.
**Example:**
```typescript
type JobRuntimePolicy = {
  maxRetries: number;
  backoffBaseMs: number;
  backoffMaxMs: number;
  pacingDelayMs: [number, number];
  sensitiveFieldsEnabled: boolean;
};

function buildPolicy(input: Partial<JobRuntimePolicy>): JobRuntimePolicy {
  return {
    maxRetries: input.maxRetries ?? 3,
    backoffBaseMs: input.backoffBaseMs ?? 1500,
    backoffMaxMs: input.backoffMaxMs ?? 20000,
    pacingDelayMs: input.pacingDelayMs ?? [800, 2200],
    sensitiveFieldsEnabled: input.sensitiveFieldsEnabled ?? false,
  };
}
```

### Pattern 2: Async API -> Queue (no in-request scraping)
**What:** `POST /jobs` persists the job and policy, enqueues work, and returns immediately.
**When to use:** Always for long-running browser work.
**Example:**
```typescript
const job = await jobsRepo.create({ input, policy, status: 'queued' });
await queue.enqueue({ jobId: job.id });
return reply.code(202).send({ jobId: job.id, status: 'queued' });
```

### Pattern 3: Block-aware retry and pacing
**What:** Retries are not blind loops. Classify transient vs likely-blocked failures, apply exponential backoff with jitter, and add inter-action pacing delays.
**When to use:** In crawler request handlers and failed request handlers.
**Example:**
```typescript
function computeBackoff(attempt: number, baseMs: number, maxMs: number): number {
  const exp = Math.min(maxMs, baseMs * 2 ** attempt);
  const jitter = Math.floor(Math.random() * 400);
  return exp + jitter;
}

function shouldRetry(err: Error): boolean {
  return /timeout|net::ERR|temporarily unavailable|429/i.test(err.message);
}
```

### Anti-Patterns to Avoid
- **Synchronous scrape endpoints:** browser work inside HTTP request thread causes timeouts and no recovery semantics.
- **"Fast by default" concurrency:** aggressive defaults increase block rate and violate reliability goals.
- **Hardcoded `waitForTimeout` flow control:** brittle and flaky; prefer locator/actionability and event-driven waits.
- **Default-on sensitive extraction:** violates SAFE-01 intent and increases governance risk.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Retry queue engine | Custom queue + retry persistence | Crawlee RequestQueue + crawler retry options | Already battle-tested for crawl workloads and persistence behavior. |
| API rate limiter | Bespoke token-bucket middleware | `@fastify/rate-limit` | Standard plugin, route-level overrides, less bug risk. |
| Browser stealth/fingerprint stack | Ad hoc spoof scripts | Crawlee browser pool fingerprint defaults | Default fingerprint handling already enabled for PlaywrightCrawler. |
| Local storage format conventions | Custom file layouts | Crawlee storage (`CRAWLEE_STORAGE_DIR`, default `./storage`) + SQLite metadata | Predictable, documented, easier debugging/resume behavior. |

**Key insight:** Phase 1 value comes from safe default policy and operability, not custom infrastructure. Reuse crawler/server primitives so planning can focus on guardrails and reliability behavior.

## Common Pitfalls

### Pitfall 1: "No paid services" interpreted as "no reliability controls"
**What goes wrong:** Team removes proxy/captcha dependencies but also omits retry/backoff/pacing, causing frequent failed runs.
**Why it happens:** RELY-02 is misread as "minimal config only."
**How to avoid:** Keep paid services optional, but enforce built-in local reliability defaults at policy layer.
**Warning signs:** High fail rate, repeated timeouts, no visible backoff events in logs.

### Pitfall 2: Hidden defaults users cannot inspect
**What goes wrong:** Runtime policies exist but are undocumented or not exposed in API responses/docs.
**Why it happens:** "Internal defaults" are implemented without user-facing surfaces.
**How to avoid:** Return effective policy in job metadata; document defaults in startup banner and API docs.
**Warning signs:** User confusion about pacing/retry behavior and inability to explain run outcomes.

### Pitfall 3: Over-promising unblock behavior
**What goes wrong:** Product messaging implies guaranteed success without proxies/captcha; real runs degrade under load.
**Why it happens:** Reliability claims exceed local/free constraints.
**How to avoid:** Position as best-effort local reliability; track and expose degraded/block indicators.
**Warning signs:** Rising block pages with unchanged configuration, support requests about "empty results."

### Pitfall 4: Guardrails only in docs, not enforced
**What goes wrong:** README says "use responsibly" but API has no throttles or sensitive-field gating.
**Why it happens:** Compliance treated as communication only.
**How to avoid:** Enforce API rate limits, opt-in flags, and rejection of unsafe combinations in code.
**Warning signs:** Any client can submit unlimited jobs; sensitive fields included in default schema.

## Code Examples

Verified patterns from official sources:

### Crawlee local storage default and request queue
```typescript
import { PlaywrightCrawler, RequestQueue } from 'crawlee';

const requestQueue = await RequestQueue.open();
await requestQueue.addRequests([{ url: 'https://example.com' }]);

const crawler = new PlaywrightCrawler({
  requestQueue,
  maxConcurrency: 5,
  async requestHandler({ request, page, log }) {
    log.info(`Processing ${request.url}`);
    await page.waitForLoadState('domcontentloaded');
  },
});

await crawler.run();
```

### Fastify guardrail baseline with rate limiting
```typescript
import Fastify from 'fastify';

const app = Fastify({ logger: true });
await app.register(import('@fastify/rate-limit'), {
  global: true,
  max: 30,
  timeWindow: '1 minute',
});

app.post('/jobs', {
  config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
}, async () => ({ accepted: true }));
```

### Playwright reliability posture (locator-first, no hard sleeps)
```typescript
const placeCard = page.getByRole('article').first();
await placeCard.getByRole('link').click();
await page.getByRole('heading').first().waitFor();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual CSS/XPath + sleeps everywhere | Locator/auto-wait-first automation | Mainstream in modern Playwright guidance | Lower flake rate and fewer timing bugs. |
| DIY crawl queue/retry loop | Framework-managed queue/retry/session (Crawlee) | Matured across Crawlee 3.x | Faster delivery and fewer operational edge-case bugs. |
| "Cloud or nothing" scraper assumptions | Local-first pipelines with optional add-ons | Current local tooling ecosystem | Enables RELY-02 while preserving baseline reliability controls. |

**Deprecated/outdated:**
- `waitForTimeout` as core control flow: discouraged because it is flaky and brittle.
- Claiming guaranteed unblock without paid infrastructure: not credible under real-world anti-bot behavior.

## Open Questions

1. **What default retry/pacing numbers should be shipped in v1?**
   - What we know: Conservative defaults are required for RELY-01 and should be visible.
   - What's unclear: Exact thresholds per machine/network profile.
   - Recommendation: Start with fixed conservative defaults (e.g., retries=3, delay 0.8-2.2s, capped exponential backoff), then tune from telemetry.

2. **Which fields are considered "sensitive" for SAFE-01 in this project?**
   - What we know: Sensitive collection must be opt-in by default.
   - What's unclear: Exact phase-1 field list boundary (reviewer identifiers, extracted emails, etc.).
   - Recommendation: Define explicit allowlist for default output and separate `includeSensitiveFields` gate with warning text.

3. **How should degraded/block state be surfaced to users?**
   - What we know: Users need explicit guardrails and realistic reliability expectations.
   - What's unclear: Final UX shape (API status flags vs warning arrays vs both).
   - Recommendation: Add machine-readable run warnings (`BLOCK_DETECTED`, `HIGH_RETRY_RATE`) and include in job status payload.

## Sources

### Primary (HIGH confidence)
- `/apify/crawlee` (Context7) - PlaywrightCrawler, request queue/storage, session/fingerprint and runtime docs.
- https://crawlee.dev/js/docs/guides/request-storage - local storage defaults and queue persistence behavior.
- https://crawlee.dev/js/docs/guides/configuration - `CRAWLEE_STORAGE_DIR`, `CRAWLEE_MEMORY_MBYTES`, config precedence.
- https://crawlee.dev/js/docs/guides/avoid-blocking - fingerprint defaults and anti-blocking guidance.
- `/fastify/fastify-rate-limit` (Context7) - plugin usage and route/global limit configuration.
- https://playwright.dev/docs/best-practices - locator-first/auto-wait guidance and anti-flake patterns.
- https://playwright.dev/docs/api/class-page#page-wait-for-timeout - hard timeout warning (debug-only usage).

### Secondary (MEDIUM confidence)
- https://crawlee.dev/js/docs/guides/running-in-web-server - API-to-crawler handoff pattern with `keepAlive` workers.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified against current docs and project research baseline.
- Architecture: HIGH - established async job/crawler patterns with official references.
- Pitfalls: MEDIUM-HIGH - strongly evidenced, but exact anti-bot behavior varies by environment.

**Research date:** 2026-02-25
**Valid until:** 2026-03-27
