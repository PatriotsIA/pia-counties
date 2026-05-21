import type { NewsFeedItem } from "./rss-feed";

type Rss2JsonItem = {
  title?: string;
  link?: string;
  guid?: string;
  pubDate?: string;
  author?: string;
  thumbnail?: string;
  description?: string;
  content?: string;
  enclosure?: {
    link?: string;
    type?: string;
    thumbnail?: string;
  };
};

type Rss2JsonResponse = {
  status?: "ok" | "error";
  message?: string;
  feed?: {
    title?: string;
    link?: string;
  };
  items?: Rss2JsonItem[];
};

type CachedFeed = {
  fetchedAt: number;
  items: NewsFeedItem[];
};

const DEFAULT_PROVIDER_URL = "https://api.rss2json.com/v1/api.json";
const DEFAULT_RAW_PROXY_URL = "https://api.allorigins.win/raw";
const MAX_ITEMS = 120;
const CACHE_TTL_MS = minutesEnv("VITE_RSS_CACHE_TTL_MINUTES", 60) * 60 * 1000;

export async function fetchRssFeedItems(feedUrl: string) {
  const cached = readCachedFeed(feedUrl);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.items;

  try {
    const items = await fetchProviderItems(feedUrl);
    writeCachedFeed(feedUrl, items);
    return items;
  } catch (error) {
    if (cached) return cached.items;
    throw error;
  }
}

async function fetchProviderItems(feedUrl: string) {
  try {
    return await fetchRss2JsonItems(feedUrl);
  } catch {
    return fetchRawRssItems(feedUrl);
  }
}

async function fetchRss2JsonItems(feedUrl: string) {
  const response = await fetch(providerRequestUrl(feedUrl));
  if (!response.ok) throw new Error(`RSS provider failed with ${response.status}`);

  const json = (await response.json()) as Rss2JsonResponse;
  if (json.status && json.status !== "ok") throw new Error(json.message || "RSS provider returned an error.");

  return (json.items || [])
    .map((item, index) => toNewsFeedItem(item, index, json.feed))
    .sort((first, second) => publishedTimestamp(second) - publishedTimestamp(first))
    .slice(0, MAX_ITEMS);
}

async function fetchRawRssItems(feedUrl: string) {
  const response = await fetch(rawProxyRequestUrl(feedUrl));
  if (!response.ok) throw new Error(`RSS raw proxy failed with ${response.status}`);

  return parseRssXml(await response.text())
    .sort((first, second) => publishedTimestamp(second) - publishedTimestamp(first))
    .slice(0, MAX_ITEMS);
}

function providerRequestUrl(feedUrl: string) {
  const url = new URL(import.meta.env.VITE_RSS_PROVIDER_URL || DEFAULT_PROVIDER_URL);
  url.searchParams.set("rss_url", feedUrl);
  url.searchParams.set("count", String(MAX_ITEMS));

  if (import.meta.env.VITE_RSS2JSON_API_KEY) {
    url.searchParams.set("api_key", import.meta.env.VITE_RSS2JSON_API_KEY);
  }

  return url.toString();
}

function rawProxyRequestUrl(feedUrl: string) {
  const url = new URL(import.meta.env.VITE_RSS_RAW_PROXY_URL || DEFAULT_RAW_PROXY_URL);
  url.searchParams.set("url", feedUrl);
  return url.toString();
}

function toNewsFeedItem(item: Rss2JsonItem, index: number, feed?: Rss2JsonResponse["feed"]): NewsFeedItem {
  const source = feedSource(item, feed);

  return {
    id: item.guid || item.link || `${item.title || "feed-item"}-${index}`,
    title: decodeEntities(stripHtml(item.title || "Untitled update")),
    link: item.link || feed?.link || "#",
    source,
    sourceUrl: feed?.link,
    publishedAt: item.pubDate,
    description: decodeEntities(stripHtml(item.description || item.content || "")).slice(0, 180),
    imageUrl: itemImageUrl(item) || fallbackImage(source || "News"),
  };
}

function parseRssXml(xml: string): NewsFeedItem[] {
  const document = new DOMParser().parseFromString(xml, "text/xml");
  if (document.querySelector("parsererror")) throw new Error("RSS XML could not be parsed.");

  return Array.from(document.querySelectorAll("item")).map((item, index) => {
    const source = tagText(item, "source");
    const description = tagText(item, "description");

    return {
      id: tagText(item, "guid") || tagText(item, "link") || `${tagText(item, "title") || "feed-item"}-${index}`,
      title: tagText(item, "title") || "Untitled update",
      link: tagText(item, "link") || "#",
      source,
      sourceUrl: tagAttribute(item, "source", "url"),
      publishedAt: tagText(item, "pubDate"),
      description: stripHtml(description).slice(0, 180),
      imageUrl: xmlItemImageUrl(item, description) || fallbackImage(source || "News"),
    };
  });
}

function xmlItemImageUrl(item: Element, description: string) {
  const enclosure = firstTag(item, "enclosure");
  const enclosureType = enclosure?.getAttribute("type") || "";

  if (enclosureType.startsWith("image/")) return enclosure?.getAttribute("url") || "";

  return (
    firstTag(item, "media:content")?.getAttribute("url") ||
    firstTag(item, "media:thumbnail")?.getAttribute("url") ||
    imageFromHtml(description)
  );
}

function tagText(item: Element, tagName: string) {
  return firstTag(item, tagName)?.textContent?.trim() || "";
}

function tagAttribute(item: Element, tagName: string, attribute: string) {
  return firstTag(item, tagName)?.getAttribute(attribute) || "";
}

function firstTag(item: Element, tagName: string) {
  return item.getElementsByTagName(tagName)[0];
}

function feedSource(item: Rss2JsonItem, feed?: Rss2JsonResponse["feed"]) {
  const fromTitle = item.title?.match(/\s-\s([^-]+)$/)?.[1]?.trim();
  return item.author || fromTitle || feed?.title;
}

function itemImageUrl(item: Rss2JsonItem) {
  if (item.thumbnail) return item.thumbnail;
  if (item.enclosure?.type?.startsWith("image/")) return item.enclosure.link || "";
  if (item.enclosure?.thumbnail) return item.enclosure.thumbnail;
  return imageFromHtml(item.description || item.content || "");
}

function imageFromHtml(value: string) {
  return value.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || "";
}

function publishedTimestamp(item: NewsFeedItem) {
  const timestamp = item.publishedAt ? new Date(item.publishedAt).getTime() : 0;
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function cacheKey(feedUrl: string) {
  let hash = 0;
  for (let index = 0; index < feedUrl.length; index += 1) {
    hash = (hash * 31 + feedUrl.charCodeAt(index)) >>> 0;
  }
  return `pia:rss:${hash.toString(16)}`;
}

function readCachedFeed(feedUrl: string): CachedFeed | undefined {
  try {
    const raw = window.localStorage.getItem(cacheKey(feedUrl));
    return raw ? (JSON.parse(raw) as CachedFeed) : undefined;
  } catch {
    return undefined;
  }
}

function writeCachedFeed(feedUrl: string, items: NewsFeedItem[]) {
  try {
    window.localStorage.setItem(cacheKey(feedUrl), JSON.stringify({ fetchedAt: Date.now(), items }));
  } catch {
    // Cache storage can be unavailable in private browsing or strict privacy modes.
  }
}

function minutesEnv(name: string, fallback: number) {
  const parsed = Number.parseInt(import.meta.env[name] || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function fallbackImage(label: string) {
  return `https://placehold.co/320x240/15386f/ffffff?text=${encodeURIComponent(label.slice(0, 24))}`;
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}
