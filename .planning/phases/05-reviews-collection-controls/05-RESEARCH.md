# Phase 5: Reviews Collection Controls - Research

**Researched:** 2026-02-25
**Domain:** Google Maps review extraction with explicit sort-order and cap controls in the existing Fastify + worker + SQLite architecture
**Confidence:** MEDIUM-HIGH

## User Constraints

- No phase `CONTEXT.md` exists yet.
- Locked decisions: none provided.
- Claude's discretion: full implementation strategy for `DATA-03` inside current stack.
- Deferred ideas: none provided.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-03 | User can extract place reviews with configurable sort order and cap | Add explicit review controls to intake schema (`sort`, `maxReviews`), extract reviews from detail view using deterministic ordering, and persist normalized review rows with per-place sequence indexes capped by configuration. |
</phase_requirements>

## Summary

Phase 5 should be planned as a control-surface + extraction + persistence slice, not just an extractor tweak. `DATA-03` requires three guarantees at once: (1) reviews are present in output, (2) ordering matches requested sort, and (3) collection count obeys cap. In this codebase, that means changing intake contract (`src/api/schemas/job-input.ts`), worker wiring (`src/orchestration/runner/jobs-worker.ts`), and storage schema (`src/storage/db.ts`) together.

The current stack is already suitable. Playwright provides resilient locator and scrolling behavior for dynamic list loading. Crawlee remains the standard for browser crawl orchestration and retry integration. SQLite supports additive migrations and conflict-safe inserts (`ON CONFLICT`) that are ideal for idempotent review storage while preserving deterministic order with an explicit `position` column.

Because Google Maps UI is volatile, the safest plan is to lock API controls and normalized output shape first, then keep extraction logic selector-driven with fallbacks. Treat review sort values as strict enums (`newest`, `most_relevant`, `highest_rating`, `lowest_rating`) and reject unknown values at intake. Store the requested sort per run and persisted review order index so downstream API/export phases can return exactly what user requested.

**Primary recommendation:** Plan Phase 5 around a normalized `reviews` data path (intake controls -> worker extraction honoring sort/cap -> `place_reviews` persistence with stable order index -> tests asserting order and cap).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Playwright | `^1.58.0` (repo) | Open review modal/panel, select sort option, scroll/load more reviews, extract review fields | Official locator + actionability + scrolling APIs are built for dynamic web UIs and reduce brittle timing logic. |
| Crawlee (`PlaywrightCrawler`) | `^3.16.0` (repo) | Crawl orchestration and retry/failure flow around page extraction | Already used in project and aligns with request handler/retry semantics. |
| Zod | `^4.1.0` (repo) | Strict validation for review controls and normalized review records | Enforces explicit contract for enum sort values and nullable review fields. |
| better-sqlite3 + SQLite | `^12.4.1` + SQLite | Durable review storage and dedup/order enforcement | Existing persistence path; supports additive `ALTER TABLE` and `ON CONFLICT` dedup patterns. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | `^3.2.4` (repo) | Unit/integration tests for sort and cap behavior | Required for deterministic verification of `DATA-03` guarantees. |
| Existing worker/repo seams | current | Integrate review extraction into active ingestion flow | Reuse `jobs-worker` and storage repositories; avoid parallel ingestion pipeline. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate `place_reviews` table | Store reviews as JSON blob on `places` rows | Simpler writes now, but hard to enforce cap/order, dedup, and future API/export filtering. |
| Strict enum sort contract at intake | Free-form sort strings with best-effort mapping | Looser input but creates ambiguous behavior and harder testability. |
| DB-level review dedup (`UNIQUE`) | In-memory dedup only | In-memory is easier to bypass and less safe under retries/re-runs. |

**Installation:**
```bash
npm install
```

No new dependency is required for baseline `DATA-03`.

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── api/
│   └── schemas/job-input.ts                # extend intake contract with review controls
├── orchestration/
│   ├── intake/normalize-intake.ts          # normalize default review controls
│   └── runner/jobs-worker.ts               # wire candidate -> detail -> review extraction and persistence
├── crawler/
│   └── maps/
│       ├── extract-place-details.ts        # existing place-detail extraction
│       └── extract-place-reviews.ts        # NEW: review sort/cap extraction module
└── storage/
    ├── db.ts                               # add place_reviews table + indexes via migration-safe startup
    ├── schema.ts                           # add review config and review record types
    └── place-reviews-repo.ts               # NEW: insert/list review rows with deterministic order
