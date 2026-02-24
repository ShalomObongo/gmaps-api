# Phase 4: Place Detail Extraction - Research

**Researched:** 2026-02-25
**Domain:** Reliable extraction and persistence of Google Maps place detail fields in the existing Fastify + worker + SQLite pipeline
**Confidence:** MEDIUM-HIGH

## User Constraints

- No phase `CONTEXT.md` exists yet.
- Locked decisions: none provided.
- Claude's discretion: implementation strategy for `DATA-01` and `DATA-02`.
- Deferred ideas: none provided.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | User receives core place fields (name, category, rating, reviews count, address, coordinates) | Use a strict normalized place schema with explicit nullable fields, and persist these columns in `places` so every stored record has the same shape. |
| DATA-02 | User receives contact and business fields when available (website, phone, opening hours) | Add optional detail extraction from place detail panel/page and persist nullable contact columns (`website`, `phone`, `openingHoursJson`) without failing the whole run when a field is missing. |
</phase_requirements>

## Summary

Phase 4 should be planned as a data-contract and extraction-pipeline upgrade, not as a UI/API surface change. The current data model only stores `placeId`, `name`, `address`, `mapsUrl`, and coordinates (`src/storage/schema.ts`), and the worker inserts those candidates directly (`src/orchestration/runner/jobs-worker.ts`). To satisfy `DATA-01` and `DATA-02`, planning needs to cover extraction, normalization, and storage together.

The existing stack is sufficient. Playwright provides robust locator semantics, strict matching behavior, auto-waiting, and controlled scroll APIs for dynamic content. Crawlee remains the standard orchestration layer for browser crawling and request handling where needed. SQLite supports additive schema evolution with `ALTER TABLE ... ADD COLUMN` and already fits this codebase's migration style (`ensureColumn` in `src/storage/db.ts`).

The key planning decision is to treat detail fields as best-effort nullable data, while preserving a strict output shape. Missing fields should serialize as `null` (or structured empty values for hours), not omitted keys. This gives stable contracts now and makes Phase 6 results API easier to ship later.

**Primary recommendation:** Plan Phase 4 as one cohesive slice: extractor module + strict normalization schema + additive SQLite columns + worker/repo wiring + focused tests for missing/partial detail cases.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Playwright | `^1.58.0` (repo) | Place detail DOM interaction and field extraction | Official locator/actionability model is more reliable than brittle selector chains on dynamic pages. |
| Crawlee (`PlaywrightCrawler`, `RequestQueue`) | `^3.16.0` (repo) | Browser crawling and queue semantics | Already used in project direction and suited for list->detail crawling and retries. |
| Zod | `^4.1.0` (repo) | Normalize/validate extracted place records | `z.strictObject`, `optional`, `nullable` make stable contracts explicit. |
| better-sqlite3 + SQLite | `^12.4.1` + SQLite SQL | Durable storage for normalized place records | Existing persistence layer; supports additive schema changes and conflict-safe inserts. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | `^3.2.4` (repo) | Unit/integration tests for extraction normalization and repo inserts | Required for regressions on field availability/missing-field behavior. |
| Existing worker/repo modules | current | Orchestration seam for detail extraction | Reuse `jobs-worker` + `places-repo` instead of adding a second ingestion path. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Strict, nullable place contract in storage | Sparse JSON blob only | Faster to prototype, but weak typing and harder downstream API guarantees. |
| Locator-first extraction with fallback selectors | Deep CSS/XPath chains only | CSS/XPath-only approach is more brittle to Google Maps DOM changes. |
| Add columns with `ensureColumn` style migration | Full migration framework now | Migration framework may be overkill this phase; additive columns fit current project stage. |

**Installation:**
```bash
npm install
```

No new dependency is required for this phase baseline.

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── crawler/
│   └── maps/
│       ├── collect-places.ts            # existing candidate discovery
│       ├── extract-place-details.ts      # NEW: detail extraction + raw parsing
│       └── normalize-place-record.ts     # NEW: Zod-backed normalization
├── orchestration/
│   └── runner/jobs-worker.ts             # wire discovery -> enrichment -> insert
└── storage/
    ├── db.ts                             # add columns via ensureColumn
    ├── schema.ts                         # extend PlaceCandidate/PlaceRecord fields
    └── places-repo.ts                    # persist/read new nullable columns
