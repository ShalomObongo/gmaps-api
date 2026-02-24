import { describe, expect, it, vi } from "vitest";
import { runWithPolicy } from "./runner.js";
import { RUNTIME_DEFAULTS } from "../config/runtime-defaults.js";

describe("runWithPolicy", () => {
  it("retries retryable failures with backoff and returns warnings", async () => {
    const sleep = vi.fn(async () => {});
    let count = 0;

    const value = await runWithPolicy(
      async () => {
        count += 1;
        if (count < 3) {
          throw new Error("429 too many requests");
        }
        return "ok";
      },
      { ...RUNTIME_DEFAULTS, maxRetries: 3, pacingMs: 0 },
      { random: () => 0.5, sleep }
    );

    expect(value.value).toBe("ok");
    expect(value.retries).toBe(2);
    expect(value.warnings).toContain("BLOCK_DETECTED");
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("throws when retry budget is exhausted", async () => {
    await expect(
      runWithPolicy(
        async () => {
          throw new Error("timeout");
        },
        { ...RUNTIME_DEFAULTS, maxRetries: 1, pacingMs: 0 },
        { random: () => 0.5, sleep: async () => {} }
      )
    ).rejects.toThrow("timeout");
  });
});
