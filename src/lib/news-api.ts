import type { CountyFeedKind } from "./county-feed-urls";

export type NewsScope = { stateSlug: string; countySlug?: string };
export const newsTopics = {
  localNews: "general",
  localSports: "sports",
  localVideo: "general",
  obituaries: "obituaries",
  elections: "politics",
  bondIssues: "municipal-bonds",
  countyMoney: "budgets-levies",
  propertyTaxes: "property-taxes",
} as const satisfies Record<CountyFeedKind, string>;
export type NewsTopic = typeof newsTopics[CountyFeedKind];
export type NewsItem = {
  id: string;
  title: string;
  link: string;
  source?: string;
  description?: string;
  imageUrl?: string;
  publishedAt?: string;
  mediaType?: "article" | "video" | "podcast";
};
export type NewsFeed = {
  scope: { level: string; stateSlug: string; countySlug?: string };
  topic: NewsTopic;
  items: NewsItem[];
  meta: { fetchedAt: string; cacheTtlSeconds: number; sourcesUsed: string[]; hasMore?: boolean };
};
export type NewsResult = { feed: NewsFeed; stale: boolean };
type CacheEntry = { savedAt: number; feed: NewsFeed };

const baseUrl = String(import.meta.env.VITE_NEWS_API_URL || "").trim().replace(/\/+$/, "");
const memory = new Map<string, CacheEntry>();
const pending = new Map<string, Promise<NewsResult>>();
const MAX_CACHE_ENTRIES = 64;
const MAX_STALE_MS = 24 * 60 * 60_000;
const STORAGE_PREFIX = "pia:county-post:v1:";

export function newsApiIsConfigured() { return Boolean(baseUrl); }

export function newsFeedPath(scope: NewsScope, topic: NewsTopic) {
  const state = encodeURIComponent(scope.stateSlug);
  return scope.countySlug
    ? `/v1/feeds/counties/${state}/${encodeURIComponent(scope.countySlug)}/${topic}`
    : `/v1/feeds/states/${state}/${topic}`;
}

export function newsFeedUrl(scope: NewsScope, topic: NewsTopic, limit = 40) {
  if (!baseUrl) throw new Error("News service is not configured.");
  return `${baseUrl}${newsFeedPath(scope, topic)}?limit=${Math.min(200, Math.max(1, limit))}`;
}

function safeUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try { return /^https?:$/.test(new URL(value).protocol); } catch { return false; }
}

export function validateNewsFeed(value: unknown, scope: NewsScope, topic: NewsTopic): NewsFeed {
  const feed = value as NewsFeed | undefined;
  if (!feed || !Array.isArray(feed.items) || feed.topic !== topic ||
      feed.scope?.level !== (scope.countySlug ? "county" : "state") ||
      feed.scope.stateSlug !== scope.stateSlug || feed.scope.countySlug !== scope.countySlug ||
      !Number.isFinite(Date.parse(feed.meta?.fetchedAt)) ||
      !Array.isArray(feed.meta?.sourcesUsed) || !feed.meta.sourcesUsed.every((source) => typeof source === "string")) {
    throw new Error("News service returned an invalid feed.");
  }
  const seen = new Set<string>();
  return { ...feed, items: feed.items.filter((item) => {
    if (!item || typeof item.title !== "string" || !item.title.trim() || !safeUrl(item.link) || seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  }).map((item) => ({
    ...item,
    id: typeof item.id === "string" ? item.id : item.link,
    source: typeof item.source === "string" ? item.source : undefined,
    description: typeof item.description === "string" ? item.description : undefined,
    publishedAt: typeof item.publishedAt === "string" ? item.publishedAt : undefined,
    imageUrl: safeUrl(item.imageUrl) ? item.imageUrl : undefined,
  })) };
}

function readCache(url: string, scope: NewsScope, topic: NewsTopic): CacheEntry | undefined {
  try {
    const entry = memory.get(url) || JSON.parse(localStorage.getItem(STORAGE_PREFIX + url) || "null") as CacheEntry | null;
    if (!entry || !Number.isFinite(entry.savedAt) || Date.now() - entry.savedAt < 0 || Date.now() - entry.savedAt > MAX_STALE_MS) return;
    return { savedAt: entry.savedAt, feed: validateNewsFeed(entry.feed, scope, topic) };
  } catch { return; }
}

function isFresh(entry: CacheEntry) {
  const ttl = entry.feed.items.length ? Math.min(300, Math.max(30, entry.feed.meta.cacheTtlSeconds || 300)) : 30;
  return Date.now() - entry.savedAt < ttl * 1000;
}

export function cachedNewsFeed(scope: NewsScope, topic: NewsTopic, limit = 40): NewsResult | undefined {
  if (!baseUrl) return;
  const entry = readCache(newsFeedUrl(scope, topic, limit), scope, topic);
  return entry ? { feed: entry.feed, stale: !isFresh(entry) } : undefined;
}

function saveCache(url: string, feed: NewsFeed) {
  const entry = { savedAt: Date.now(), feed };
  memory.delete(url);
  memory.set(url, entry);
  while (memory.size > MAX_CACHE_ENTRIES) memory.delete(memory.keys().next().value!);
  try {
    localStorage.setItem(STORAGE_PREFIX + url, JSON.stringify(entry));
    const keys = Object.keys(localStorage).filter((key) => key.startsWith(STORAGE_PREFIX));
    if (keys.length > MAX_CACHE_ENTRIES) {
      keys.sort((a, b) => Number(JSON.parse(localStorage.getItem(a) || "{}").savedAt || 0) - Number(JSON.parse(localStorage.getItem(b) || "{}").savedAt || 0));
      keys.slice(0, keys.length - MAX_CACHE_ENTRIES).forEach((key) => localStorage.removeItem(key));
    }
  } catch { /* Storage can be full or disabled; memory caching still works. */ }
}

export async function fetchNewsFeed(scope: NewsScope, topic: NewsTopic, limit = 40, refresh = false): Promise<NewsResult> {
  const url = newsFeedUrl(scope, topic, limit);
  const cached = readCache(url, scope, topic);
  if (!refresh && cached && isFresh(cached)) return { feed: cached.feed, stale: false };
  const existing = pending.get(url);
  if (existing) return existing;
  const request = (async () => {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(45_000), headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`News service is unavailable (${response.status}).`);
      const feed = validateNewsFeed(await response.json(), scope, topic);
      if (feed.meta.sourcesUsed?.includes("error:page-section")) throw new Error("News service could not load this topic.");
      saveCache(url, feed);
      return { feed, stale: false };
    } catch (error) {
      if (cached?.feed.items.length) return { feed: cached.feed, stale: true };
      throw error;
    } finally { pending.delete(url); }
  })();
  pending.set(url, request);
  return request;
}
