import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import type { JobRecord, PlaceCandidate, ReviewSort } from "../../storage/schema.js";
import {
  extractPlaceReviews,
  type NormalizedPlaceReview,
  type RawPlaceReview
} from "./extract-place-reviews.js";

type LiveReviewsSession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  recentRequestUrls: string[];
};

type ExtractPlaceReviewsLiveInput = {
  candidate: PlaceCandidate;
  job: JobRecord;
  sort: ReviewSort;
  maxReviews: number;
};

const sessions = new Map<string, LiveReviewsSession>();

const REVIEW_PANEL_SELECTORS = [
  'button[jsaction*="pane.rating.moreReviews"]',
  'button[jsaction*="reviewChart.moreReviews"]',
  'button[role="tab"][aria-label*="Reviews"]',
  'button[role="tab"][aria-label*="reviews"]',
  'button[aria-label*="More reviews"]',
  'button[aria-label*="more reviews"]',
  'button[aria-label*="reviews"]',
  'button[aria-label*="Reviews"]',
  'button[data-tab-index="1"]',
  'a[href*="/maps/place/"]'
];

const REVIEW_ITEM_SELECTOR = 'div[data-review-id], div.jftiEf, div.jJc9Ad';

const SORT_TO_LABEL: Record<ReviewSort, string[]> = {
  newest: ["Newest", "Latest"],
  most_relevant: ["Most relevant", "Relevance"],
  highest_rating: ["Highest rating"],
  lowest_rating: ["Lowest rating"]
};

const HEX_ENTITY_ID_PATTERN = /(0x[0-9a-f]+:0x[0-9a-f]+)/i;
const SESSION_TOKEN_PATTERN = /!1s([A-Za-z0-9_-]{8,})!7e81/;

type ListEntitiesReviewContext = {
  entityFirstId: string;
  entitySecondId: string;
  sessionToken: string;
};

export async function extractPlaceReviewsLive(
  input: ExtractPlaceReviewsLiveInput
): Promise<NormalizedPlaceReview[]> {
  if (input.maxReviews <= 0 || !input.candidate.mapsUrl) {
    return [];
  }

  const session = await getOrCreateSession(input.job.id);
  session.recentRequestUrls.length = 0;

  try {
    await openPlaceForReviews(session.page, input.candidate);
    await dismissConsent(session.page);
    await session.page
      .waitForSelector('h1, button[jsaction*="pane.rating.moreReviews"], button[aria-label*="review"]', {
        timeout: 15_000
      })
      .catch(() => undefined);
    await session.page.waitForTimeout(600);

    const endpointReviews = await fetchReviewsFromListEntitiesEndpoint(session, input);
    if (endpointReviews.length > 0) {
      return extractPlaceReviews({
        sort: input.sort,
        maxReviews: input.maxReviews,
        fetchReviews: async () => endpointReviews
      });
    }

    await openReviewsPanel(session.page);
    await applyReviewSort(session.page, input.sort);
    const raw = await collectRawReviews(session.page, input.maxReviews);
    return extractPlaceReviews({
      sort: input.sort,
      maxReviews: input.maxReviews,
      fetchReviews: async () => raw
    });
  } catch {
    return [];
  }
}

export async function closeLiveReviewsSession(jobId: string): Promise<void> {
  const session = sessions.get(jobId);
  if (!session) {
    return;
  }

  sessions.delete(jobId);
  await session.context.close();
  await session.browser.close();
}

async function getOrCreateSession(jobId: string): Promise<LiveReviewsSession> {
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
    viewport: { width: 1440, height: 900 },
    // A stable desktop UA helps avoid maps-lite responses where review blocks are absent.
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  });
  const page = await context.newPage();
  const recentRequestUrls: string[] = [];
  page.on("request", (request) => {
    recentRequestUrls.push(request.url());
    if (recentRequestUrls.length > 240) {
      recentRequestUrls.splice(0, recentRequestUrls.length - 240);
    }
  });

  const session: LiveReviewsSession = { browser, context, page, recentRequestUrls };
  sessions.set(jobId, session);
  return session;
}

async function openPlaceForReviews(page: Page, candidate: PlaceCandidate): Promise<void> {
  const searchUrl = buildReviewsSearchUrl(candidate);
  await page.goto(searchUrl, {
    waitUntil: "domcontentloaded",
    timeout: 60_000
  });
  await page.waitForTimeout(750);

  const limited = await isLimitedMapsView(page);
  if (!limited) {
    return;
  }

  // Fallback for cases where Maps search redirects into a limited place view.
  await page.goto(ensureEnglishLocale(candidate.mapsUrl ?? searchUrl), {
    waitUntil: "domcontentloaded",
    timeout: 60_000
  });
  await page.waitForTimeout(750);
}

