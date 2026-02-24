# Requirements: Google Maps Scraper API

**Defined:** 2026-02-24
**Core Value:** Given a search query and location scope, return reliable, structured Google Maps place data locally with no required paid services.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Input & Jobs

- [ ] **INPT-01**: User can submit a scrape job with keyword and location
- [ ] **INPT-02**: User can submit a scrape job using Google Maps URL input
- [ ] **INPT-03**: User can submit a scrape job using place ID input
- [ ] **JOBS-01**: User can view job status lifecycle (queued, running, completed, failed)
- [ ] **JOBS-02**: User can view run progress and basic metrics while a job executes

### Coverage & Deduplication

- [ ] **COVR-01**: User can collect results beyond the first visible viewport/page
- [ ] **COVR-02**: User can configure collection depth/limit for a run
- [ ] **COVR-03**: User receives deduplicated place results across overlapping scans

### Place Data

- [ ] **DATA-01**: User receives core place fields (name, category, rating, reviews count, address, coordinates)
- [ ] **DATA-02**: User receives contact and business fields when available (website, phone, opening hours)
- [ ] **DATA-03**: User can extract place reviews with configurable sort order and cap

### Reliability & Safety

- [ ] **RELY-01**: User jobs apply retry, backoff, and pacing defaults to reduce block risk
- [ ] **RELY-02**: User can run scraper locally without required paid proxy/captcha services
- [ ] **SAFE-01**: User receives explicit responsible-use and guardrail defaults (rate limit/backoff + sensitive field opt-in model)

### Output

- [ ] **OUTP-01**: User can fetch structured job results through API endpoints
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
| INPT-01 | Phase 2 | Pending |
| INPT-02 | Phase 2 | Pending |
| INPT-03 | Phase 2 | Pending |
| JOBS-01 | Phase 2 | Pending |
| JOBS-02 | Phase 2 | Pending |
| COVR-01 | Phase 3 | Pending |
| COVR-02 | Phase 3 | Pending |
| COVR-03 | Phase 3 | Pending |
| DATA-01 | Phase 4 | Pending |
| DATA-02 | Phase 4 | Pending |
| DATA-03 | Phase 5 | Pending |
| RELY-01 | Phase 1 | Pending |
| RELY-02 | Phase 1 | Pending |
| SAFE-01 | Phase 1 | Pending |
| OUTP-01 | Phase 6 | Pending |
| OUTP-02 | Phase 7 | Pending |
| OUTP-03 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-24*
*Last updated: 2026-02-24 after roadmap mapping*
