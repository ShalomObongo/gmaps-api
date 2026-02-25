import { describe, expect, it } from "vitest";
import {
  JOB_RESULTS_CSV_HEADERS,
  serializeJobResultsCsv
} from "./job-results-csv.js";
import type { CompletedJobResultsModel } from "../build-job-results-model.js";

describe("serializeJobResultsCsv", () => {
  it("serializes deterministic headers and place rows", async () => {
    const csv = await serializeJobResultsCsv(buildModel(false));
    const lines = csv.trim().split("\n");

    expect(lines[0]).toBe(JOB_RESULTS_CSV_HEADERS.join(","));
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain("job-123");
    expect(lines[1]).toContain("alpha-key");
    expect(lines[2]).toContain("beta-key");
  });

  it("escapes commas, quotes, and newlines via fast-csv", async () => {
    const csv = await serializeJobResultsCsv(buildModel(true));

    expect(csv).toContain("\"Cafe, \"\"Alpha\"\"\"");
    expect(csv).toContain("\"Line 1\nLine 2\"");
    expect(csv).toContain("\"[{\"\"reviewId\"\":");
  });

  function buildModel(withSpecialAddress: boolean): CompletedJobResultsModel {
    return {
      jobId: "job-123",
      status: "completed",
      timestamps: {
        createdAt: "2026-02-25T00:00:00.000Z",
        startedAt: "2026-02-25T00:01:00.000Z",
        finishedAt: "2026-02-25T00:02:00.000Z",
        failedAt: null,
        lastHeartbeatAt: "2026-02-25T00:02:00.000Z"
      },
      progress: {
        discoveredCount: 2,
        processedCount: 2,
        uniqueAcceptedCount: 2,
        failedCount: 0,
        failureReason: null
      },
      results: {
        places: [
          {
            placeKey: "alpha-key",
            placeId: "place-1",
            name: "Cafe, \"Alpha\"",
            category: "Cafe",
            rating: 4.9,
            reviewsCount: 10,
            address: withSpecialAddress ? "Line 1\nLine 2" : "1 Main St",
            mapsUrl: "https://maps.example/alpha",
            lat: 47.6,
            lng: -122.3,
            website: "https://alpha.example",
            phone: "555-1000",
            openingHoursJson: "{\"open\":true}",
            discoveredAt: "2026-02-25T00:01:10.000Z",
            reviews: [
              {
                reviewId: "r-1",
                sortOrder: "newest",
                position: 1,
                authorName: "A",
                rating: 5,
                text: "Great, \"yes\"",
                publishedAt: "1 day ago",
                collectedAt: "2026-02-25T00:01:20.000Z"
              }
            ]
          },
          {
            placeKey: "beta-key",
            placeId: "place-2",
            name: "Beta",
            category: "Cafe",
            rating: 4.2,
            reviewsCount: 6,
            address: "2 Main St",
            mapsUrl: "https://maps.example/beta",
            lat: 47.61,
            lng: -122.31,
            website: null,
            phone: null,
            openingHoursJson: null,
            discoveredAt: "2026-02-25T00:01:30.000Z",
            reviews: []
          }
        ]
      }
    };
  }
});
