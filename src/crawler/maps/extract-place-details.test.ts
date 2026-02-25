import { describe, expect, it } from "vitest";
import { extractPlaceDetails, type ExtractDetailsPage } from "./extract-place-details.js";

describe("extractPlaceDetails", () => {
  it("extracts website, email, phone, and hours with fallback selectors", async () => {
    const page = createFakePage({
      'a[data-item-id="authority"]': { attribute: null },
      'a[data-item-id^="authority"]': {
        attribute: "https://www.google.com/url?q=https%3A%2F%2Fexample.com&sa=U"
      },
      'a[href^="mailto:"]': { attribute: "mailto:hello@example.com?subject=Hi" },
      'button[data-item-id^="phone:"]': { text: "+1 206 555 1000" },
      'table[aria-label*="Hours"] tr': { lines: ["Mon 9:00 AM-5:00 PM", "Tue 9:00 AM-5:00 PM"] }
    });

    await expect(extractPlaceDetails(page)).resolves.toEqual({
      website: "https://example.com",
      email: "hello@example.com",
      phone: "+1 206 555 1000",
      openingHoursJson: '["Mon 9:00 AM-5:00 PM","Tue 9:00 AM-5:00 PM"]'
    });
  });

  it("returns nulls when details are missing or selector reads fail", async () => {
    const page = createFakePage({
      'a[data-item-id="authority"]': { throws: true },
      'a[href^="mailto:"]': { text: "   " },
      'button[data-item-id^="phone:"]': { text: "   " },
      'table[aria-label*="Hours"] tr': { lines: [] }
    });

    await expect(extractPlaceDetails(page)).resolves.toEqual({
      website: null,
      email: null,
      phone: null,
      openingHoursJson: null
    });
  });

  it("strips map glyphs from phone values", async () => {
    const page = createFakePage({
      'button[data-item-id^="phone:"]': { text: "020 4214000" }
    });

    await expect(extractPlaceDetails(page)).resolves.toMatchObject({
      phone: "020 4214000"
    });
  });
});

type FakeSelectorResult = {
  text?: string | null;
  attribute?: string | null;
  lines?: string[];
  throws?: boolean;
};

function createFakePage(selectors: Record<string, FakeSelectorResult>): ExtractDetailsPage {
  return {
    locator(selector: string) {
      const configured = selectors[selector] ?? {};

      return {
        first() {
          return {
            async textContent() {
              if (configured.throws) {
                throw new Error("selector failed");
              }

              return configured.text ?? null;
            },
            async getAttribute() {
              if (configured.throws) {
                throw new Error("selector failed");
              }

              return configured.attribute ?? null;
            }
          };
        },
        async allTextContents() {
          if (configured.throws) {
            throw new Error("selector failed");
          }

          return configured.lines ?? [];
        }
      };
    }
  };
}
