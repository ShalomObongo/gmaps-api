import { describe, expect, it } from "vitest";
import { classifyRetryableError, computeBackoffMs } from "./backoff.js";

describe("classifyRetryableError", () => {
  it("returns true for transient network-like failures", () => {
    expect(classifyRetryableError(new Error("Request timeout while fetching"))).toBe(true);
    expect(classifyRetryableError(new Error("429 too many requests"))).toBe(true);
  });

  it("returns false for permanent failures", () => {
    expect(classifyRetryableError(new Error("unsupported selector"))).toBe(false);
  });
});

describe("computeBackoffMs", () => {
  it("grows exponentially and respects cap", () => {
    const noJitter = () => 0.5;
    const first = computeBackoffMs({ attempt: 0, baseMs: 200, maxMs: 5_000, jitterRatio: 0, random: noJitter });
    const third = computeBackoffMs({ attempt: 3, baseMs: 200, maxMs: 5_000, jitterRatio: 0, random: noJitter });
    const capped = computeBackoffMs({ attempt: 30, baseMs: 200, maxMs: 5_000, jitterRatio: 0, random: noJitter });

    expect(first).toBe(200);
    expect(third).toBe(1600);
    expect(capped).toBe(5000);
  });
});