```

### Pattern 1: Extract -> Normalize -> Persist
**What:** Keep scraping/parsing separate from data contract normalization, then persist only normalized records.
**When to use:** Every place record before insert.
**Example:**
```typescript
// Source: Playwright locators + Zod object APIs
const PlaceRecordSchema = z.strictObject({
  placeId: z.string().nullable(),
  name: z.string().min(1),
  category: z.string().nullable(),
  rating: z.number().nullable(),
  reviewsCount: z.number().int().nullable(),
  address: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  website: z.string().nullable(),
  phone: z.string().nullable(),
  openingHoursJson: z.string().nullable(),
});
```

### Pattern 2: Locator-First Detail Extraction with Fallbacks
**What:** Prefer semantic/filtered locators and explicit waits; keep fallback selector map for DOM variations.
**When to use:** Parsing Google Maps details where UI variants exist.
**Example:**
```typescript
// Source: https://playwright.dev/docs/locators
const website = await page.locator('a[data-item-id="authority"]').first().getAttribute('href');
const phoneText = await page.locator('button[data-item-id^="phone:"]').first().textContent();
const category = await page.getByText(/restaurant|cafe|store/i).first().textContent();
```

### Pattern 3: Additive Schema Evolution in SQLite
**What:** Add nullable columns with defaults via startup migration path, keeping existing rows valid.
**When to use:** Introducing new place fields without resetting local DB.
**Example:**
```sql
-- Source: https://sqlite.org/lang_altertable.html
ALTER TABLE places ADD COLUMN category TEXT;
ALTER TABLE places ADD COLUMN rating REAL;
ALTER TABLE places ADD COLUMN reviews_count INTEGER;
ALTER TABLE places ADD COLUMN website TEXT;
ALTER TABLE places ADD COLUMN phone TEXT;
ALTER TABLE places ADD COLUMN opening_hours_json TEXT;
```

### Anti-Patterns to Avoid
- **Parsing and persistence mixed together:** keep DOM scraping separate from normalized model validation.
- **Omitting missing keys:** for stable downstream contracts, use explicit `null` values.
- **Single-selector assumptions:** Google Maps surfaces variants by locale/business type; always have fallback selectors.
- **Fail-fast on non-critical fields:** missing website/phone/hours should not fail entire place/job.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema validation for scraped records | Custom ad-hoc `if` trees | Zod strict object schemas | Better type inference, better error visibility, consistent nullability handling. |
| Crawl frontier/retry orchestration | Homegrown request queue | Crawlee queue + crawler lifecycle | Already solves duplicate request identity and crawler control flow. |
| SQL conflict handling in app logic | Select-then-insert races | `UNIQUE` + `ON CONFLICT DO NOTHING` | Atomic dedup semantics already proven in Phase 3. |
| Dynamic-content waiting | Raw sleeps everywhere | Playwright locator auto-wait + actionability | Reduces flaky timing bugs. |

**Key insight:** the hard part here is data contract consistency under partial availability; existing libraries already solve most control-flow and validation complexity.

## Common Pitfalls

### Pitfall 1: Inconsistent shape across records
**What goes wrong:** Some places return missing keys while others return values, producing non-uniform objects.
**Why it happens:** Optional fields are omitted instead of normalized.
**How to avoid:** Normalize every record through a strict schema and emit explicit `null` for absent optional fields.
**Warning signs:** Downstream code checks `"field" in obj` instead of nullable values.

### Pitfall 2: Locale-sensitive text parsing breaks hours/rating extraction
**What goes wrong:** Parsing logic fails for non-English labels or alternate locale formatting.
**Why it happens:** Selector strategy relies on exact display text.
**How to avoid:** Prefer structural/attribute selectors and numeric parsing guards; treat parse failures as nullable field outcomes.
**Warning signs:** Field extraction works only in one locale fixture.

### Pitfall 3: Overly brittle selectors
**What goes wrong:** Minor DOM change breaks extraction pipeline.
**Why it happens:** Deep CSS chains/XPath and nth-child reliance.
**How to avoid:** Use locator filtering and stable attributes when available; keep fallback selector map and test fixtures.
**Warning signs:** Frequent selector updates for tiny UI changes.

### Pitfall 4: Schema migration breaks existing local DBs
**What goes wrong:** Startup crashes on already-initialized databases.
**Why it happens:** New columns expected in queries before migration path runs.
**How to avoid:** Add columns with idempotent `ensureColumn` before repository queries include them.
**Warning signs:** Fresh DB works, existing DB fails.

## Code Examples

Verified patterns from official sources:

### Playwright robust locator and filtering
```typescript
// Source: https://playwright.dev/docs/locators
const card = page.getByRole('listitem').filter({ hasText: 'Place Name' });
const website = await card.getByRole('link').first().getAttribute('href');
```

### Force dynamic list loading when needed
```typescript
// Source: https://playwright.dev/docs/input#scrolling
await page.getByText('Footer text').scrollIntoViewIfNeeded();
await page.mouse.wheel(0, 400);
```

### Crawlee labeled request handling
```typescript
// Source: https://crawlee.dev/js/docs/introduction/scraping
const crawler = new PlaywrightCrawler({
  async requestHandler({ request, page, enqueueLinks }) {
    if (request.label === 'DETAIL') {
      const name = await page.locator('h1').textContent();
      await Dataset.pushData({ name, url: request.url });
      return;
    }
    await enqueueLinks({ selector: 'a.place-link', label: 'DETAIL' });
  },
});
```

### Zod strict object with nullable optionals
```typescript
// Source: https://zod.dev/api?id=objects
const PlaceSchema = z.strictObject({
  name: z.string(),
  website: z.string().nullable(),
  phone: z.string().nullable(),
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Selector-heavy brittle scraping | Locator/actionability-first extraction | Playwright best-practice guidance (ongoing, current docs) | Better resilience to dynamic DOM and timing issues. |
| Sparse/shape-varying objects | Strict normalized objects with nullable optionals | Modern typed API practice | Downstream API and export layers are simpler and safer. |
| Full-table rebuild for simple field additions | Additive `ALTER TABLE ... ADD COLUMN` migrations | SQLite mature ALTER support (current docs) | Lower risk local upgrades for existing users. |

**Deprecated/outdated:**
- Building new extraction fields as ad hoc untyped JSON blobs in this codebase stage; use typed columns + schema for Phase 6 readiness.

## Open Questions

1. **What selector set is most stable for Google Maps core detail fields in this repo's runtime locale?**
   - What we know: Locator-first and attribute selectors are more resilient than deep CSS chains.
   - What's unclear: Exact selectors for category/reviews/hours across UI variants.
   - Recommendation: Plan an extractor abstraction with primary + fallback selectors and fixture tests before broad rollout.

2. **How should opening hours be represented in storage for v1?**
   - What we know: Requirement only needs opening hours "when available"; no strict shape specified.
   - What's unclear: Whether to store raw text array, normalized day/time objects, or both.
   - Recommendation: Store canonical JSON string (`openingHoursJson`) now; postpone richer relational modeling until review export phase.

3. **Should direct `place_id` jobs skip list traversal and run detail-only path?**
   - What we know: Intake already supports `place_id` (`normalize-intake.ts`).
   - What's unclear: Whether Phase 4 should include dedicated detail-only execution path.
   - Recommendation: Plan for parity path if low effort; otherwise document as follow-up with explicit acceptance test impact.

## Sources

### Primary (HIGH confidence)
- `/microsoft/playwright.dev` (Context7) - locator strictness, resilient locator guidance, actionability/scrolling patterns.
- `/websites/crawlee_dev_js` (Context7) - PlaywrightCrawler request handling and queue-based crawl patterns.
- `/colinhacks/zod` (Context7) - strict object schemas, optional/nullable/default behavior for normalized records.
- https://playwright.dev/docs/locators - locator best practices and strictness model.
- https://playwright.dev/docs/input#scrolling - recommended manual scroll patterns for infinite content.
- https://crawlee.dev/js/docs/introduction/scraping - labeled request handling and detail-page extraction pattern. (Last updated Feb 24, 2026)
- https://crawlee.dev/js/api/playwright-crawler/class/PlaywrightCrawler - crawler lifecycle and request handler contracts.
- https://crawlee.dev/js/api/core/class/RequestQueue - unique key behavior and request queue semantics.
- https://sqlite.org/lang_altertable.html - additive schema changes and constraints for `ADD COLUMN`. (Updated 2025-11-13)
- https://sqlite.org/lang_createtable.html - constraint behavior and table design notes. (Updated 2025-04-30)
- https://sqlite.org/lang_upsert.html - conflict-safe insert/update semantics. (Updated 2024-04-11)

### Secondary (MEDIUM confidence)
- https://apify.com/compass/crawler-google-places - ecosystem reference for expected Google Maps place fields and practical output schema expectations.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - fully aligned with current repository dependencies and official docs.
- Architecture: MEDIUM-HIGH - grounded in repo seams, but exact Google Maps selector stability requires implementation-time validation.
- Pitfalls: MEDIUM - common scraping risks are well known; exact failure frequency depends on target locale/UI variants.

**Research date:** 2026-02-25
**Valid until:** 2026-03-11
