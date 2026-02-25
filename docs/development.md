# Development Guide

This guide covers local contributor workflow and test commands for this TypeScript + Fastify project.

## Local setup

```bash
npm install
npx playwright install
```

## Available scripts

From `package.json`:

- `npm run build`: compile TypeScript to `dist/` using `tsc`.
- `npm run dev`: watch `src/server.ts` with `tsx` during development.
- `npm start`: run compiled server (`dist/server.js`).
- `npm run start:check`: start in check mode (prints startup banner, then exits).
- `npm run test`: run Vitest via `scripts/run-tests.mjs`.

## Typical workflow

1. Implement or update code in `src/`.
2. Run targeted tests for the area you changed.
3. Run full test suite.
4. Run `npm run build`.
5. If needed, run `npm start` and exercise endpoints locally.

## Targeted test examples

Run specific route tests:

```bash
npm run test -- src/api/routes/jobs.test.ts -x
npm run test -- src/api/routes/job-status.test.ts src/api/routes/job-results.test.ts -x
npm run test -- src/api/routes/job-exports.test.ts src/api/routes/jobs.guardrails.test.ts -x
```

Run server/wiring tests:

```bash
npm run test -- src/server.test.ts src/output/build-job-results-model.test.ts -x
```

The `-x` flag is accepted by the test wrapper but stripped before Vitest execution.

## Codebase conventions

- Keep request validation and constraints in schema modules (`src/api/schemas/`).
- Keep endpoint behavior aligned with route tests under `src/api/routes/*.test.ts`.
- Prefer source-of-truth helpers for shared response shaping (for example, `buildJobResultsModel` for results/exports).
- Preserve safety defaults: no paid provider dependency required for local startup.

## Contribution checklist

- Add or update tests alongside behavior changes.
- Avoid introducing undocumented payload fields or status codes.
- Keep docs in sync with implemented contracts when API/runtime behavior changes.
