# Pitfalls Research

**Domain:** Local-first Google Maps scraper API (free/local constraints)
**Researched:** 2026-02-24
**Confidence:** MEDIUM

## Critical Pitfalls

### Pitfall 1: Treating legal/compliance as "later"

**What goes wrong:**
The project ships a scraper that collects and republishes Google Maps content without explicit guardrails, then gets blocked, suspended, or becomes unsafe to operate.

**Why it happens:**
Teams focus on technical feasibility first and ignore Terms boundaries until launch.

**How to avoid:**
Define a compliance boundary in phase 0: clear usage policy, explicit user responsibility, conservative defaults (rate limiting/backoff), and a documented "official API fallback" option for compliant workflows.

**Warning signs:**
- No written usage policy in repo/docs
- No rate limits/backoff in first implementation
- Requirements talk about "bypass" instead of "best-effort reliability"

**Phase to address:**
Phase 0 - Constraints and compliance guardrails

---

### Pitfall 2: Assuming local/free can reliably beat anti-bot defenses at scale

**What goes wrong:**
Runs degrade quickly (CAPTCHA/blocks/timeouts), especially under higher concurrency or long jobs, and output becomes sparse/empty.

**Why it happens:**
Local-first + free infrastructure usually means weak proxy budget and no CAPTCHA-solving path; teams overpromise throughput anyway.

**How to avoid:**
Set honest SLOs for local mode, implement adaptive throttling, expose "degraded run" status, and make proxy support optional but first-class. Treat anti-blocking as probabilistic, not guaranteed.

**Warning signs:**
- Sudden spike in empty results per query
- Frequent consent/challenge pages in traces/screenshots
- Success rate drops as concurrency increases

**Phase to address:**
Phase 1 - Crawl engine reliability baseline

---

### Pitfall 3: Brittle extraction tied to unstable UI selectors and fixed sleeps

**What goes wrong:**
Minor Google Maps UI changes silently break parsing (fields become zero/empty, reviews missing, list/feed not detected).

**Why it happens:**
Implementations overuse CSS/XPath + hardcoded waits instead of resilient locators, retries, and fallback parsing.

**How to avoid:**
Use locator-based interactions, event/signal-based waits, and extractor contract tests against golden pages. Add fallback parsers for high-value fields (name, address, place ID, rating).

**Warning signs:**
- Rising parse-null rate for previously stable fields
- "Works locally today" but frequent patch PRs for timeout/selector tweaks
- Review counts/hours regress to empty or single-day artifacts

**Phase to address:**
Phase 1 - Crawl engine reliability baseline

---

### Pitfall 4: Mistaking one query/viewport for market coverage

**What goes wrong:**
API returns plausible but incomplete datasets (coverage holes by neighborhood/category/synonym), leading to false confidence.

**Why it happens:**
Teams do single-pass keyword+location runs and skip spatial partitioning, synonym expansion, and dedupe-aware multi-query strategies.

**How to avoid:**
Design coverage strategy early: tile/polygon partitioning, controlled keyword/category sets, overlap dedupe, and per-area coverage metrics.

**Warning signs:**
- Result counts plateau unexpectedly across large cities
- Big swings when only query wording changes
- Sparse results in known dense areas

**Phase to address:**
Phase 2 - Coverage and pagination strategy

---

### Pitfall 5: Locale/time parsing bugs that corrupt business fields

**What goes wrong:**
Opening hours, addresses, numbers, and review counts are parsed incorrectly due to locale-specific formatting and language differences.

**Why it happens:**
Scrapers are tested in one locale only and assume one date/time/number format.

**How to avoid:**
Pin locale inputs where possible, normalize formats centrally, and run fixture tests across at least 3 locales. Store raw source snippets for disputed fields.

**Warning signs:**
- Fields like `reviews_count=0` for obviously popular places
- Hours captured for one weekday only
- Address component shifts after language change

**Phase to address:**
Phase 3 - Data normalization and validation

---

### Pitfall 6: Weak identity/dedup strategy (URL-based only)

**What goes wrong:**
Duplicate businesses flood results, or distinct businesses are merged incorrectly when URLs/labels vary.

**Why it happens:**
Teams key records by scraped URL/title instead of stable identifiers + geo/context heuristics.

**How to avoid:**
Use layered identity: primary stable ID (e.g., place_id/cid when available), secondary fuzzy match (name+address+geo), and deterministic conflict rules.

**Warning signs:**
- Duplicate rate increases with multi-query runs
- Same place appears with slight URL/title variants
- Downstream users manually dedupe every export

**Phase to address:**
Phase 3 - Data model and dedup layer

---

### Pitfall 7: No resumability/observability for long local runs

**What goes wrong:**
A crash or block event loses progress; operators cannot tell whether failures are blocking, parsing, or infra-related.

**Why it happens:**
Greenfield builds prioritize happy-path API responses over job lifecycle design.

**How to avoid:**
Implement persistent job state, checkpointing, retry classification, and per-stage metrics (fetch, render, parse, persist). Add run artifacts (logs, screenshots, failed URLs).

