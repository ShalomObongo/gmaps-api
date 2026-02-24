export type ExtractedPlaceDetails = {
  website: string | null;
  phone: string | null;
  openingHoursJson: string | null;
};

export type ExtractDetailsPage = {
  locator(selector: string): {
    first(): {
      textContent(): Promise<string | null>;
      getAttribute(name: string): Promise<string | null>;
    };
    allTextContents?: () => Promise<string[]>;
  };
};

const WEBSITE_SELECTORS = [
  'a[data-item-id="authority"]',
  'a[data-item-id^="authority"]',
  'a[aria-label*="Website"]'
];

const PHONE_SELECTORS = ['button[data-item-id^="phone:"]', 'button[aria-label*="Phone"]'];

const HOURS_SELECTORS = ['table[aria-label*="Hours"] tr', 'div[aria-label*="Hours"] li'];

export async function extractPlaceDetails(page: ExtractDetailsPage): Promise<ExtractedPlaceDetails> {
  const website = await safely(async () => normalizeNullableText(await findFirstAttribute(page, WEBSITE_SELECTORS, "href")));
  const phone = await safely(async () => normalizeNullableText(await findFirstText(page, PHONE_SELECTORS)));
  const openingHoursJson = await safely(async () => {
    const lines = await findTextLines(page, HOURS_SELECTORS);
    if (lines.length === 0) {
      return null;
    }

    return JSON.stringify(lines);
  });

  return {
    website,
    phone,
    openingHoursJson
  };
}

async function findFirstAttribute(
  page: ExtractDetailsPage,
  selectors: string[],
  attributeName: string
): Promise<string | null> {
  for (const selector of selectors) {
    try {
      const value = await page.locator(selector).first().getAttribute(attributeName);
      const normalized = normalizeNullableText(value);
      if (normalized) {
        return normalized;
      }
    } catch {
      // ignore selector-level failures
    }
  }

  return null;
}

async function findFirstText(page: ExtractDetailsPage, selectors: string[]): Promise<string | null> {
  for (const selector of selectors) {
    try {
      const value = await page.locator(selector).first().textContent();
      const normalized = normalizeNullableText(value);
      if (normalized) {
        return normalized;
      }
    } catch {
      // ignore selector-level failures
    }
  }

  return null;
}

async function findTextLines(page: ExtractDetailsPage, selectors: string[]): Promise<string[]> {
  for (const selector of selectors) {
    try {
      const locator = page.locator(selector);
      if (typeof locator.allTextContents === "function") {
        const lines = (await locator.allTextContents()).map(normalizeNullableText).filter((value): value is string => value !== null);
        if (lines.length > 0) {
          return lines;
        }
      }

      const firstLine = normalizeNullableText(await locator.first().textContent());
      if (firstLine) {
        return [firstLine];
      }
    } catch {
      // ignore selector-level failures
    }
  }

  return [];
}

function normalizeNullableText(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized ? normalized : null;
}

async function safely(read: () => Promise<string | null>): Promise<string | null> {
  try {
    return await read();
  } catch {
    return null;
  }
}
