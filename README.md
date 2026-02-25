# gmaps-api

Local-first Fastify API for collecting structured Google Maps place data with conservative safety defaults.

The service accepts a crawl request, persists a queued job in SQLite, runs collection in a background worker, and exposes status/results/export endpoints.

## Why this exists

- Run locally without requiring paid proxy or captcha providers.
- Keep runtime behavior explicit (rate limits, retry/backoff, sensitive-field opt-in).
- Return predictable JSON/CSV output for downstream tooling.

## Quickstart

### 1) Prerequisites

- Node.js `>=22`
- npm

Install dependencies and Playwright browser binaries:

```bash
npm install
npx playwright install
```

### 2) Configure environment

The API reads configuration from environment variables. For a first run, defaults are enough:

- `PORT=3000`
- `DATABASE_FILE=./storage/local.db`
- `LOG_LEVEL=info`

Optional provider settings exist for advanced runs (`PROXY_URL`, `CAPTCHA_PROVIDER`). See `docs/operations.md`.

### 3) Build and start

```bash
npm run build
npm start
```

Health check:

```bash
curl -s http://localhost:3000/health
```

Expected shape:

```json
{
  "ok": true,
  "notice": "Local runtime safety baseline active: conservative retry/backoff/pacing, rate limits enabled, and sensitive fields are opt-in."
}
```

## Minimal API flow

Create a job:

```bash
curl -s -X POST http://localhost:3000/jobs \
  -H 'content-type: application/json' \
  -d '{
    "inputType": "keyword_location",
    "query": "coffee",
    "location": "seattle wa",
    "collection": { "maxPlaces": 40 }
  }'
```

The API responds with `202` and a `jobId`. Then:

1. Poll status: `GET /jobs/:id`
2. Read completed results: `GET /jobs/:id/results`
3. Download export: `GET /jobs/:id/exports?format=json|csv`

Important state semantics:

- `404 not_found`: job id does not exist.
- `409 results_not_ready`: job exists but is `queued`, `running`, or `failed`.
- `200`: results/exports are available only when status is `completed`.

## Documentation

- Runtime setup, env defaults, safety controls, troubleshooting: `docs/operations.md`
- Contributor workflow and test commands: `docs/development.md`
- Endpoint contract and payload examples: `docs/api.md`
- Module wiring and runtime data flow: `docs/architecture.md`