**Warning signs:**
- Restart always means "start from zero"
- One generic "failed" status for all errors
- No per-field quality dashboard over time

**Phase to address:**
Phase 4 - API/job orchestration hardening

---

### Pitfall 8: Collecting reviewer/contact personal data without controls

**What goes wrong:**
The API captures emails/reviewer identifiers by default without lawful-basis checks, retention policy, or access controls.

**Why it happens:**
Lead-gen use cases push teams to extract everything first, governance later.

**How to avoid:**
Default to minimal fields, gate PII fields behind explicit opt-in flags, log consent/justification requirements in docs, and enforce retention + export controls.

**Warning signs:**
- PII in default output schema
- No data retention/deletion settings
- No field-level access policy for sensitive exports

**Phase to address:**
Phase 0 and Phase 4 - Data governance baseline and enforcement

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoded sleeps for page readiness | Fast initial prototype | Flaky extraction and constant hotfixes | Prototype spike only (never in MVP) |
| URL/title-only dedupe | Simple implementation | High duplicate/merge errors in real datasets | Never |
| Single-language parsing assumptions | Faster parser code | Silent data corruption in non-English markets | Single-region POC only |
| In-memory-only job state | Minimal infra | Lost progress on crash, poor operator UX | Tiny manual runs only |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Browser automation (Playwright/Crawlee) | Treating blocked/timeouts as generic failures | Classify block vs transient vs parser failures; apply targeted retries/session rotation |
| Proxy layer | Adding proxies late after core logic | Design proxy/session hooks from day one; make behavior observable per session |
| Export pipeline | Emitting only final JSON/CSV | Persist raw + normalized + quality metadata for audit/debug |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Over-concurrency on one local machine | More failures, fewer successful places/min | Adaptive concurrency based on failure/block rate | Usually beyond 3-10 concurrent browser pages locally |
| Deep extraction on every place by default | Runs become extremely slow | Tiered extraction (core fields first, deep enrichment optional) | Mid/large city runs |
| No checkpointing on long jobs | Crash loses hours of work | Persistent queue + resumable checkpoints | Any run over ~15-30 min |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing local scraper API without auth | Unauthorized scraping from your machine | Local auth token + bind to localhost by default |
| Storing raw scraped output indefinitely | Sensitive data accumulation and compliance risk | Retention policies + periodic purge jobs |
| Logging full payloads with contact data | PII leakage in logs | Structured redaction at logger boundary |

## "Looks Done But Isn't" Checklist

- [ ] **Coverage:** Includes spatial partitioning and overlap dedupe, not just one query+location
- [ ] **Reliability:** Has block-aware retry strategy, not just generic retries
- [ ] **Data quality:** Tracks null-rate/regression for key fields over builds
- [ ] **Operations:** Jobs resume after crash and expose failure taxonomy
- [ ] **Governance:** PII extraction is opt-in with retention controls

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Compliance deferred | Phase 0 | Policy + guardrails documented; defaults enforce throttling |
| Anti-bot overpromising | Phase 1 | Success rate and block rate SLOs tracked per run |
| Brittle selectors/waits | Phase 1 | Contract tests + parser regression suite pass |
| Coverage illusion | Phase 2 | Coverage report by tile/query and duplicate-adjusted counts |
| Locale parsing corruption | Phase 3 | Multi-locale fixtures pass with low parse-error rate |
| Weak dedupe identity | Phase 3 | Duplicate rate threshold met on benchmark dataset |
| Non-resumable operations | Phase 4 | Kill/restart test resumes from checkpoint |
| Uncontrolled PII collection | Phase 0 + 4 | Sensitive fields disabled by default + retention policy active |

## Sources

- Google Maps Platform Terms of Service (notably "No Scraping" and misuse restrictions): https://cloud.google.com/maps-platform/terms (HIGH)
- Google Maps End User Additional Terms (prohibited conduct, mass download/bulk feeds): https://www.google.com/help/terms_maps/ (HIGH)
- Crawlee docs (session/proxy/fingerprinting/anti-blocking patterns): https://github.com/apify/crawlee/blob/master/docs/guides/avoid_blocking.mdx and related guides (HIGH)
- Playwright docs (locator-first, avoid hard waits, auto-wait best practices): https://github.com/microsoft/playwright.dev/blob/main/nodejs/versioned_docs/version-stable/best-practices.mdx and API docs for waitForTimeout warnings (HIGH)
- gosom/google-maps-scraper README (proxy usage, blocking warnings, local resource constraints): https://raw.githubusercontent.com/gosom/google-maps-scraper/master/README.md (MEDIUM)
- gosom/google-maps-scraper issue stream showing real breakage modes (timeouts, empty reviews/count anomalies, Docker/runtime issues): https://api.github.com/repos/gosom/google-maps-scraper/issues?state=open&per_page=100 (MEDIUM)
- Apify actor page for compass/crawler-google-places (input/coverage caveats, category pitfalls, practical constraints): https://apify.com/compass/crawler-google-places (MEDIUM)

---
*Pitfalls research for: Local Google Maps scraper API*
*Researched: 2026-02-24*