async function isLimitedMapsView(page: Page): Promise<boolean> {
  return page
    .evaluate(() => (document.body?.innerText ?? "").includes("limited view of Google Maps"))
    .catch(() => false);
}

function buildReviewsSearchUrl(candidate: PlaceCandidate): string {
  const queryParts = [candidate.name, candidate.address].filter((value): value is string => Boolean(value?.trim()));
  const query = queryParts.length > 0 ? queryParts.join(" ") : candidate.name;
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("hl", "en");
  url.searchParams.set("gl", "us");
  url.searchParams.set("query", query);

  if (candidate.placeId) {
    url.searchParams.set("query_place_id", candidate.placeId);
  }

  return url.toString();
}

async function fetchReviewsFromListEntitiesEndpoint(
  session: LiveReviewsSession,
  input: ExtractPlaceReviewsLiveInput
): Promise<RawPlaceReview[]> {
  const context = resolveListEntitiesReviewContext(session, input.candidate);
  if (!context) {
    return [];
  }

  const endpointUrl = buildListEntitiesReviewsUrl(context, input.maxReviews);
  const response = await session.page.request.get(endpointUrl, { timeout: 30_000 }).catch(() => null);
  if (!response?.ok()) {
    return [];
  }

  const payload = await response.text().catch(() => "");
  if (!payload) {
    return [];
  }

  const parsed = parseListEntitiesReviewsResponse(payload);
  if (parsed.length === 0) {
    return [];
  }

  return sortEndpointReviews(parsed, input.sort).slice(0, input.maxReviews);
}

function resolveListEntitiesReviewContext(
  session: LiveReviewsSession,
  candidate: PlaceCandidate
): ListEntitiesReviewContext | null {
  const sessionToken = extractSessionToken(session.recentRequestUrls);
  if (!sessionToken) {
    return null;
  }

  const entityPairRaw = extractEntityPairRaw(candidate, session.recentRequestUrls, session.page.url());
  if (!entityPairRaw) {
    return null;
  }

  const pair = convertEntityPairToDecimal(entityPairRaw);
  if (!pair) {
    return null;
  }

  return {
    entityFirstId: pair.entityFirstId,
    entitySecondId: pair.entitySecondId,
    sessionToken
  };
}

function extractSessionToken(requestUrls: string[]): string | null {
  for (let index = requestUrls.length - 1; index >= 0; index -= 1) {
    const matched = requestUrls[index]?.match(SESSION_TOKEN_PATTERN);
    if (matched?.[1]) {
      return matched[1];
    }
  }

  return null;
}

function extractEntityPairRaw(
  candidate: PlaceCandidate,
  requestUrls: string[],
  currentPageUrl: string
): string | null {
  const sources = [candidate.placeId ?? "", candidate.mapsUrl ?? "", currentPageUrl, ...requestUrls];
  for (const source of sources) {
    const matched = source.match(HEX_ENTITY_ID_PATTERN);
    if (matched?.[1]) {
      return matched[1];
    }
  }

  return null;
}

function convertEntityPairToDecimal(
  pairRaw: string
): { entityFirstId: string; entitySecondId: string } | null {
  const [firstHex, secondHex] = pairRaw.split(":");
  if (!firstHex || !secondHex) {
    return null;
  }

  if (!/^0x[0-9a-f]+$/i.test(firstHex) || !/^0x[0-9a-f]+$/i.test(secondHex)) {
    return null;
  }

  try {
    return {
      entityFirstId: BigInt(firstHex).toString(),
      entitySecondId: BigInt(secondHex).toString()
    };
  } catch {
    return null;
  }
}

function buildListEntitiesReviewsUrl(context: ListEntitiesReviewContext, maxReviews: number): string {
  const pageSize = Math.max(1, Math.min(200, maxReviews));
  const pb = [
    `!1m2!1y${context.entityFirstId}!2y${context.entitySecondId}`,
    `!2m2!1i0!2i${pageSize}`,
    "!3e1",
    "!4m5!3b1!4b1!5b1!6b1!7b1",
    `!5m2!1s${context.sessionToken}!7e81`
  ].join("");

  const endpoint = new URL("https://www.google.com/maps/preview/review/listentitiesreviews");
  endpoint.searchParams.set("authuser", "0");
  endpoint.searchParams.set("hl", "en");
  endpoint.searchParams.set("gl", "us");
  endpoint.searchParams.set("pb", pb);
  return endpoint.toString();
}

