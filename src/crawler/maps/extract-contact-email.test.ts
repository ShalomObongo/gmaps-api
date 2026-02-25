import { afterEach, describe, expect, it, vi } from "vitest";
import { extractEmailFromWebsite } from "./extract-contact-email.js";

describe("extractEmailFromWebsite", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns first valid email from html", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: () => "text/html; charset=utf-8"
      },
      text: async () => "<a href='mailto:Sales@Example.org'>Contact</a>"
    } as unknown as Response);

    await expect(extractEmailFromWebsite("https://example.org")).resolves.toBe("sales@example.org");
  });

  it("returns null when html does not include an email", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: () => "text/html"
      },
      text: async () => "<div>No contact listed</div>"
    } as unknown as Response);

    await expect(extractEmailFromWebsite("https://example.org")).resolves.toBeNull();
  });
});
