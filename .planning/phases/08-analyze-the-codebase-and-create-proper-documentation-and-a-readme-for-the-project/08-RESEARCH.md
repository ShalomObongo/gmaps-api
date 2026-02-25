# Phase 8: Analyze the codebase and create proper documentation and a README for the project - Research

**Researched:** 2026-02-25
**Domain:** Documentation architecture for a Node 22 + Fastify 5 + TypeScript local-first scraping API
**Confidence:** HIGH

## User Constraints

- No phase `CONTEXT.md` exists.
- Locked decisions: none provided.
- Claude's discretion: define documentation scope, structure, and source-of-truth workflow for a production-usable README and supporting docs.
- Deferred ideas: none provided.

## Summary

This phase is documentation hardening, not feature delivery. The codebase is already complete through Phase 7 and has strong internal truth sources: strict input schemas (`zod`), explicit Fastify route schemas for outputs, and broad Vitest coverage for route behavior. The best plan is to build docs directly from those existing contracts, not from assumptions.

The project currently lacks a `README.md` and a `docs/` tree, so onboarding cost is high despite a stable implementation. A proper docs pass should produce a top-level README for quickstart and daily usage, then deeper docs for API contracts, architecture, and operations/troubleshooting. Keep README concise and link outward with relative links; GitHub recommends README as a getting-started surface, with longer material in separate docs.

Use the existing stack and avoid introducing heavy documentation tooling in this phase unless there is an explicit need for machine-generated OpenAPI output. Fastify route schemas are already compatible with documentation generation patterns, but immediate value comes from curated Markdown anchored to code and tests.

**Primary recommendation:** Deliver a docs set centered on `README.md` + `docs/api.md` + `docs/architecture.md` + `docs/operations.md`, each generated from current route/env/test contracts and verified by running the existing test suite.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| GitHub Flavored Markdown | platform standard | Human-readable README and docs | Native rendering on GitHub; supports section links, relative links, and discoverable onboarding docs. |
| Fastify route schemas | `fastify ^5.6.0` in repo (docs latest `v5.7.x`) | Canonical API request/response contract source | Existing routes already define params/query/response schemas; documentation should mirror these. |
| Zod env/input schemas | `zod ^4.1.0` | Canonical env and intake constraints | `z.object(...).parse(...)` with defaults already centralizes runtime config and input limits. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | `^3.2.4` | Behavior verification while authoring docs examples | Run after docs/examples drafting to ensure documented API flows match tested behavior. |
| Playwright CLI (project dependency) | `^1.58.0` | Browser binary setup guidance for live crawl paths | Include prerequisite commands in docs because crawler behavior depends on Playwright-managed browser binaries. |
| `@fastify/swagger` | compatible line is `>=9.x` for Fastify `^5.x` | Optional generated OpenAPI artifacts | Use only if the phase scope expands to generated API specs; not required for baseline README/docs delivery. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Markdown-first docs from existing code/tests | Immediate OpenAPI/Swagger generation | Generated specs are useful but add plugin/config overhead and can distract from missing onboarding docs. |
| Lean README + linked deep docs | Monolithic README with all details | Large README becomes hard to maintain; GitHub guidance favors README for getting started and deeper docs elsewhere. |
| Existing npm scripts (`build`, `test`, `start`) in docs | Custom doc-only command wrappers | Extra wrappers add maintenance burden without improving developer outcomes in this repo size. |

**Installation:**
```bash
# Baseline documentation phase needs no new dependencies
npm install

# Optional only if generated OpenAPI is explicitly in-scope
# npm install @fastify/swagger
```

## Architecture Patterns

### Recommended Project Structure
```text
README.md                        # Fast onboarding: purpose, setup, run, API quickstart
docs/
├── api.md                       # Endpoint contracts, status semantics, payload examples
├── architecture.md              # Module boundaries and data flow
├── operations.md                # Local runtime prerequisites, troubleshooting, safety guardrails
└── development.md               # Build/test workflow and contribution conventions
```