function parseListEntitiesReviewsResponse(payload: string): RawPlaceReview[] {
  const sanitized = payload.replace(/^\)\]\}'\n?/, "");
  let parsed: unknown;

  try {
    parsed = JSON.parse(sanitized);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed) || !Array.isArray(parsed[2])) {
    return [];
  }

  const reviews: RawPlaceReview[] = [];
  for (const row of parsed[2]) {
    const mapped = mapListEntitiesReviewRow(row);
    if (mapped) {
      reviews.push(mapped);
    }
  }

  return reviews;
}

function mapListEntitiesReviewRow(row: unknown): RawPlaceReview | null {
  if (!Array.isArray(row)) {
    return null;
  }

  const authorBlock = Array.isArray(row[0]) ? row[0] : [];
  const authorName = normalizeUnknownText(authorBlock[1]);
  const publishedAt = normalizeUnknownText(row[1]);
  const text = normalizeUnknownText(row[3]);
  const rating = normalizeUnknownRating(row[4]);
  const reviewId = normalizeUnknownText(row[10]) ?? normalizeUnknownText(row[11]);

  if (!reviewId && !authorName && !text && !publishedAt) {
    return null;
  }

  return {
    reviewId,
    authorName,
    rating,
    text,
    publishedAt
  };
}

