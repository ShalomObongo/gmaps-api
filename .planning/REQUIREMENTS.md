# Requirements: Google Maps Scraper API

**Defined:** 2026-02-24
**Core Value:** Given a search query and location scope, return reliable, structured Google Maps place data locally with no required paid services.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Input & Jobs

- [x] **INPT-01**: User can submit a scrape job with keyword and location
- [x] **INPT-02**: User can submit a scrape job using Google Maps URL input
- [x] **INPT-03**: User can submit a scrape job using place ID input
- [x] **JOBS-01**: User can view job status lifecycle (queued, running, completed, failed)
- [x] **JOBS-02**: User can view run progress and basic metrics while a job executes

### Coverage & Deduplication

- [x] **COVR-01**: User can collect results beyond the first visible viewport/page
- [x] **COVR-02**: User can configure collection depth/limit for a run
- [x] **COVR-03**: User receives deduplicated place results across overlapping scans

### Place Data

- [x] **DATA-01**: User receives core place fields (name, category, rating, reviews count, address, coordinates)
- [x] **DATA-02**: User receives contact and business fields when available (website, phone, opening hours)
- [x] **DATA-03**: User can extract place reviews with configurable sort order and cap

### Reliability & Safety

- [x] **RELY-01**: User jobs apply retry, backoff, and pacing defaults to reduce block risk
- [x] **RELY-02**: User can run scraper locally without required paid proxy/captcha services
- [x] **SAFE-01**: User receives explicit responsible-use and guardrail defaults (rate limit/backoff + sensitive field opt-in model)

### Output

- [x] **OUTP-01**: User can fetch structured job results through API endpoints
- [ ] **OUTP-02**: User can export results as JSON
- [ ] **OUTP-03**: User can export results as CSV

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Collection

- **ADVC-01**: User can use adaptive geospatial traversal (dynamic zoom and polygon tiling)
- **ADVC-02**: User can choose reliability modes (`fast`, `balanced`, `deep`)

### Monitoring & Enrichment

- **MONI-01**: User can run incremental recrawls and receive diff outputs (new/changed/closed)
- **ENRH-01**: User can optionally enrich place records with website-derived contacts/social links

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Hosted multi-tenant SaaS platform (auth, billing, hosted scheduler) | Not required for local-first v1 value |
| Guaranteed unblock at unlimited scale with zero paid infrastructure | Technically unrealistic under free/local constraints |
| Default-on reviewer PII extraction | Compliance and privacy risk; not required for core value |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INPT-01 | Phase 2 | Complete |
| INPT-02 | Phase 2 | Complete |
| INPT-03 | Phase 2 | Complete |
| JOBS-01 | Phase 2 | Complete |
| JOBS-02 | Phase 2 | Complete |
| COVR-01 | Phase 3 | Complete |
| COVR-02 | Phase 3 | Complete |
| COVR-03 | Phase 3 | Complete |
| DATA-01 | Phase 4 | Complete |
| DATA-02 | Phase 4 | Complete |
| DATA-03 | Phase 5 | Complete |
| RELY-01 | Phase 1 | Complete |
| RELY-02 | Phase 1 | Complete |
| SAFE-01 | Phase 1 | Complete |
| OUTP-01 | Phase 6 | Complete |
| OUTP-02 | Phase 7 | Pending |
| OUTP-03 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-24*
*Last updated: 2026-02-25 after phase 6 completion*