```

### Pattern 1: Explicit Review Controls Contract
**What:** Add typed review controls under intake and persist resolved values on the job.
**When to use:** Every job submission (including defaults).
**Example:**
```typescript
// Source: Zod object + enum APIs (Context7: /colinhacks/zod)
const reviewControlsSchema = z.object({
  enabled: z.boolean().default(false),
  maxReviews: z.number().int().min(0).max(500).default(0),
  sort: z.enum(["newest", "most_relevant", "highest_rating", "lowest_rating"]).default("newest")
});
```

### Pattern 2: Ordered Extraction Loop with Hard Cap
**What:** Select requested sort first, then iterate review cards in order, append until `maxReviews`, stop immediately at cap.
**When to use:** Place detail phase for candidates where review extraction is enabled.
**Example:**
```typescript
// Source: Playwright locators + scrolling docs
await page.getByRole("button", { name: /sort/i }).click();
await page.getByRole("menuitemradio", { name: /Newest/i }).click();

const reviews: ReviewCandidate[] = [];
while (reviews.length < maxReviews) {
  const cards = await page.locator("div[data-review-id]").all();
  // parse only unseen ids in visual order
  // break on no-growth, else scroll
  await page.mouse.wheel(0, 1200);
}
```

### Pattern 3: Persist Reviews with Stable Per-Place Order
**What:** Store each review as one row keyed by job/place/review identity plus `position` index.
**When to use:** After extraction and normalization for each place.
**Example:**
```sql
-- Source: SQLite CREATE TABLE + UPSERT docs
CREATE TABLE IF NOT EXISTS place_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  place_key TEXT NOT NULL,
  review_id TEXT NOT NULL,
  sort_order TEXT NOT NULL,
  position INTEGER NOT NULL,
  rating INTEGER,
  text TEXT,
  published_at_text TEXT,
  reviewer_name TEXT,
  scraped_at TEXT NOT NULL,
  UNIQUE(job_id, place_key, review_id)
);
```

### Anti-Patterns to Avoid
- **Soft cap logic:** never continue loading after `maxReviews`; stop as soon as cap is reached.
- **Sort-after-collect:** sorting locally after extraction does not satisfy “ordering matches selection” if source list was incomplete.
- **JSON blob storage only:** makes per-review ordering, dedup, and future paging harder.
- **Text-only review identity:** dedup by stable review ID when available, not by text or author name.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Input validation for review controls | Custom parsing conditionals | Zod schema + enum/defaults | Prevents invalid sort values and keeps intake contract strict. |
| Dynamic list waiting/interaction | Sleep-heavy loops | Playwright locator auto-wait + `scrollIntoViewIfNeeded`/`mouse.wheel` | More resilient to rendering timing and avoids flaky retries. |
| Dedup conflict resolution | Manual select-then-insert checks | SQLite `UNIQUE` + `ON CONFLICT DO NOTHING` | Atomic and retry-safe under worker reruns. |
| Crawl retry/session behavior | Custom retry framework | Existing `runWithPolicy` + Crawlee flow | Keeps consistency with Phase 1 reliability guarantees. |

**Key insight:** the hidden complexity is deterministic ordering under dynamic loading. Use library guarantees for waiting/retries and DB constraints for idempotence; keep custom logic only for source-specific selectors.

## Common Pitfalls

### Pitfall 1: Requested sort not actually applied
**What goes wrong:** Reviews are returned, but in default UI order instead of requested order.
**Why it happens:** Sort interaction fails silently or happens after some reviews are already loaded.
**How to avoid:** Apply and verify sort selection before starting extraction; assert first-page ordering in tests.
**Warning signs:** Runs with different sort values return same top review IDs.

### Pitfall 2: Cap overrun on infinite scroll
**What goes wrong:** Output exceeds configured `maxReviews`.
**Why it happens:** Loop parses whole visible batch after cap threshold is crossed.
**How to avoid:** Check cap before each append and break immediately.
**Warning signs:** Off-by-one or large-batch overshoot in integration tests.

### Pitfall 3: Duplicate reviews from rerender/retries
**What goes wrong:** Same review appears multiple times for a place.
**Why it happens:** Dynamic list rerenders and extraction re-reads previously seen cards.
**How to avoid:** Dedup in-memory by `reviewId` during extraction and enforce DB `UNIQUE(job_id, place_key, review_id)`.
**Warning signs:** Duplicate `reviewId` values in persisted rows.

### Pitfall 4: Locale-sensitive parsing breaks rating/date fields
**What goes wrong:** Ratings or publish times parse incorrectly in non-English contexts.
**Why it happens:** Parser assumes English labels or fixed punctuation.
**How to avoid:** Store raw display fields as text first; parse optional numerics with nullable fallback.
**Warning signs:** Parse exceptions or inconsistent numeric conversions across fixtures.

## Code Examples

Verified patterns from official sources:

### Select option and interact with dynamic controls
```typescript
// Source: https://playwright.dev/docs/input#select-options
await page.getByLabel('Choose a color').selectOption({ label: 'Blue' });
```

### Force infinite-list loading safely
```typescript
// Source: https://playwright.dev/docs/input#scrolling
await page.getByText('Footer text').scrollIntoViewIfNeeded();
await page.mouse.wheel(0, 1200);
```

### Filter within repeated card/list structures
```typescript
// Source: https://playwright.dev/docs/locators#filter-by-text
await page
  .getByRole('listitem')
  .filter({ hasText: 'Product 2' })
  .getByRole('button', { name: 'Add to cart' })
  .click();
