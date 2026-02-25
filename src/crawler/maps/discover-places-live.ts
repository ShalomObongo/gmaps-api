import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import type { PlaceCandidate, JobRecord } from "../../storage/schema.js";
import type { CollectStep } from "./collect-places.js";

type LiveDiscoverySession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  seenKeys: Set<string>;
  currentScrollStep: number;
  currentViewportPan: number;
};

type RawCandidate = {
  name: string;
  mapsUrl: string | null;
  category: string | null;
  rating: number | null;
  reviewsCount: number | null;
  address: string | null;
};

const sessions = new Map<string, LiveDiscoverySession>();

export async function discoverPlacesLive(step: CollectStep, job: JobRecord): Promise<PlaceCandidate[]> {
  const session = await getOrCreateSession(job);

  if (step.viewportPan > session.currentViewportPan) {
    for (let pan = session.currentViewportPan; pan < step.viewportPan; pan += 1) {
      await panViewport(session.page);
      await session.page.waitForTimeout(400);
    }
    session.currentViewportPan = step.viewportPan;
  }

  if (step.scrollStep > session.currentScrollStep) {
    for (let scroll = session.currentScrollStep; scroll < step.scrollStep; scroll += 1) {
      await scrollResults(session.page);
      await session.page.waitForTimeout(450);
    }
    session.currentScrollStep = step.scrollStep;
  }

  const raw = await extractVisibleCandidates(session.page);
  const fresh: PlaceCandidate[] = [];

  for (const candidate of raw) {
    const placeId = parsePlaceId(candidate.mapsUrl);
    const latLng = parseLatLng(candidate.mapsUrl);
    const key = placeId ?? candidate.mapsUrl ?? `${candidate.name}|${candidate.address ?? ""}`;
    if (session.seenKeys.has(key)) {
      continue;
    }

    session.seenKeys.add(key);
    fresh.push({
      placeId,
      name: candidate.name,
      category: candidate.category,
      rating: candidate.rating,
      reviewsCount: candidate.reviewsCount,
      address: candidate.address,
      mapsUrl: candidate.mapsUrl,
      lat: latLng?.lat ?? null,
      lng: latLng?.lng ?? null,
      website: null,
      phone: null,
      openingHoursJson: null
    });
  }

  return fresh;
}

export async function closeLiveDiscoverySession(jobId: string): Promise<void> {
  const session = sessions.get(jobId);
  if (!session) {
    return;
  }

  sessions.delete(jobId);
  await session.context.close();
  await session.browser.close();
}

async function getOrCreateSession(job: JobRecord): Promise<LiveDiscoverySession> {
  const existing = sessions.get(job.id);
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

  const query = buildMapsQuery(job);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  await page.goto(mapsUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await dismissConsent(page);
  await page.waitForSelector('div[role="feed"], a[href*="/maps/place/"]', {
    timeout: 30_000
  });

  const session: LiveDiscoverySession = {
    browser,
    context,
    page,
    seenKeys: new Set<string>(),
    currentScrollStep: 0,
    currentViewportPan: 0
  };

  sessions.set(job.id, session);
  return session;
}

function buildMapsQuery(job: JobRecord): string {
  if (job.query.startsWith("place_id:")) {
    return job.query.slice("place_id:".length);
  }

  if (job.location) {
    return `${job.query} ${job.location}`;
  }

  return job.query;
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

async function scrollResults(page: Page): Promise<void> {
  await page.evaluate(() => {
    const feed = document.querySelector('div[role="feed"]');
    if (feed) {
      feed.scrollBy({ top: feed.scrollHeight, behavior: "instant" });
      return;
    }

    window.scrollBy(0, window.innerHeight);
  });
}

async function panViewport(page: Page): Promise<void> {
  await page.evaluate(() => {
    const map = document.querySelector('div[role="main"]');
    if (!map) {
      return;
    }

    const mouseDown = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
      clientX: window.innerWidth / 2,
      clientY: window.innerHeight / 2
    });
    const mouseMove = new MouseEvent("mousemove", {
      bubbles: true,
      cancelable: true,
      clientX: window.innerWidth / 2 + 120,
      clientY: window.innerHeight / 2
    });
    const mouseUp = new MouseEvent("mouseup", {
      bubbles: true,
      cancelable: true,
      clientX: window.innerWidth / 2 + 120,
      clientY: window.innerHeight / 2
    });

    map.dispatchEvent(mouseDown);
    map.dispatchEvent(mouseMove);
    map.dispatchEvent(mouseUp);
  });
}

async function extractVisibleCandidates(page: Page): Promise<RawCandidate[]> {
  return page.evaluate(() => {
    const normalizeText = (value: string | null | undefined): string | null => {
      if (!value) {
        return null;
      }
      const normalized = value.replace(/\s+/g, " ").trim();
      return normalized.length > 0 ? normalized : null;
    };

    const parseRatingAndReviews = (article: Element): { rating: number | null; reviewsCount: number | null } => {
      const label =
        article.querySelector('[role="img"][aria-label*="star"]')?.getAttribute("aria-label") ??
        article.querySelector("span[aria-label*='star']")?.getAttribute("aria-label") ??
        "";
      const ratingMatch = label.match(/([0-9]+(?:\.[0-9]+)?)/);
      const reviewsMatch = label.match(/\(([\d,]+)\)/);
      return {
        rating: ratingMatch ? Number.parseFloat(ratingMatch[1]) : null,
        reviewsCount: reviewsMatch ? Number.parseInt(reviewsMatch[1].replace(/,/g, ""), 10) : null
      };
    };

    const articles = Array.from(document.querySelectorAll('div[role="feed"] div[role="article"]'));
    const candidates: RawCandidate[] = [];

    for (const article of articles) {
      const link = article.querySelector('a[href*="/maps/place/"]') as HTMLAnchorElement | null;
      const nameFromHeadline = normalizeText(article.querySelector("div.fontHeadlineSmall")?.textContent);
      const nameFromAria = normalizeText(link?.getAttribute("aria-label"));
      const name = nameFromHeadline ?? nameFromAria;
      if (!name) {
        continue;
      }

      const detail = normalizeText(article.textContent);
      const parts = detail?.split(" · ") ?? [];
      const category = parts.length > 1 ? normalizeText(parts[1]) : null;
      const address = parts.length > 2 ? normalizeText(parts[2]) : null;
      const { rating, reviewsCount } = parseRatingAndReviews(article);

      candidates.push({
        name,
        mapsUrl: link?.href ?? null,
        category,
        rating,
        reviewsCount,
        address
      });
    }

    return candidates;
  });
}

function parsePlaceId(mapsUrl: string | null): string | null {
  if (!mapsUrl) {
    return null;
  }

  const queryMatch = mapsUrl.match(/[?&]query_place_id=([^&]+)/i);
  if (queryMatch?.[1]) {
    return decodeURIComponent(queryMatch[1]);
  }

  const dataMatch = mapsUrl.match(/!1s([^!]+)/);
  if (dataMatch?.[1]) {
    return decodeURIComponent(dataMatch[1]);
  }

  const cidLikeMatch = mapsUrl.match(/0x[0-9a-fA-F]+:0x[0-9a-fA-F]+/);
  if (cidLikeMatch?.[0]) {
    return cidLikeMatch[0];
  }

  return null;
}

function parseLatLng(mapsUrl: string | null): { lat: number; lng: number } | null {
  if (!mapsUrl) {
    return null;
  }

  const match = mapsUrl.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (!match?.[1] || !match?.[2]) {
    return null;
  }

  const lat = Number.parseFloat(match[1]);
  const lng = Number.parseFloat(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}
