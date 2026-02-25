# Phase 7: JSON and CSV Exports - Research

**Researched:** 2026-02-25
**Domain:** Fastify export endpoints for completed job outputs (JSON/CSV file-oriented delivery)
**Confidence:** HIGH

## User Constraints

- No phase `CONTEXT.md` exists.
- Locked decisions: none provided.
- Claude's discretion: define export contract, format strategy, and implementation pattern that satisfies `OUTP-02` and `OUTP-03` within current stack.
- Deferred ideas: none provided.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OUTP-02 | User can export results as JSON | Add a dedicated export route that returns completed job outputs as downloadable JSON (`application/json`) with attachment headers and deterministic filename. |
| OUTP-03 | User can export results as CSV | Add CSV export serialization from the same completed-job read model, using a maintained CSV formatter library to handle RFC-style escaping/quoting correctly. |

</phase_requirements>

## Summary

Phase 7 is a delivery-format phase, not a data-collection phase. The project already has a stable completed-job read model at `GET /jobs/:id/results`; Phase 7 should reuse that source of truth and add explicit export surfaces for file-oriented workflows. This avoids changing crawler/runtime behavior and keeps OUTP-02/03 scoped to output transformation and HTTP delivery semantics.

The implementation should be route-thin and serializer-centric: read completed job data once, then serialize as JSON or CSV via format-specific modules. For CSV, do not hand-roll quoting/escaping because places/reviews fields contain commas, quotes, and possible newlines. Use `@fast-csv/format` for deterministic header output and standards-aligned escaping behavior.

Use explicit file download behavior with `Content-Disposition: attachment` and correct media types (`application/json`, `text/csv`). Keep existing state-gating semantics (`404` unknown, `409` not completed, `200` completed) to preserve client expectations established in Phase 6.

**Primary recommendation:** Implement one export endpoint (`GET /jobs/:id/exports?format=json|csv`) backed by a shared completed-job read model and format-specific serializers (JSON direct, CSV via `@fast-csv/format`).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Fastify | `^5.6.0` (repo; docs latest v5.7.x) | Route/query validation, status-code handling, response headers | Already the HTTP framework; official docs support header/type/send patterns needed for downloads. |
| Existing repos (`jobs`, `places`, `place_reviews`) | current | Read completed output from SQLite | Already proven in Phase 6; prevents logic drift between API results and exports. |
| `@fast-csv/format` | `5.0.5` (npm latest) | CSV generation with header/escaping/quoting controls | Avoids fragile custom CSV escaping and handles edge cases for commas/quotes/newlines. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | `^3.2.4` | Contract tests for export route behavior and payload correctness | Required for OUTP-02/03 regression safety and deterministic output checks. |
| Node streams (`node:stream`) | Node `>=22` | Optional streaming for large CSV output | Use if export size grows; otherwise buffer/string send is acceptable for current local-first runs. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `GET /jobs/:id/exports?format=...` | Content negotiation on `/jobs/:id/results` | Negotiation is valid but mixes API-read and file-export concerns; harder to keep docs/tests clear. |
| `@fast-csv/format` | Hand-rolled CSV string builder | Custom escaping is error-prone and likely to break on quote/newline/comma edge cases. |
| Single CSV with `reviewsJson` field | Flatten to one row per review | Review-row flattening duplicates place columns and can surprise consumers expecting one-place-per-row exports. |

**Installation:**
```bash
npm install @fast-csv/format
```

## Architecture Patterns

### Recommended Project Structure
```text
src/
├── api/
│   └── routes/
│       ├── job-results.ts            # existing structured API read model
│       └── job-exports.ts            # NEW: export route (json/csv)
├── output/
│   ├── build-job-results-model.ts    # shared assembled model from repos (or extracted helper)
│   └── serializers/
│       ├── job-results-json.ts       # JSON export serializer + filename helper
│       └── job-results-csv.ts        # CSV export serializer
└── server.ts                          # register export route
```

