export type ExtractedPlaceDetails = {
  website: string | null;
  email: string | null;
  phone: string | null;
  openingHoursJson: string | null;
};

export type ExtractDetailsPage = {
  locator(selector: string): {
    first(): {
      textContent(options?: { timeout?: number }): Promise<string | null>;
      getAttribute(name: string, options?: { timeout?: number }): Promise<string | null>;
    };
    allTextContents?: () => Promise<string[]>;
  };
};

const WEBSITE_SELECTORS = [
  'a[data-item-id="authority"]',
  'a[data-item-id^="authority"]',
  'a[aria-label*="Website"]',
  'a[data-tooltip*="website"]'
];

const PHONE_SELECTORS = ['button[data-item-id^="phone:"]', 'button[aria-label*="Phone"]'];
const EMAIL_SELECTORS = ['a[href^="mailto:"]', 'button[data-item-id^="email:"]'];

const HOURS_SELECTORS = ['table[aria-label*="Hours"] tr', 'div[aria-label*="Hours"] li'];
const SELECTOR_TIMEOUT_MS = 1_500;

export async function extractPlaceDetails(page: ExtractDetailsPage): Promise<ExtractedPlaceDetails> {
  const website = await safely(async () => normalizeWebsiteUrl(await findFirstAttribute(page, WEBSITE_SELECTORS, "href")));
  const email = await safely(async () => findFirstEmail(page));
  const phone = await safely(async () => normalizePhoneText(await findFirstText(page, PHONE_SELECTORS)));
  const openingHoursJson = await safely(async () => {
    const lines = await findTextLines(page, HOURS_SELECTORS);
    if (lines.length === 0) {
      return null;
    }

    return JSON.stringify(lines);
  });

  return {
    website,
    email,
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
      const value = await page.locator(selector).first().getAttribute(attributeName, {
        timeout: SELECTOR_TIMEOUT_MS
      });
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
      const value = await page.locator(selector).first().textContent({
        timeout: SELECTOR_TIMEOUT_MS
      });
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

async function findFirstEmail(page: ExtractDetailsPage): Promise<string | null> {
  const mailtoHref = await findFirstAttribute(page, EMAIL_SELECTORS, "href");
  const fromHref = extractEmail(mailtoHref);
  if (fromHref) {
    return fromHref;
  }

  const fromText = extractEmail(await findFirstText(page, EMAIL_SELECTORS));
  if (fromText) {
    return fromText;
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

      const firstLine = normalizeNullableText(
        await locator.first().textContent({ timeout: SELECTOR_TIMEOUT_MS })
      );
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

function normalizeWebsiteUrl(value: string | null): string | null {
  const normalized = normalizeNullableText(value);
  if (!normalized) {
    return null;
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.hostname === "www.google.com" && parsed.pathname === "/url") {
      const target = parsed.searchParams.get("q");
      const decodedTarget = normalizeNullableText(target);
      if (decodedTarget) {
        return decodedTarget;
      }
    }
  } catch {
    // fall through and return normalized value
  }

  return normalized;
}

function extractEmail(value: string | null): string | null {
  const normalized = normalizeNullableText(value);
  if (!normalized) {
    return null;
  }

  const mailto = normalized.match(/^mailto:([^?]+)/i);
  if (mailto?.[1]) {
    const candidate = normalizeNullableText(mailto[1]);
    if (candidate && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) {
      return candidate.toLowerCase();
    }
  }

  const plain = normalized.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  if (!plain?.[0]) {
    return null;
  }

  return plain[0].toLowerCase();
}

function normalizePhoneText(value: string | null): string | null {
  const normalized = normalizeNullableText(value);
  if (!normalized) {
    return null;
  }

  const withoutIcons = normalized.replace(/[\uE000-\uF8FF]/g, "");
  const cleaned = withoutIcons.replace(/^phone:\s*/i, "").trim();
  if (!cleaned) {
    return null;
  }

  const matched = cleaned.match(/(\+?\d[\d\s().-]{5,}\d)/);
  if (matched?.[1]) {
    return normalizeNullableText(matched[1]);
  }

  return cleaned;
}

async function safely(read: () => Promise<string | null>): Promise<string | null> {
  try {
    return await read();
  } catch {
    return null;
  }
}