function normalizeUnknownText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeUnknownRating(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(",", "."));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function sortEndpointReviews(reviews: RawPlaceReview[], sort: ReviewSort): RawPlaceReview[] {
  if (sort === "highest_rating") {
    return [...reviews].sort(
      (left, right) =>
        (normalizeUnknownRating(right.rating) ?? -1) - (normalizeUnknownRating(left.rating) ?? -1)
    );
  }

  if (sort === "lowest_rating") {
    return [...reviews].sort(
      (left, right) => (normalizeUnknownRating(left.rating) ?? 6) - (normalizeUnknownRating(right.rating) ?? 6)
    );
  }

  return reviews;
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

async function openReviewsPanel(page: Page): Promise<void> {
  if (await hasVisibleReviewItems(page)) {
    return;
  }

  for (const selector of REVIEW_PANEL_SELECTORS) {
    const button = page.locator(selector).first();
    const visible = await button.isVisible({ timeout: 1_200 }).catch(() => false);
    if (!visible) {
      continue;
    }

    await button.click({ timeout: 3_000 }).catch(() => undefined);
    await page.waitForTimeout(750);
    if (await hasVisibleReviewItems(page)) {
      return;
    }
  }

  // fallback: click a text-matching reviews button when selector-based lookup misses
  const fallback = page
    .getByRole("button", { name: /reviews?/i })
    .first();
  if (await fallback.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await fallback.click({ timeout: 3_000 }).catch(() => undefined);
    await page.waitForTimeout(750);
  }
}

async function hasVisibleReviewItems(page: Page): Promise<boolean> {
  const locator = page.locator(REVIEW_ITEM_SELECTOR).first();
  return locator.isVisible({ timeout: 1_500 }).catch(() => false);
}

async function applyReviewSort(page: Page, sort: ReviewSort): Promise<void> {
  const labels = SORT_TO_LABEL[sort];
  const sortButtonSelectors = [
    'button[aria-label*="Sort reviews"]',
    'button[aria-label*="Sort"]',
    'button[jsaction*="pane.reviewSort"]'
  ];

  for (const selector of sortButtonSelectors) {
    const button = page.locator(selector).first();
    if (!(await button.isVisible({ timeout: 900 }).catch(() => false))) {
      continue;
    }

    await button.click({ timeout: 2_000 }).catch(() => undefined);
    await page.waitForTimeout(350);

    for (const label of labels) {
      const menuItem = page.getByRole("menuitemradio", { name: label }).first();
      if (await menuItem.isVisible({ timeout: 900 }).catch(() => false)) {
        await menuItem.click({ timeout: 2_000 }).catch(() => undefined);
        await page.waitForTimeout(550);
        return;
      }

      const optionButton = page.getByRole("button", { name: label }).first();
      if (await optionButton.isVisible({ timeout: 900 }).catch(() => false)) {
        await optionButton.click({ timeout: 2_000 }).catch(() => undefined);
        await page.waitForTimeout(550);
        return;
      }
    }

    return;
  }
}

async function collectRawReviews(page: Page, maxReviews: number): Promise<RawPlaceReview[]> {
  const accepted: RawPlaceReview[] = [];
  const seen = new Set<string>();

  let noGrowthPasses = 0;
  const maxPasses = Math.max(6, Math.min(48, maxReviews * 3));

  for (let pass = 0; pass < maxPasses; pass += 1) {
    const visible = await readVisibleReviews(page);
    let passGrowth = 0;

    for (const review of visible) {
      const key = [review.reviewId ?? "", review.authorName ?? "", review.text ?? "", review.publishedAt ?? ""]
        .join("|")
        .trim();
      if (!key || seen.has(key)) {
        continue;
      }

      seen.add(key);
      accepted.push(review);
      passGrowth += 1;
      if (accepted.length >= maxReviews) {
        return accepted;
      }
    }

    if (passGrowth === 0) {
      noGrowthPasses += 1;
    } else {
      noGrowthPasses = 0;
    }

    if (noGrowthPasses >= 3) {
      break;
    }

    await scrollReviewPanel(page);
    await page.waitForTimeout(450);
  }

  return accepted;
}

async function scrollReviewPanel(page: Page): Promise<void> {
  await page
    .evaluate(() => {
      const candidates = Array.from(
        document.querySelectorAll('div[aria-label*="reviews"], div[aria-label*="Reviews"], div[role="main"], div.m6QErb')
      );

      const scrollables = candidates.filter((node) => {
        const el = node as HTMLElement;
        return el.scrollHeight - el.clientHeight > 150;
      }) as HTMLElement[];

      if (scrollables.length > 0) {
        const best = scrollables.sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
        best.scrollBy({ top: Math.max(best.clientHeight * 0.85, 380), behavior: "instant" });
        return;
      }

      window.scrollBy(0, Math.max(window.innerHeight * 0.75, 500));
    })
    .catch(() => undefined);
}

async function readVisibleReviews(page: Page): Promise<RawPlaceReview[]> {
  return page
    .evaluate(() => {
      const normalizeText = (value: string | null | undefined): string | null => {
        if (!value) {
          return null;
        }

        const normalized = value.replace(/\s+/g, " ").trim();
        return normalized.length > 0 ? normalized : null;
      };

      const parseRating = (value: string | null | undefined): number | null => {
        const normalized = normalizeText(value);
        if (!normalized) {
          return null;
        }

        const matched = normalized.match(/([0-5](?:[.,][0-9])?)/);
        if (!matched?.[1]) {
          return null;
        }

        const parsed = Number.parseFloat(matched[1].replace(",", "."));
        if (!Number.isFinite(parsed)) {
          return null;
        }

        return parsed;
      };

      const firstText = (root: Element, selectors: string[]): string | null => {
        for (const selector of selectors) {
          const node = root.querySelector(selector) as HTMLElement | null;
          const text = normalizeText(node?.innerText ?? node?.textContent ?? null);
          if (text) {
            return text;
          }
        }

        return null;
      };

      const nodes = Array.from(document.querySelectorAll('div[data-review-id], div.jftiEf, div.jJc9Ad'));
      const collected: RawPlaceReview[] = [];

      for (const node of nodes) {
        const root = node as HTMLElement;
        const reviewId =
          normalizeText(root.getAttribute("data-review-id")) ??
          normalizeText(root.querySelector("[data-review-id]")?.getAttribute("data-review-id")) ??
          null;
        const authorName = firstText(root, [
          ".d4r55",
          ".TSUbDb",
          ".WNxzHc .bwb7ce",
          ".X5PpBb"
        ]);
        const rating = parseRating(
          (root.querySelector('span[aria-label*="star"], span[aria-label*="Star"]') as HTMLElement | null)?.getAttribute(
            "aria-label"
          )
        );
        const text = firstText(root, [
          ".wiI7pd",
          ".MyEned",
          ".review-full-text",
          ".Jtu6Td"
        ]);
        const publishedAt = firstText(root, [
          ".rsqaWe",
          ".DU9Pgb",
          ".xRkPPb"
        ]);

        if (!reviewId && !authorName && !text && !publishedAt) {
          continue;
        }

        collected.push({
          reviewId,
          authorName,
          rating,
          text,
          publishedAt
        });
      }

      return collected;
    })
    .catch(() => []);
}

function ensureEnglishLocale(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.set("hl", "en");
    parsed.searchParams.set("gl", "us");
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}