### Pattern 1: Shared Read Model, Multiple Serializers
**What:** Build one canonical in-memory completed-job model, then serialize by format.
**When to use:** Every export request.
**Example:**
```typescript
// Source: project pattern from src/api/routes/job-results.ts + Fastify route docs
const model = await buildCompletedJobResultsModel(jobId);

if (format === "json") {
  reply
    .type("application/json")
    .header("Content-Disposition", `attachment; filename="job-${jobId}.json"`)
    .send(JSON.stringify(model));
  return;
}

if (format === "csv") {
  const csvText = serializeJobResultsCsv(model);
  reply
    .type("text/csv; charset=utf-8")
    .header("Content-Disposition", `attachment; filename="job-${jobId}.csv"`)
    .send(csvText);
}
```

### Pattern 2: Explicit Export Query Contract
**What:** Querystring enum for format selection (`json|csv`) with default.
**When to use:** Export endpoint route schema.
**Example:**
```typescript
// Source: Fastify route schema patterns
schema: {
  querystring: {
    type: "object",
    properties: {
      format: { type: "string", enum: ["json", "csv"], default: "json" }
    }
  }
}
```

### Pattern 3: CSV via Library Stream/Formatter
**What:** Use `@fast-csv/format` to write rows with managed escaping/quoting.
**When to use:** Any CSV export generation.
**Example:**
```typescript
// Source: https://github.com/c2fo/fast-csv/blob/main/documentation/docs/introduction/example.mdx
import { format } from "@fast-csv/format";

const csvStream = format({ headers: true });
csvStream.write({ placeKey: "abc", name: "Cafe \"A\"", address: "1 Main St, Seattle" });
csvStream.end();
```

### Anti-Patterns to Avoid
- **Dual source-of-truth output models:** do not rebuild export data differently from `/jobs/:id/results` model.
- **Hand-rolled CSV escaping:** avoid custom `replaceAll('"', '""')` style builders for full payload generation.
- **State bypass for exports:** do not allow export from queued/running/failed jobs; keep Phase 6 gate behavior.
- **Implicit browser behavior reliance:** always set `Content-Type` and `Content-Disposition` explicitly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV escaping and quoting | Manual string concatenation with commas/newlines | `@fast-csv/format` | Correct handling of quotes, commas, and embedded newlines is subtle and easy to break. |
| Download header semantics | Ad-hoc filename/header formatting | `reply.type()` + `reply.header('Content-Disposition', ...)` | Standardized and documented behavior in Fastify/HTTP docs. |
| Reassembling place/review joins in each route | Duplicate ad-hoc mapping logic | Shared builder function consumed by API + export routes | Prevents drift and regression between JSON API and file exports. |

**Key insight:** Export correctness failures usually come from serialization edge cases, not database reads. Reuse the read model and standardize serialization.

## Common Pitfalls

### Pitfall 1: CSV field corruption on commas/newlines/quotes
**What goes wrong:** Columns shift or files become unreadable in spreadsheet tools.
**Why it happens:** Manual CSV escaping misses RFC 4180 quoting rules.
**How to avoid:** Use a CSV formatter library and include tests with commas, quotes, and line breaks.
**Warning signs:** Snapshot diff shows split columns or malformed quoted strings.

### Pitfall 2: Export/API payload drift
**What goes wrong:** `/jobs/:id/results` JSON and exported JSON differ unexpectedly.
**Why it happens:** Separate assembly logic in each route.
**How to avoid:** Single shared builder for completed job model.
**Warning signs:** Same job returns mismatched counts/fields across endpoints.

### Pitfall 3: Missing attachment semantics
**What goes wrong:** Browser renders payload inline or names file inconsistently.
**Why it happens:** Missing/incorrect `Content-Disposition`.
**How to avoid:** Always send `attachment; filename="..."` and stable extension.
**Warning signs:** Browser tab displays JSON/CSV instead of prompting download.

