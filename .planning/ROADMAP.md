# Roadmap: Google Maps Scraper API

## Overview

This roadmap delivers a local-first Google Maps scraping API from foundation constraints to production-usable outputs, in dependency order. Each phase completes a user-visible capability and maps every v1 requirement exactly once.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Local Runtime Safety Baseline** - Local execution works with guardrails and reliability defaults. (Completed 2026-02-25)
- [x] **Phase 2: Job Intake and Visibility** - Users can submit jobs through all v1 inputs and track them while running. (Completed 2026-02-25)
- [ ] **Phase 3: Coverage and Deduplication** - Runs go beyond first viewport and return unique places.
- [ ] **Phase 4: Place Detail Extraction** - Place records include core and available business/contact fields.
- [ ] **Phase 5: Reviews Collection Controls** - Runs can collect reviews with configurable ordering and caps.
- [ ] **Phase 6: Results API Access** - Completed run data is retrievable through structured API endpoints.
- [ ] **Phase 7: JSON and CSV Exports** - Users can export run outputs in standard scraper-friendly formats.

## Phase Details

### Phase 1: Local Runtime Safety Baseline
**Goal**: Users can run the scraper locally with safe, default reliability behavior and explicit usage guardrails.
**Depends on**: Nothing (first phase)
**Requirements**: RELY-01, RELY-02, SAFE-01
**Success Criteria** (what must be TRUE):
  1. User can start the API and run jobs locally without configuring paid proxy or captcha services.
  2. User-submitted jobs automatically apply retry, backoff, and pacing defaults during execution.
  3. User sees responsible-use guardrails, and sensitive field collection stays opt-in by default.
**Plans**: 2 plans
Plans:
- [x] 01-01-PLAN.md - Bootstrap local runtime foundation and queued job intake with paid-service-free defaults.
- [x] 01-02-PLAN.md - Enforce retry/backoff/pacing and API safety guardrails with sensitive-field opt-in.

### Phase 2: Job Intake and Visibility
**Goal**: Users can submit scrape jobs through all supported v1 inputs and observe run lifecycle in real time.
**Depends on**: Phase 1
**Requirements**: INPT-01, INPT-02, INPT-03, JOBS-01, JOBS-02
**Success Criteria** (what must be TRUE):
  1. User can submit a job using keyword plus location inputs and receive a job ID.
  2. User can submit a job using either a Google Maps URL or a place ID input.
  3. User can observe each run move through queued, running, completed, or failed states.
  4. User can view live progress and basic run metrics while the job is executing.
**Plans**: 2 plans
Plans:
- [x] 02-01-PLAN.md - Add typed multi-format intake normalization for keyword/location, maps URL, and place ID job submission.
- [x] 02-02-PLAN.md - Persist lifecycle/progress state and expose polling visibility for live job status metrics.

### Phase 3: Coverage and Deduplication
**Goal**: Users can collect deeper result sets and receive deduplicated places across overlapping scans.
**Depends on**: Phase 2
**Requirements**: COVR-01, COVR-02, COVR-03
**Success Criteria** (what must be TRUE):
  1. User can collect place results beyond the first visible viewport/page.
  2. User can set a depth or limit value that changes how far a run continues collecting.
  3. User receives a deduplicated place list even when scan areas overlap.
**Plans**: 3 plans
Plans:
- [ ] 03-01-PLAN.md - Add typed, persisted collection depth controls so each run has durable coverage limits.
- [ ] 03-02-PLAN.md - Build bounded traversal plus storage-level dedup foundations for unique place outputs.
- [ ] 03-03-PLAN.md - Integrate worker and status metrics so dedup behavior is observable during runs.

### Phase 4: Place Detail Extraction
**Goal**: Users receive reliable structured place records with core identity/location data and available business details.
**Depends on**: Phase 3
**Requirements**: DATA-01, DATA-02
**Success Criteria** (what must be TRUE):
  1. User receives place records containing name, category, rating, reviews count, address, and coordinates.
  2. User receives website, phone, and opening hours fields when those fields are present on the source listing.
  3. User receives consistently structured place objects across all records in a run.
**Plans**: TBD

### Phase 5: Reviews Collection Controls
**Goal**: Users can extract review data with explicit control over ordering and collection size.
**Depends on**: Phase 4
**Requirements**: DATA-03
**Success Criteria** (what must be TRUE):
  1. User can request review extraction for a run and receive review records in output.
  2. User can choose review sort order and observe output ordering match the selection.
  3. User can set a review cap and output respects the configured maximum.
**Plans**: TBD

### Phase 6: Results API Access
**Goal**: Users can retrieve structured results for completed jobs directly from API endpoints.
**Depends on**: Phase 5
**Requirements**: OUTP-01
**Success Criteria** (what must be TRUE):
  1. User can fetch structured results for a completed job through API endpoints.
  2. User receives clear API response behavior for in-progress, completed, and failed jobs.
**Plans**: TBD

### Phase 7: JSON and CSV Exports
**Goal**: Users can export job outputs into common developer-friendly file formats.
**Depends on**: Phase 6
**Requirements**: OUTP-02, OUTP-03
**Success Criteria** (what must be TRUE):
  1. User can export a job result set as JSON.
  2. User can export the same job result set as CSV.
  3. Exported files are structured for immediate use in common scraper/data workflows.
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Local Runtime Safety Baseline | 2/2 | Complete | 2026-02-25 |
| 2. Job Intake and Visibility | 2/2 | Complete | 2026-02-25 |
| 3. Coverage and Deduplication | 0/3 | Not started | - |
| 4. Place Detail Extraction | 0/TBD | Not started | - |
| 5. Reviews Collection Controls | 0/TBD | Not started | - |
| 6. Results API Access | 0/TBD | Not started | - |
| 7. JSON and CSV Exports | 0/TBD | Not started | - |
