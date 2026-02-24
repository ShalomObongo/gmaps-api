# Google Maps Scraper API

## What This Is

This project is a local-first API for scraping Google Maps place results without paid infrastructure. It is intended for developers who want Apify-like place crawling behavior from their own machine, including broad query coverage and structured output. The v1 focus is parity with the practical workflow of `apify/compass/crawler-google-places`, but fully runnable for free.

## Core Value

Given a search query and location scope, return reliable, structured Google Maps place data locally with no required paid services.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Run the scraper and API locally with zero required paid dependencies
- [ ] Accept place search inputs (keyword, location, limits) and execute crawl jobs
- [ ] Extract useful place fields (name, category, rating, reviews count, address, coordinates, website, phone, opening hours when available)
- [ ] Support pagination/deep result collection to gather more than the first page of results
- [ ] Return/export structured data in developer-friendly formats compatible with common scraper workflows

### Out of Scope

- Hosted multi-tenant SaaS deployment — local execution is the stated priority
- Guaranteed bypass of all anti-bot protections at scale — requires paid proxy/captcha infrastructure
- Exact clone of every Apify platform feature (cloud scheduling, hosted runs, marketplace billing) — v1 targets crawler capability parity, not platform parity

## Context

The user wants a Google Maps scraper API that behaves similarly to `https://apify.com/compass/crawler-google-places` but runs locally for free. This is a greenfield project with no existing application code. Success depends on balancing extraction completeness, local reliability, and practical anti-blocking behavior under free constraints.

## Constraints

- **Budget**: Fully free local operation — no mandatory paid APIs/services
- **Runtime**: Must run on local developer machine — no cloud requirement
- **Compatibility**: API behavior should feel familiar to users of Apify Google Places crawler workflows
- **Compliance**: Implementation should include guardrails (rate limiting/backoff and clear usage responsibility) to reduce abuse risk

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Local-first architecture | User explicitly requires completely free local runs | — Pending |
| Apify-like crawler behavior target | Clear benchmark for output expectations and scope | — Pending |
| Prioritize extraction reliability over advanced platform features | v1 value is usable place data, not full SaaS feature set | — Pending |

---
*Last updated: 2026-02-24 after initialization*
