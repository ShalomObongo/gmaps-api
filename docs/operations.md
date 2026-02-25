# Operations Guide

This guide covers runtime prerequisites, environment configuration, safety defaults, and first-run troubleshooting.

## Runtime prerequisites

1. Install Node.js `>=22`.
2. Install dependencies:

```bash
npm install
```

3. Install Playwright browsers required by live crawl code paths:

```bash
npx playwright install
```

4. Build and run:

```bash
npm run build
npm start
```

## Environment variables

Source of truth: `src/config/env.ts`.

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NODE_ENV` | No | `development` | One of `development`, `test`, `production`. |
| `PORT` | No | `3000` | Positive integer. |
| `DATABASE_FILE` | No | `./storage/local.db` | SQLite file path. |
| `PROXY_URL` | No | unset | Optional proxy integration endpoint. |
| `CAPTCHA_PROVIDER` | No | unset | Optional captcha provider label/config pointer. |
| `LOG_LEVEL` | No | `info` | One of `fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent`. |

## Runtime policy defaults and limits

Source of truth: `src/config/runtime-defaults.ts`.

Default policy returned on `POST /jobs` when not overridden:

- `maxRetries: 3`
- `initialBackoffMs: 800`
- `maxBackoffMs: 20000`
- `backoffJitterRatio: 0.2`
- `pacingMs: 1200`
- `includeSensitiveFields: false`
- `useProxy: false`
- `captchaMode: off`

Input policy values are clamped by runtime bounds:

- `maxRetries`: `0..6`
- `initialBackoffMs`: `100..60000`
- `maxBackoffMs`: `1000..120000`
- `backoffJitterRatio`: `0..0.5`
- `pacingMs`: `200..30000`

## API guardrails enforced by default

Source of truth: `src/server.ts`, `src/api/plugins/rate-limit.ts`, `src/api/routes/jobs.ts`, `src/safety/sensitive-fields.ts`.

- Global rate limiting is enabled at `60 requests/minute`.
- `POST /jobs` has an additional route limit of `10 requests/minute`.
- Sensitive fields are opt-in. Requests containing sensitive fields without `includeSensitiveFields=true` are rejected with `400`.
- Startup logs include the active safety baseline and runtime defaults.

## First-run verification checklist

1. `curl -s http://localhost:3000/health` returns `{"ok":true,...}`.
2. `POST /jobs` with a valid payload returns `202` and `jobId`.
3. `GET /jobs/:id` returns `200` with progress snapshot.
4. `GET /jobs/:id/results` returns `409` until job completion.

For payload examples and endpoint contracts, see `docs/api.md`.

## Troubleshooting

### Browser executable missing

Symptom: Playwright errors about missing browser binaries.

Fix:

```bash
npx playwright install
```

### Build fails with TypeScript errors

Symptom: `npm run build` exits non-zero.

Fix:

```bash
npm run test
npm run build
```

Resolve reported type/test failures before running the server.

### Port already in use

Symptom: server fails to bind to `0.0.0.0:3000`.

Fix: run on another port for the current shell:

```bash
PORT=3001 npm start
```

### SQLite path or permissions issues

Symptom: startup fails while opening `DATABASE_FILE`.

Fixes:

- Ensure parent directory exists and is writable.
- Point `DATABASE_FILE` to a writable location.

Example:

```bash
DATABASE_FILE=./storage/local.db npm start
```

### `400 invalid_request` on `POST /jobs`

Common causes:

- Non-canonical `maps_url` input (must be `https://www.google.com/maps/search/?api=1&query=...`).
- Missing required fields for selected `inputType`.
- Out-of-range collection/review limits.

See accepted payload shapes in `docs/api.md`.

### `400 unsafe_request` on `POST /jobs`

Cause: requested sensitive fields without explicit opt-in.

Fix: include `includeSensitiveFields=true` when requesting sensitive fields.
