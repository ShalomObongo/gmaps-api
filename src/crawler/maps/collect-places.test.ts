import { describe, expect, it } from "vitest";
import { collectPlacesFromMaps } from "./collect-places.js";
import type { PlaceCandidate } from "../../storage/schema.js";

describe("collectPlacesFromMaps", () => {
  it("collects more candidates when maxPlaces is higher", async () => {
    const scripted = createScriptedDiscoverer([3, 3, 3, 3, 3]);

    const low = await collectPlacesFromMaps({
      controls: {
        maxPlaces: 2,
        maxScrollSteps: 4,
        maxViewportPans: 0
      },
      discoverStep: scripted
    });

    const high = await collectPlacesFromMaps({
      controls: {
        maxPlaces: 9,
        maxScrollSteps: 4,
        maxViewportPans: 0
      },
      discoverStep: createScriptedDiscoverer([3, 3, 3, 3, 3])
    });

    expect(low.candidates).toHaveLength(2);
    expect(high.candidates).toHaveLength(9);
    expect(high.discoveredCount).toBeGreaterThan(low.discoveredCount);
    expect(low.stopReason).toBe("reached_max_places");
  });

  it("stops when growth stalls repeatedly", async () => {
    const result = await collectPlacesFromMaps({
      controls: {
        maxPlaces: 50,
        maxScrollSteps: 10,
        maxViewportPans: 1
      },
      discoverStep: createScriptedDiscoverer([2, 1, 0, 0, 0]),
      noGrowthThreshold: 2
    });

    expect(result.stopReason).toBe("no_growth");
    expect(result.scrollStepsUsed).toBeLessThan(6);
    expect(result.candidates).toHaveLength(3);
  });

  it("honors viewport pan budget when no early stop is hit", async () => {
    const result = await collectPlacesFromMaps({
      controls: {
        maxPlaces: 20,
        maxScrollSteps: 1,
        maxViewportPans: 2
      },
      discoverStep: createScriptedDiscoverer([1, 1, 1, 1, 1, 1]),
      noGrowthThreshold: 5
    });

    expect(result.stopReason).toBe("viewport_budget_exhausted");
    expect(result.viewportPansUsed).toBe(2);
    expect(result.scrollStepsUsed).toBe(6);
    expect(result.candidates).toHaveLength(6);
  });
});

function createScriptedDiscoverer(counts: number[]): (step: {
  viewportPan: number;
  scrollStep: number;
}) => Promise<PlaceCandidate[]> {
  let call = 0;
  return async () => {
    const count = counts[Math.min(call, counts.length - 1)] ?? 0;
    call += 1;

    return Array.from({ length: count }, (_, index) => ({
      placeId: `pid-${call}-${index}`,
      name: `Place ${call}-${index}`,
      category: null,
      rating: null,
      reviewsCount: null,
      address: null,
      mapsUrl: null,
      lat: null,
      lng: null,
      website: null,
      email: null,
      phone: null,
      openingHoursJson: null
    }));
  };
}
