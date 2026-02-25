import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import type { JobRecord, PlaceCandidate } from "../../storage/schema.js";
import { extractEmailFromWebsite } from "./extract-contact-email.js";
import { extractPlaceDetails, type ExtractedPlaceDetails } from "./extract-place-details.js";

type LiveEnrichmentSession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
};

const sessions = new Map<string, LiveEnrichmentSession>();

export async function enrichPlaceLive(candidate: PlaceCandidate, job: JobRecord): Promise<ExtractedPlaceDetails> {
  if (!candidate.mapsUrl) {
    return enrichFromWebsiteOnly(candidate.website);
  }

  const session = await getOrCreateSession(job.id);
  const mapsUrl = ensureEnglishLocale(candidate.mapsUrl);

  try {
    await session.page.goto(mapsUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await dismissConsent(session.page);
    await session.page
      .waitForSelector('h1, button[data-item-id^="phone:"], a[data-item-id="authority"]', {
        timeout: 12_000
      })
      .catch(() => undefined);
    await session.page.waitForTimeout(700);

    const details = await extractPlaceDetails(session.page);
    const fallbackWebsite = await extractFallbackWebsite(session.page);
    const websiteForEmail = details.website ?? fallbackWebsite ?? candidate.website;
    const websiteEmail = await maybeExtractEmailFromWebsite(websiteForEmail);

    return {
      website: details.website ?? fallbackWebsite,
      email: details.email ?? websiteEmail,
      phone: details.phone,
      openingHoursJson: details.openingHoursJson
    };
  } catch {
    return enrichFromWebsiteOnly(candidate.website);
  }
}

export async function closeLiveEnrichmentSession(jobId: string): Promise<void> {
  const session = sessions.get(jobId);
  if (!session) {
    return;
  }

  sessions.delete(jobId);
  await session.context.close();
  await session.browser.close();
}

async function getOrCreateSession(jobId: string): Promise<LiveEnrichmentSession> {
  const existing = sessions.get(jobId);
  if (existing) {
    return existing;
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"]
  });
  const context = await browser.newContext({
    locale: "en-US",
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const session: LiveEnrichmentSession = {
    browser,
    context,
    page
  };

  sessions.set(jobId, session);
  return session;
}

async function dismissConsent(page: Page): Promise<void> {
  const consentButtons = ["Reject all", "Accept all", "I agree"];
  for (const label of consentButtons) {
    const button = page.getByRole("button", { name: label }).first();
    if (await button.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await button.click({ timeout: 2_000 }).catch(() => undefined);
      await page.waitForTimeout(300);
      return;
    }
  }
}

async function enrichFromWebsiteOnly(website: string | null): Promise<ExtractedPlaceDetails> {
  return {
    website: null,
    email: await maybeExtractEmailFromWebsite(website),
    phone: null,
    openingHoursJson: null
  };
}

async function maybeExtractEmailFromWebsite(website: string | null): Promise<string | null> {
  if (!website) {
    return null;
  }

  return extractEmailFromWebsite(website);
}

function ensureEnglishLocale(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.set("hl", "en");
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

async function extractFallbackWebsite(page: Page): Promise<string | null> {
  try {
    const discovered = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll("a[data-item-id], a[aria-label*='Website']"));
      for (const node of anchors) {
        const anchor = node as HTMLAnchorElement;
        const href = anchor.href?.trim();
        if (!href) {
          continue;
        }

        try {
          const parsed = new URL(href);
          if (parsed.hostname.includes("google.")) {
            continue;
          }
        } catch {
          continue;
        }

        return href;
      }

      return null;
    });

    return discovered;
  } catch {
    return null;
  }
}
