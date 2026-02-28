# API Reference

Base URL (local): `http://localhost:3000`

## `GET /` and `GET /ui`

Returns the built-in Control Center HTML UI for submitting jobs, monitoring status, inspecting results, and downloading exports.

### Response

- `200 OK` with `text/html`

## `GET /health`

Returns service health and guardrail notice.

### Response

- `200 OK`

```json
{
  "ok": true,
  "notice": "Local runtime safety baseline active: conservative retry/backoff/pacing, rate limits enabled, and sensitive fields are opt-in."
}
```

## `POST /jobs`

Queue a collection job. Returns immediately with `202` and job metadata.

### Request body

The request uses an `inputType` discriminated union.

Common fields:

- `collection.maxPlaces` (required, integer `1..500`)
- `collection.maxScrollSteps` (optional, integer `0..100`, default `20`)
- `collection.maxViewportPans` (optional, integer `0..25`, default `0`)
- `collection.stopOnNoGrowth` (optional, boolean, default `true`) — when `false`, the collector keeps trying through scroll/pan budgets instead of exiting early after no-growth streaks
- `reviews.enabled` (optional, default `false`)
- `reviews.sort` (optional: `newest`, `most_relevant`, `highest_rating`, `lowest_rating`; default `newest`)
- `reviews.maxReviews` (optional, integer `0..200`, default `0`)
  - Per-place review cap when `reviews.enabled=true`.
  - The worker attempts to return up to this value (no fixed `20` cap), but extraction is best-effort and may return fewer.
- `policy` (optional runtime overrides within server-enforced bounds)
- `includeSensitiveFields` + `requestedFields` (optional; sensitive requests require explicit opt-in)

`inputType` variants:

1. `keyword_location`: requires `query` and `location`.
2. `maps_url`: requires canonical Google Maps search URL (`https://www.google.com/maps/search/?api=1&query=...`).
3. `place_id`: requires `placeId`.

### Example: keyword + location

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

### Example response

- `202 Accepted`

```json
{
  "jobId": "d8cbf4c2-...",
  "status": "queued",
  "policy": {
    "maxRetries": 3,
    "initialBackoffMs": 800,
    "maxBackoffMs": 20000,
    "backoffJitterRatio": 0.2,
    "pacingMs": 1200,
    "includeSensitiveFields": false,
    "useProxy": false,
    "captchaMode": "off"
  },
  "input": {
    "inputType": "keyword_location",
    "query": "coffee",
    "location": "seattle wa",
    "placeId": null,
    "collection": {
      "maxPlaces": 40,
      "maxScrollSteps": 20,
      "maxViewportPans": 0
    },
    "reviews": {
      "enabled": false,
      "sort": "newest",
      "maxReviews": 0
    }
  },
  "fields": ["name", "category", "rating", "reviewsCount", "address", "coordinates"],
  "guardrails": {
    "notice": "Local runtime safety baseline active: conservative retry/backoff/pacing, rate limits enabled, and sensitive fields are opt-in.",
    "rateLimit": "global:60/min route:/jobs:10/min"
  }
}
```

### Error semantics

- `400 invalid_request`: payload validation or normalization failure (invalid shape, unsupported maps URL pattern, out-of-range controls).
- `400 unsafe_request`: sensitive field request without required opt-in.

## `GET /jobs/:id`

Fetch job status and progress snapshot.

### Response

- `200 OK` when job exists.
- `404 not_found` when job id does not exist.

`progress.uniqueAcceptedCount` mirrors `processedCount` in current implementation.

```json
{
  "jobId": "d8cbf4c2-...",
  "status": "running",
  "timestamps": {
    "createdAt": "2026-02-25T01:00:00.000Z",
    "startedAt": "2026-02-25T01:00:01.000Z",
    "finishedAt": null,
    "failedAt": null,
    "lastHeartbeatAt": "2026-02-25T01:00:04.000Z"
  },
  "progress": {
    "discoveredCount": 3,
    "processedCount": 1,
    "uniqueAcceptedCount": 1,
    "failedCount": 0,
    "failureReason": null
  },
  "metrics": {
    "elapsedMs": 3000,
    "heartbeatAgeMs": 250
  }
}
```

## `GET /jobs/:id/results`

Return nested place/review results for completed jobs.

### Status semantics

- `404 not_found`: unknown job id.
- `409 results_not_ready`: job exists but status is `queued`, `running`, or `failed`.
- `200 OK`: completed job results model.

### Example not-ready response

```json
{
  "error": "results_not_ready",
  "jobId": "d8cbf4c2-...",
  "status": "queued",
  "message": "results are available only for completed jobs",
  "failureReason": null
}
```

### Example completed response (shape)

```json
{
  "jobId": "d8cbf4c2-...",
  "status": "completed",
  "timestamps": {
    "createdAt": "2026-02-25T01:10:00.000Z",
    "startedAt": "2026-02-25T01:10:00.000Z",
    "finishedAt": "2026-02-25T01:13:00.000Z",
    "failedAt": null,
    "lastHeartbeatAt": "2026-02-25T01:13:00.000Z"
  },
  "progress": {
    "discoveredCount": 2,
    "processedCount": 2,
    "uniqueAcceptedCount": 2,
    "failedCount": 0,
    "failureReason": null
  },
  "results": {
    "places": [
      {
        "placeKey": "...",
        "placeId": "place-id-1",
        "name": "Alpha",
        "category": "Cafe",
        "rating": 4.7,
        "reviewsCount": 120,
        "address": "1 Main St",
        "mapsUrl": "https://maps.example/alpha",
        "lat": 47.6,
        "lng": -122.3,
        "website": "https://alpha.example",
        "email": "hello@alpha.example",
        "phone": "555-1000",
        "openingHoursJson": null,
        "discoveredAt": "2026-02-25T01:11:00.000Z",
        "reviews": [
          {
            "reviewId": "alpha-1",
            "sortOrder": "newest",
            "position": 1,
            "authorName": "A",
            "rating": 5,
            "text": "Great",
            "publishedAt": "1 day ago",
            "collectedAt": "2026-02-25T01:12:00.000Z"
          }
        ]
      }
    ]
  }
}
```

## `GET /jobs/:id/exports`

Download completed-job output as an attachment.

### Query parameters

- `format`: `json` (default) or `csv`.

### Status semantics

- `404 not_found`: unknown job id.
- `409 results_not_ready`: job not completed.
- `400`: invalid query (for example `format=xml`).
- `200 OK`: attachment payload.

### JSON export example

```bash
curl -i "http://localhost:3000/jobs/<jobId>/exports"
```

Expected headers:

- `content-type: application/json`
- `content-disposition: attachment; filename="job-<jobId>.json"`

### CSV export example

```bash
curl -i "http://localhost:3000/jobs/<jobId>/exports?format=csv"
```

Expected headers:

- `content-type: text/csv; charset=utf-8`
- `content-disposition: attachment; filename="job-<jobId>.csv"`

## End-to-end quick sequence

1. `POST /jobs` and copy `jobId` from the `202` response.
2. `GET /jobs/<jobId>` to monitor lifecycle and progress.
3. `GET /jobs/<jobId>/results` (expect `409` until completion).
4. `GET /jobs/<jobId>/exports?format=json|csv` after completion.
