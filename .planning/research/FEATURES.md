# Feature Research

**Domain:** Local Google Maps scraper API (local-first, free runner)
**Researched:** 2026-02-24
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Keyword + location search inputs | Every serious Maps scraper supports query + geography (city/country/coords/URL) | LOW | Must accept `keyword + location`, Google Maps URLs, and place IDs; this is baseline parity with Apify/SerpApi/Outscraper. |
| Deep result collection beyond first viewport | Users buy scrapers specifically to get broad coverage, not just first visible set | HIGH | Requires map traversal/tiling + scroll pagination, not a single static map view. |
| Core place fields extraction | Users expect structured lead-ready place data out of the box | MEDIUM | Name, category, rating, reviews count, address, lat/lng, website, phone, hours, place IDs. |
| Reviews extraction with sorting/filtering | Reviews are central for lead qualification and reputation workflows | MEDIUM | Support newest/relevant/high/low sort and optional keyword/date filters. |
| Structured export + API access | Users expect machine-consumable output, not UI-only scraping | LOW | JSON + CSV minimum, stable schema, predictable job/result endpoints. |
| Job control + run visibility | Standard in current tools: start, monitor, resume/download | MEDIUM | Local API should expose job states, progress, and artifacts. |
| Basic anti-blocking resilience | Scrapers are expected to survive normal bot defenses | HIGH | Retry/backoff, pacing, browser fingerprint hygiene, optional proxy hooks. |
| De-duplication across overlapping scans | Overlap is inherent to map traversal; duplicates break downstream value | MEDIUM | Dedup by stable IDs (`place_id`, CID/FID fallback), not only name/address fuzzy matching. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Adaptive geospatial traversal (dynamic zoom + polygon tiling) | Higher recall per run on local hardware with fewer wasted requests | HIGH | Use area-aware zoom strategy and polygon splitting; this is where local runner quality can beat "simple scroll" tools. |
| Reliability modes (`fast`, `balanced`, `deep`) | Gives users explicit speed-vs-completeness control | MEDIUM | Inspired by ecosystem search strategy variants; critical for local budgeted runs. |
| Incremental recrawl + diff outputs | Turns one-off scraping into ongoing monitoring (new/changed/closed places) | HIGH | Emit change sets between runs; major practical differentiator for local ops. |
| Optional enrichment pipeline (website contacts/social links) | Converts place discovery into immediate outreach value | HIGH | Keep as optional stage, disabled by default to preserve free/local-first baseline. |
| Strong local-first operability | Faster onboarding than cloud-first products; zero paid dependency default | MEDIUM | One-command local run, local storage, no account requirement, optional paid infra only when user opts in. |
| Compliance guardrails by design | Reduces legal/ethics foot-guns while keeping tool useful | MEDIUM | PII toggles off by default, explicit consent flags, rate-limit defaults, clear responsibility notices. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| "Guaranteed unblocked at any scale with zero proxies" | Users want magical reliability for free | Not technically credible; leads to false promises and support churn | Position as best-effort local scraping with optional proxy/captcha integrations. |
| Full hosted SaaS surface in v1 (multi-tenant auth, cloud scheduler, billing) | Feels like "real product" parity with Apify platform | Dilutes core value (local scraper quality) and explodes scope | Keep v1 local-only; expose clean API so later hosting is additive. |
| Full reviewer PII extraction by default | Lead-gen users ask for maximum data | Legal/compliance risk and unnecessary default blast radius | Default to non-PII output; require explicit opt-in for personal fields. |
| "Always scrape all reviews/images" as default | Users fear missing data | Massive runtime and instability on local machines | Add hard caps + user-selectable depth presets. |

## Feature Dependencies

```
[Geospatial traversal + pagination]
    └──requires──> [Input model: keyword/location/URL/place_id]
                       └──requires──> [Canonical place identity model]

[Core place extraction]
    └──requires──> [Canonical place identity model]

[Reviews extraction]
    └──requires──> [Detail-page scraping pipeline]

[Deduplication]
    └──requires──> [Canonical place identity model]

[Incremental recrawl + diffs]
    └──requires──> [Deduplication]
    └──requires──> [Persistent run history]

[Enrichment pipeline] ──enhances──> [Core place extraction]

[Aggressive throughput settings] ──conflicts──> [Block-resistance/stability]
```

### Dependency Notes

