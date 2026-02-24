import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildServer } from "../../server.js";

describe("POST /jobs", () => {
  let workDir: string | undefined;

  afterEach(() => {
    if (workDir) {
      rmSync(workDir, { recursive: true, force: true });
      workDir = undefined;
    }
  });

  it("accepts minimal payload and returns queued job with policy", async () => {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const dbFile = join(workDir, "local.db");
    const app = await buildServer({ databaseFile: dbFile, logger: false });

    const response = await app.inject({
      method: "POST",
      url: "/jobs",
      payload: {
        inputType: "keyword_location",
        query: "coffee",
        location: "seattle wa",
        collection: {
          maxPlaces: 40
        }
      }
    });

    expect(response.statusCode).toBe(202);
    const body = response.json();
    expect(body.status).toBe("queued");
    expect(typeof body.jobId).toBe("string");
    expect(body.policy).toMatchObject({
      maxRetries: 3,
      pacingMs: 1200,
      includeSensitiveFields: false
    });
    expect(body.input).toMatchObject({
      inputType: "keyword_location",
      query: "coffee",
      location: "seattle wa",
      placeId: null
    });
    expect(body.input.collection).toMatchObject({
      maxPlaces: 40,
      maxScrollSteps: 20,
      maxViewportPans: 0
    });

    await app.close();
  });

  it("accepts canonical maps url payload", async () => {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const app = await buildServer({ databaseFile: join(workDir, "local.db"), logger: false });

    const response = await app.inject({
      method: "POST",
      url: "/jobs",
      payload: {
        inputType: "maps_url",
        mapsUrl:
          "https://www.google.com/maps/search/?api=1&query=coffee+seattle&query_place_id=ChIJVTPokywQkFQRmtVEaUZlJRA",
        collection: {
          maxPlaces: 75,
          maxScrollSteps: 12
        }
      }
    });

    expect(response.statusCode).toBe(202);
    const body = response.json();
    expect(body.input).toMatchObject({
      inputType: "maps_url",
      query: "coffee seattle",
      location: null,
      placeId: "ChIJVTPokywQkFQRmtVEaUZlJRA",
      collection: {
        maxPlaces: 75,
        maxScrollSteps: 12,
        maxViewportPans: 0
      }
    });

    await app.close();
  });

  it("accepts place id payload", async () => {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const app = await buildServer({ databaseFile: join(workDir, "local.db"), logger: false });

    const response = await app.inject({
      method: "POST",
      url: "/jobs",
      payload: {
        inputType: "place_id",
        placeId: "ChIJVTPokywQkFQRmtVEaUZlJRA",
        collection: {
          maxPlaces: 25,
          maxViewportPans: 2
        }
      }
    });

    expect(response.statusCode).toBe(202);
    const body = response.json();
    expect(body.input).toMatchObject({
      inputType: "place_id",
      query: null,
      location: null,
      placeId: "ChIJVTPokywQkFQRmtVEaUZlJRA",
      collection: {
        maxPlaces: 25,
        maxScrollSteps: 20,
        maxViewportPans: 2
      }
    });

    await app.close();
  });

  it("rejects unsupported maps urls", async () => {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const app = await buildServer({ databaseFile: join(workDir, "local.db"), logger: false });

    const response = await app.inject({
      method: "POST",
      url: "/jobs",
      payload: {
        inputType: "maps_url",
        mapsUrl: "https://www.google.com/maps/place/Space+Needle",
        collection: {
          maxPlaces: 10
        }
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "invalid_request" });

    await app.close();
  });

  it("rejects ambiguous mixed-shape payloads", async () => {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const app = await buildServer({ databaseFile: join(workDir, "local.db"), logger: false });

    const response = await app.inject({
      method: "POST",
      url: "/jobs",
      payload: {
        inputType: "keyword_location",
        query: "coffee",
        location: "seattle",
        mapsUrl: "https://www.google.com/maps/search/?api=1&query=coffee",
        collection: {
          maxPlaces: 10
        }
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "invalid_request" });

    await app.close();
  });

  it("rejects out-of-range collection controls", async () => {
    workDir = mkdtempSync(join(tmpdir(), "gmaps-api-"));
    const app = await buildServer({ databaseFile: join(workDir, "local.db"), logger: false });

    const response = await app.inject({
      method: "POST",
      url: "/jobs",
      payload: {
        inputType: "keyword_location",
        query: "coffee",
        location: "seattle",
        collection: {
          maxPlaces: 0
        }
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "invalid_request" });

    await app.close();
  });
});
