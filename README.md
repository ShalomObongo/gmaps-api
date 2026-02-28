<div align="center">

<img src="docs/banner.svg" alt="gmaps-api banner" width="900"/>

**Local-first Google Maps data collection — no paid proxies, no captcha providers, no surprises.**

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-brightgreen?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-000000?logo=fastify&logoColor=white)](https://fastify.dev)
[![Playwright](https://img.shields.io/badge/Playwright-1.x-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev)
[![Vitest](https://img.shields.io/badge/Vitest-3.x-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev)
[![SQLite](https://img.shields.io/badge/SQLite-local--first-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org)

*Submit a crawl request → background worker collects data → retrieve results as JSON or CSV.*

</div>

---

## ✨ Why this exists

| | |
|---|---|
| 🏠 **Runs entirely locally** | No paid proxy or captcha provider required |
| 🔍 **Explicit runtime behaviour** | Rate limits, retry/backoff, and pacing are visible and configurable |
| 🔒 **Sensitive fields are opt-in** | Phone, email, and other PII require a deliberate request |
| 📦 **Predictable output** | JSON and CSV exports ready for downstream tooling |
| 🗄️ **SQLite-backed persistence** | Zero external infrastructure — just a local file |

---

## 📋 Table of Contents

- [Quickstart](#-quickstart)
- [API Flow](#-api-flow)
- [Job Lifecycle](#-job-lifecycle)
- [Environment Variables](#-environment-variables)
- [API Endpoints](#-api-endpoints)
- [Documentation](#-documentation)

---

## 🚀 Quickstart

### 1 — Prerequisites

- **Node.js** `>=22`
- **npm**

```bash
npm install
npx playwright install   # installs browser binaries used by the crawler
```

### 2 — Configure environment

Zero configuration is required for a first run. Sensible defaults are applied automatically:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP server port |
| `DATABASE_FILE` | `./storage/local.db` | SQLite database path |
| `LOG_LEVEL` | `info` | Pino log level |
| `PROXY_URL` | *(unset)* | Optional proxy endpoint |
| `CAPTCHA_PROVIDER` | *(unset)* | Optional captcha config |

> See [docs/operations.md](docs/operations.md) for the full variable reference and runtime policy bounds.

### 3 — Build and start

```bash
npm run build
npm start
```

Verify the server is healthy:

```bash
curl -s http://localhost:3000/health
```

```json
{
  "ok": true,
  "notice": "Local runtime safety baseline active: conservative retry/backoff/pacing, rate limits enabled, and sensitive fields are opt-in."
}
```

---

## 🔄 API Flow

A complete collection run in four commands:

```bash
# 1. Submit a job
curl -s -X POST http://localhost:3000/jobs \
  -H 'content-type: application/json' \
  -d '{
    "inputType": "keyword_location",
    "query": "coffee",
    "location": "seattle wa",
    "collection": { "maxPlaces": 40 }
  }'
# → 202  { "jobId": "d8cbf4c2-...", "status": "queued" }

# 2. Poll until completed
curl -s http://localhost:3000/jobs/d8cbf4c2-...

# 3. Read structured results
curl -s http://localhost:3000/jobs/d8cbf4c2-.../results

# 4. Download an export
curl -s "http://localhost:3000/jobs/d8cbf4c2-.../exports?format=csv" -o places.csv
curl -s "http://localhost:3000/jobs/d8cbf4c2-.../exports?format=json" -o places.json
```

### Control Center UI

Open [`http://localhost:3000`](http://localhost:3000) (or `/ui`) to use the built-in Control Center:

- Compose and submit all `POST /jobs` input variants.
- Monitor live status and progress from `GET /jobs/:id`.
- Load and explore `GET /jobs/:id/results` with place/review drilldown.
- Trigger JSON/CSV exports from `GET /jobs/:id/exports`.

### Input types

| `inputType` | Required fields |
|---|---|
| `keyword_location` | `query`, `location` |
| `maps_url` | `url` — canonical `https://www.google.com/maps/search/…` |
| `place_id` | `placeId` |

`collection.maxPlaces` sets your target item count. For stronger attempts to hit that target, pass `collection.stopOnNoGrowth=false` so the crawler does not exit early on temporary no-growth streaks.

When reviews are enabled, `reviews.maxReviews` sets the per-place review cap (`0..200`). There is no fixed 20-result cap; the worker attempts to collect up to your requested count (best effort).

---

## 🔁 Job Lifecycle

```
POST /jobs
    │
    ▼
┌─────────┐     background worker claims job
│  queued │ ──────────────────────────────────►  running
└─────────┘                                         │
                                            ┌───────┴────────┐
                                            ▼                ▼
                                        completed          failed
                                            │
                              ┌─────────────┼─────────────┐
                              ▼             ▼             ▼
                         GET results   GET status   GET exports
```

**Status semantics for results & exports endpoints:**

| HTTP status | Meaning |
|---|---|
| `200 OK` | Job is `completed` — data is available |
| `404 Not Found` | Job ID does not exist |
| `409 Conflict` | Job exists but is `queued`, `running`, or `failed` |

---

## 🌐 API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check and guardrail notice |
| `GET` | `/` | Control Center UI |
| `GET` | `/ui` | Alternate Control Center UI path |
| `POST` | `/jobs` | Submit a new collection job |
| `GET` | `/jobs/:id` | Poll job status and metadata |
| `GET` | `/jobs/:id/results` | Retrieve structured place results |
| `GET` | `/jobs/:id/exports` | Download JSON or CSV export (`?format=json\|csv`) |

---

## 📚 Documentation

| Document | Contents |
|---|---|
| [docs/api.md](docs/api.md) | Full endpoint contract, request/response shapes, and examples |
| [docs/architecture.md](docs/architecture.md) | Module boundaries, runtime data flow, and worker lifecycle |
| [docs/operations.md](docs/operations.md) | Environment variables, safety defaults, and troubleshooting |
| [docs/development.md](docs/development.md) | Contributor workflow, test commands, and dev scripts |