### Pitfall 4: Spreadsheet formula injection risk
**What goes wrong:** Opening exported CSV may evaluate attacker-controlled formulas.
**Why it happens:** Cells beginning with `=`, `+`, `-`, `@` interpreted as formulas.
**How to avoid:** Decide and document sanitization policy for human-opened CSVs (prefixing strategy) and test it.
**Warning signs:** Cells containing formulas execute in Excel/LibreOffice.

## Code Examples

Verified patterns from official sources:

### Fastify headers + typed content response
```typescript
// Source: https://fastify.dev/docs/latest/Reference/Reply/
reply
  .header("Content-Disposition", "attachment; filename=\"export.csv\"")
  .type("text/csv; charset=utf-8")
  .send(csvPayload);
```

### fast-csv formatter usage
```typescript
// Source: https://github.com/c2fo/fast-csv/blob/main/documentation/docs/introduction/example.mdx
import * as csv from "fast-csv";

const csvStream = csv.format({ headers: true });
csvStream.write({ header1: "row1-col1", header2: "row1-col2" });
csvStream.end();
```

### RFC 4180 quote escaping rule
```text
// Source: https://www.rfc-editor.org/rfc/rfc4180
"aaa","b""bb","ccc"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| API-only retrieval (`/jobs/:id/results`) | API retrieval + explicit file export endpoint | Phase 7 scope | Supports developer workflows that expect downloadable artifacts. |
| Manual CSV construction in app code | Maintained CSV formatter libraries | Established Node ecosystem practice | Fewer encoding/escaping defects and safer maintenance. |
| Format-specific data assembly per endpoint | Single canonical model + serializer adapters | Current best practice in service design | Keeps JSON and CSV exports consistent by construction. |

**Deprecated/outdated:**
- Treating CSV as trivial string join logic.
- Mixing long-term API contract fields with file-specific layout concerns in the same assembly path.

## Open Questions

1. **CSV review representation choice (one row per place vs one row per review)**
   - What we know: Current API model is place-centric with nested reviews.
   - What's unclear: Consumer preference for analytics-friendly flat review rows.
   - Recommendation: Ship place-row CSV with `reviewsJson` first (guarantees parity with JSON export), and defer multi-file/flat review exports unless explicitly requested.

2. **Formula-injection mitigation default for CSV**
   - What we know: OWASP documents spreadsheet formula execution risk for untrusted CSV fields.
   - What's unclear: Whether v1 targets machine-ingest CSV only, human spreadsheet opening, or both.
   - Recommendation: Document CSV as machine-ingest by default; if human spreadsheet safety is required, add opt-in sanitization mode with explicit tradeoff notes.

## Sources

### Primary (HIGH confidence)
- `/fastify/fastify` (Context7) - reply headers/content-type/send behavior; route schema patterns.
- `/c2fo/fast-csv` (Context7) - formatter usage and options for headers/quoting.
- https://fastify.dev/docs/latest/Reference/Reply/ - official Fastify reply methods and send semantics.
- https://www.rfc-editor.org/rfc/rfc4180 - CSV format rules and `text/csv` media type registration.
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Disposition - attachment filename semantics (last modified 2026-01-25).

### Secondary (MEDIUM confidence)
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/MIME_types/Common_types - `text/csv` and `application/json` common MIME usage (last modified 2025-07-04).

### Tertiary (LOW confidence)
- https://owasp.org/www-community/attacks/CSV_Injection - formula-injection risk and mitigation tradeoffs (valuable, but behavior differs across spreadsheet tools).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - directly aligned with current repo stack plus a well-supported CSV formatter.
- Architecture: HIGH - extends existing Phase 6 read-model pattern without changing crawler/persistence behavior.
- Pitfalls: MEDIUM-HIGH - strongly supported for CSV correctness and headers; spreadsheet formula handling remains context-dependent.

**Research date:** 2026-02-25
**Valid until:** 2026-03-27
