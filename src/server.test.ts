import { describe, expect, it } from "vitest";
import { startupBanner } from "./server.js";

describe("startupBanner", () => {
  it("includes local safety baseline and guardrail notice", () => {
    const banner = startupBanner();
    expect(banner).toContain("local runtime safety baseline");
    expect(banner).toContain("paid proxy/captcha integrations are optional");
    expect(banner).toContain("guardrails");
  });
});