### Pattern 1: Source-of-Truth Documentation Mapping
**What:** Every doc section maps to a concrete source file and test.
**When to use:** For all README and docs claims about inputs, outputs, status behavior, and limits.
**Example:**
```typescript
// Source: src/api/routes/job-results.ts
// Document this exact state gate in docs/api.md
if (result.kind === "not_ready") {
  return reply.code(409).send({
    error: "results_not_ready",
    jobId: result.job.id,
    status: result.job.status,
    message: "results are available only for completed jobs"
  });
}
```

### Pattern 2: README as Quickstart, Docs as Depth
**What:** Keep README focused on "what this does" and "how to run now," then link to deeper docs.
**When to use:** Top-level repository documentation.
**Example:**
```markdown
## Quickstart
1. Install dependencies
2. Build and start the API
3. Submit a job and poll status

See [API reference](docs/api.md) for full request/response contracts.
```

### Pattern 3: Contract Examples from Tests
**What:** Reuse values and flows already covered by route tests for curl/JSON examples.
**When to use:** Endpoint docs and troubleshooting examples.
**Example:**
```typescript
// Source: src/api/routes/jobs.test.ts
payload: {
  inputType: "keyword_location",
  query: "coffee",
  location: "seattle wa",
  collection: { maxPlaces: 40 }
}
```

### Anti-Patterns to Avoid
- **Doc-first invention:** Do not publish endpoint fields or defaults that are not present in route schemas/tests.
- **Single giant README:** Do not place architecture, API edge cases, and troubleshooting in one long root file.
- **Undocumented prerequisites:** Do not omit Playwright browser install expectations for live crawling workflows.
- **Ignoring non-200 behavior:** Do not document only happy path when API intentionally uses `404` and `409` for state gating.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API contract description | Manually invented request/response tables from memory | Fastify route schemas in `src/api/routes/*.ts` + route tests | Prevents docs drift and mismatched status/error semantics. |
| Input/env limits documentation | Free-form limit lists in prose | `src/api/schemas/job-input.ts` and `src/config/env.ts` as canonical values | Limits/defaults are already codified and validated at runtime. |
| CSV format behavior explanation | Ad-hoc assumptions about escaping and fields | Existing serializer `src/output/serializers/job-results-csv.ts` + tests | CSV edge behavior is already implemented and tested. |
| API reference generation (if needed) | Custom schema walkers/scripts | `@fastify/swagger` dynamic mode from route schemas | Maintained plugin handles schema conversion and OpenAPI output. |

**Key insight:** This repo already contains executable contracts; phase quality depends on faithfully documenting those contracts, not adding speculative abstractions.

## Common Pitfalls

### Pitfall 1: README drift from current API behavior
**What goes wrong:** README examples disagree with actual endpoints or status handling.
**Why it happens:** Examples are written from memory instead of current tests/routes.
**How to avoid:** For each endpoint example, cross-check route source and at least one matching test.
**Warning signs:** Example returns `200` in docs but tests assert `409` for queued/running/failed jobs.

### Pitfall 2: Missing operational prerequisites
**What goes wrong:** New users can run `npm start` but live crawl paths fail due to browser binaries not installed.
**Why it happens:** Playwright setup is implied, not documented.
**How to avoid:** Add an explicit prerequisite section with `npx playwright install` and fallback guidance.
**Warning signs:** First-run errors mention missing browser executable paths.

### Pitfall 3: Incomplete documentation of input constraints
**What goes wrong:** Users submit unsupported maps URLs or out-of-range controls and receive confusing errors.
**Why it happens:** Docs mention input types but not canonical URL shape and limits.
**How to avoid:** Document `inputType` variants, canonical maps URL requirement, and control bounds from schema.
**Warning signs:** Repeated 400 support questions for `maps_url` and collection/review caps.

