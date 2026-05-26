import { buildNewsFeedItemsFromXmls } from "../src/lib/rss-feed";

type VercelRequest = {
  method?: string;
  query: {
    url?: string | string[];
  };
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  setHeader: (key: string, value: string) => void;
  send: (body: string) => void;
  json: (body: unknown) => void;
};

const allowedFeedHosts = new Set(["news.google.com"]);

function setCorsHeaders(response: VercelResponse) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeRssFeedUrl(value: string | undefined) {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !allowedFeedHosts.has(url.hostname)) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.status(204).send("");
    return;
  }

  const feedUrl = normalizeRssFeedUrl(first(request.query.url));

  if (!feedUrl) {
    response.status(400).json({ error: "RSS feed URL is not allowed." });
    return;
  }

  try {
    const xmls = await fetchFeedXmls(feedUrl);
    const items = await buildNewsFeedItemsFromXmls(xmls);

    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=900");
    response.json({ items });
  } catch {
    response.status(502).json({ error: "RSS feed could not be loaded." });
  }
}

async function fetchFeedXmls(feedUrl: string) {
  const results = await Promise.allSettled(feedVariantUrls(feedUrl).map(fetchFeedXml));
  const xmls = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  if (!xmls.length) throw new Error("RSS feed could not be loaded.");
  return xmls;
}

async function fetchFeedXml(feedUrl: string) {
  const feedResponse = await fetch(feedUrl, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml",
      "User-Agent": "PatriotsInActionFeeds/1.0",
    },
  });

  if (!feedResponse.ok) throw new Error(`Upstream RSS status: ${feedResponse.status}.`);
  return feedResponse.text();
}

function feedVariantUrls(feedUrl: string) {
  const url = new URL(feedUrl);
  if (url.hostname !== "news.google.com" || !url.pathname.startsWith("/rss/search")) return [feedUrl];

  const query = url.searchParams.get("q") || "";
  if (/\bwhen:\S+/i.test(query)) return [feedUrl];

  return ["7d", "30d"].map((dateWindow) => {
    const next = new URL(url);
    next.searchParams.set("q", `${query} when:${dateWindow}`);
    return next.toString();
  }).concat(feedUrl);
}