```

### Conflict-safe upsert/no-op for duplicates
```sql
-- Source: https://www.sqlite.org/lang_upsert.html
INSERT INTO place_reviews (job_id, place_key, review_id, sort_order, position, scraped_at)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT(job_id, place_key, review_id) DO NOTHING;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ad-hoc CSS/XPath chains + sleeps | Locator-first extraction + auto-wait/actionability | Current Playwright guidance (ongoing) | Fewer flaky review extractions on dynamic panels. |
| Embedded reviews as untyped nested blobs | Normalized row storage with explicit order index | Common modern scraper DB pattern | Better dedup, querying, and future API/export support. |
| Implicit/default source ordering | Explicit user-selected sort contract | Product requirement trend in scraper tools | Predictable, testable user-facing behavior. |

**Deprecated/outdated:**
- Inferring requested sort from output post hoc; apply/verify sort in UI before collection.
- Treating review cap as best-effort; `DATA-03` requires a hard cap guarantee.

## Open Questions

1. **Which selectors are most stable for Google Maps review sort controls in this runtime locale?**
   - What we know: Playwright role/text locators are preferred over deep CSS chains.
   - What's unclear: Stable role/name pattern for sort menu trigger and options across UI variants.
   - Recommendation: Plan extractor with primary role-based locators + fallback attribute selectors and fixture-backed tests.

2. **Which review fields are required in Phase 5 output vs deferred to later phases?**
   - What we know: `DATA-03` only requires review extraction with sort/cap controls.
   - What's unclear: Minimum review object shape expected before Phase 6 results API contracts are finalized.
   - Recommendation: Define a minimal normalized review schema now (`reviewId`, `rating`, `text`, `publishedAtText`, `reviewerName`, `position`, `sortOrder`) and defer enrichments.

3. **How should jobs without review extraction request be represented?**
   - What we know: Review extraction should be user-controlled.
   - What's unclear: Whether controls should be optional object or required object with `enabled=false` default.
   - Recommendation: Require normalized controls internally (`enabled`, `maxReviews`, `sort`) and expose optional input with defaults to reduce client burden.

## Sources

### Primary (HIGH confidence)
- `/microsoft/playwright.dev` (Context7) - locator strictness, scrolling APIs, interaction/actionability behavior.
- `/websites/crawlee_dev_js` (Context7) - PlaywrightCrawler request handling patterns and queue usage.
- `/colinhacks/zod` (Context7) - strict schema, enum/nullable/default parsing patterns.
- https://playwright.dev/docs/locators - resilient locator guidance and strictness model.
- https://playwright.dev/docs/input#scrolling - manual scrolling guidance for infinite lists.
- https://playwright.dev/docs/input#select-options - option selection pattern for UI controls.
- https://crawlee.dev/js/docs/introduction/scraping - PlaywrightCrawler request handler structure (last updated Feb 24, 2026).
- https://www.sqlite.org/lang_altertable.html - additive migration constraints for `ADD COLUMN` and schema-change behavior (updated 2025-11-13).
- https://www.sqlite.org/lang_createtable.html - UNIQUE constraints and table design fundamentals (updated 2025-04-30).
- https://www.sqlite.org/lang_upsert.html - `ON CONFLICT` behavior and limits (updated 2024-04-11).

### Secondary (MEDIUM confidence)
- https://apify.com/compass/crawler-google-places/input-schema - practical review control surface used in production scraper ecosystem (`maxReviews`, `reviewsSort` values).
- https://apify.com/compass/crawler-google-places - ecosystem reference for review extraction behavior and scaling notes.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - aligned with current repository dependencies and official docs.
- Architecture: MEDIUM-HIGH - repo seams are clear, but Google Maps selector stability is runtime-variant.
- Pitfalls: MEDIUM - failure patterns are well-established; exact incidence depends on locale/UI churn.

**Research date:** 2026-02-25
**Valid until:** 2026-03-11