### Pitfall 4: Over-scoping into tooling migration
**What goes wrong:** Phase stalls while adding doc-generation infrastructure not required for README/docs baseline.
**Why it happens:** Trying to solve long-term automation before shipping missing core docs.
**How to avoid:** Ship Markdown docs first; treat generated OpenAPI as optional follow-up task.
**Warning signs:** Many plugin/config changes before any useful README appears.

## Code Examples

Verified patterns from official and repository sources:

### Fastify full JSON schema pattern (v5)
```typescript
// Source: https://fastify.dev/docs/latest/Guides/Migration-Guide-V5/
fastify.get('/route', {
  schema: {
    querystring: {
      type: 'object',
      properties: {
        name: { type: 'string' }
      },
      required: ['name']
    }
  }
}, handler)
```

### Zod parse + defaults for runtime/env docs
```typescript
// Source: /colinhacks/zod and src/config/env.ts
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_FILE: z.string().default('./storage/local.db')
});

const env = envSchema.parse(process.env);
```

### Playwright browser prerequisite command
```bash
# Source: https://playwright.dev/docs/browsers
npx playwright install
```

### Relative links for split docs
```markdown
<!-- Source: https://docs.github.com/.../about-readmes -->
[API reference](docs/api.md)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Minimal/no project docs after implementation | Docs as a first-class delivery artifact tied to tests/contracts | Current phase scope (2026) | Reduces onboarding/support time and prevents misuse. |
| Manually curated API prose detached from code | Schema-driven route contracts with tested status behaviors | Fastify v5 + current codebase | Makes API docs auditable against implementation. |
| Monolithic README culture | README quickstart + linked deep docs | Current GitHub docs guidance | Better discoverability and maintainability over time. |

**Deprecated/outdated:**
- Treating README as a complete substitute for API/architecture/operations docs.
- Documenting input/output limits without citing schema files.

## Open Questions

1. **Should generated OpenAPI be in-scope for this phase?**
   - What we know: Current objective asks for proper documentation and README; no explicit OpenAPI requirement exists.
   - What's unclear: Whether stakeholders want machine-readable API artifacts now or only human-facing docs.
   - Recommendation: Plan baseline docs first; add optional follow-up task for `@fastify/swagger` if requested.

2. **What level of live-crawl instructions is safe to include publicly?**
   - What we know: Project includes explicit guardrails and responsible-use messaging.
   - What's unclear: Desired balance between practical usage examples and anti-abuse minimization.
   - Recommendation: Include safe defaults and guardrails prominently; avoid optimization advice for bypass behavior.

## Sources

### Primary (HIGH confidence)
- `/fastify/fastify` (Context7) - route schema and validation/serialization patterns for Fastify v5.
- `/vitest-dev/vitest/v3_2_4` (Context7) - test execution command conventions.
- `/colinhacks/zod` (Context7) - `z.object`, `.default()`, and `.parse()` behavior.
- https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/ - official Fastify schema validation and serialization reference (v5.7.x docs).
- https://fastify.dev/docs/latest/Guides/Migration-Guide-V5/ - Fastify v5 requirement for full JSON schemas and ecosystem alignment notes.
- https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes - official README scope and placement guidance.
- https://playwright.dev/docs/browsers - official Playwright browser installation requirements and CLI commands.

### Secondary (MEDIUM confidence)
- https://vitest.dev/config/ - current Vitest configuration reference; repo uses v3.2.4 while site defaults to v4 docs.

### Tertiary (LOW confidence)
- https://github.com/fastify/fastify-swagger - plugin README used for optional generated OpenAPI recommendation (official repo, but not yet adopted in this project).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - grounded in current repository dependencies and official framework docs.
- Architecture: HIGH - based on direct codebase analysis and existing route/schema/test patterns.
- Pitfalls: MEDIUM-HIGH - strongly evidenced by current contracts; stakeholder scope for optional OpenAPI remains undecided.

**Research date:** 2026-02-25
**Valid until:** 2026-03-27
