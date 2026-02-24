import type { CollectionConfig, PlaceCandidate } from "../../storage/schema.js";

export type CollectPlacesParams = {
  controls: CollectionConfig;
  discoverStep: (step: CollectStep) => Promise<PlaceCandidate[]>;
  noGrowthThreshold?: number;
};

export type CollectStep = {
  viewportPan: number;
  scrollStep: number;
};

export type CollectPlacesResult = {
  candidates: PlaceCandidate[];
  discoveredCount: number;
  viewportPansUsed: number;
  scrollStepsUsed: number;
  stopReason: "reached_max_places" | "scroll_budget_exhausted" | "viewport_budget_exhausted" | "no_growth";
};

export async function collectPlacesFromMaps(params: CollectPlacesParams): Promise<CollectPlacesResult> {
  const noGrowthThreshold = Math.max(1, params.noGrowthThreshold ?? 2);
  const accepted: PlaceCandidate[] = [];

  let discoveredCount = 0;
  let scrollStepsUsed = 0;
  let viewportPansUsed = 0;
  let stopReason: CollectPlacesResult["stopReason"] = "scroll_budget_exhausted";
  let noGrowthStreak = 0;
  let previousDiscoveredCount = 0;

  for (let viewportPan = 0; viewportPan <= params.controls.maxViewportPans; viewportPan += 1) {
    viewportPansUsed = viewportPan;

    for (let scrollStep = 0; scrollStep <= params.controls.maxScrollSteps; scrollStep += 1) {
      scrollStepsUsed += 1;
      const discovered = await params.discoverStep({ viewportPan, scrollStep });
      discoveredCount += discovered.length;

      for (const candidate of discovered) {
        accepted.push(candidate);
        if (accepted.length >= params.controls.maxPlaces) {
          stopReason = "reached_max_places";
          return {
            candidates: accepted.slice(0, params.controls.maxPlaces),
            discoveredCount,
            viewportPansUsed,
            scrollStepsUsed,
            stopReason
          };
        }
      }

      if (discoveredCount === previousDiscoveredCount) {
        noGrowthStreak += 1;
      } else {
        noGrowthStreak = 0;
      }

      previousDiscoveredCount = discoveredCount;
      if (noGrowthStreak >= noGrowthThreshold) {
        stopReason = "no_growth";
        return {
          candidates: accepted,
          discoveredCount,
          viewportPansUsed,
          scrollStepsUsed,
          stopReason
        };
      }
    }

    if (viewportPan === params.controls.maxViewportPans) {
      stopReason = "viewport_budget_exhausted";
    }
  }

  return {
    candidates: accepted,
    discoveredCount,
    viewportPansUsed,
    scrollStepsUsed,
    stopReason
  };
}