- **Geospatial traversal requires robust inputs:** traversal quality depends on precise location primitives (city, polygon, coords, URL, place ID).
- **Core extraction requires canonical identity:** without stable IDs, deduplication and downstream updates are unreliable.
- **Reviews extraction requires detail-page pipeline:** list pages alone cannot provide full review controls.
- **Incremental diffs require persistence:** you need prior snapshots and stable IDs before "what changed" can exist.
- **Aggressive throughput conflicts with stability:** more concurrency usually raises block/captcha rates on local free setups.

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] Keyword/location/URL/place ID inputs + run API — core usability parity.
- [ ] Deep traversal + pagination + deduplication — core value beyond manual/official limits.
- [ ] Core fields export (JSON/CSV) + job status endpoints — developer-ready output.
- [ ] Basic resilience controls (rate limiting, retries, backoff) — realistic local reliability.

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Reviews depth controls (sort/date/keyword, caps) — add when base extraction is stable.
- [ ] Strategy profiles (`fast/balanced/deep`) — add when performance baselines are measured.
- [ ] Optional enrichment stage (emails/social) — add when core throughput is predictable.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Incremental recrawl + diff feeds — high leverage but architecture-heavy.
- [ ] Distributed multi-node local cluster mode — useful at scale, not needed for initial validation.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Input model (query/location/URL/place ID) | HIGH | LOW | P1 |
| Deep traversal + pagination | HIGH | HIGH | P1 |
| Core place fields extraction | HIGH | MEDIUM | P1 |
| Deduplication | HIGH | MEDIUM | P1 |
| Structured export + API jobs | HIGH | LOW | P1 |
| Reviews controls | MEDIUM | MEDIUM | P2 |
| Strategy profiles | MEDIUM | MEDIUM | P2 |
| Optional enrichment pipeline | MEDIUM | HIGH | P2 |
| Incremental diffs | HIGH | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Competitor A (Apify Google Maps Scraper) | Competitor B (Outscraper / SerpApi / Bright Data) | Our Approach (local free runner) |
|---------|-------------------------------------------|----------------------------------------------------|----------------------------------|
| Search inputs | Rich inputs: terms, URLs, place IDs, geolocation/polygons | Rich inputs via API params and geolocation controls | Match breadth; keep input schema simple and scriptable. |
| Coverage depth | Dynamic traversal updates, deep scraping options | Pagination/offset + query controls, cloud-scale infra | Prioritize traversal quality with local constraints first. |
| Data richness | Very broad fields incl. reviews/images/add-ons | Broad fields, place/reviews/photos endpoints | Ship core fields first; add expensive enrichments as opt-in stages. |
| Reliability model | Managed cloud actor with platform monitoring | Managed API with proxy/captcha infra bundled | Best-effort local reliability with optional external proxy integration. |
| Delivery model | Hosted actor + API + scheduling | Hosted APIs/SaaS | Local-first binary/container + local API, no paid dependency by default. |

## Sources

- Apify Google Maps Scraper README/Input/Changelog (feature set, traversal, enrichments, schema evolution): https://apify.com/compass/crawler-google-places (MEDIUM)
- Apify input schema page (filters, place IDs, reviews/images/enrichment controls): https://apify.com/compass/crawler-google-places/input-schema (MEDIUM)
- Apify changelog (recent capability evolution and stability fixes): https://apify.com/compass/crawler-google-places/changelog (MEDIUM)
- SerpApi Google Maps API docs (query params, pagination/localization): https://serpapi.com/google-maps-api (MEDIUM)
- SerpApi Place Results and Reviews API docs (structured place/review fields and filters): https://serpapi.com/maps-place-results, https://serpapi.com/google-maps-reviews-api (MEDIUM)
- Outscraper Google Maps Scraper page and data dictionary (field depth, export formats, enrichment positioning): https://outscraper.com/google-maps-scraper/ (LOW-MEDIUM, marketing-heavy)
- Bright Data Google Maps Scraper API page (parameterized maps scraping and anti-blocking positioning): https://brightdata.com/products/serp-api/google-search/maps (LOW-MEDIUM, marketing-heavy)
- Open-source baselines for local-first expectations (CLI/API/UI, outputs, proxy hooks): https://github.com/gosom/google-maps-scraper, https://github.com/omkarcloud/google-maps-scraper (MEDIUM)
- Google Places API overview (official place IDs/details/photos capabilities for baseline comparison): https://developers.google.com/maps/documentation/places/web-service/overview (HIGH)

---
*Feature research for: local Google Maps scraper API*
*Researched: 2026-02-24*
