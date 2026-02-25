const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const ASSET_SUFFIX_PATTERN = /\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|css|js)$/i;

export async function extractEmailFromWebsite(websiteUrl: string): Promise<string | null> {
  const html = await fetchWebsiteHtml(websiteUrl);
  if (!html) {
    return null;
  }

  return extractFirstEmail(html);
}

async function fetchWebsiteHtml(websiteUrl: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(websiteUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
      }
    });
    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractFirstEmail(html: string): string | null {
  const matches = html.match(EMAIL_PATTERN);
  if (!matches) {
    return null;
  }

  for (const match of matches) {
    const normalized = normalizeEmail(match);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function normalizeEmail(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return null;
  }

  if (ASSET_SUFFIX_PATTERN.test(normalized)) {
    return null;
  }

  if (normalized.endsWith("@example.com")) {
    return null;
  }

  return normalized;
}
