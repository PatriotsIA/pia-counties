import { beforeEach, describe, expect, it, vi } from "vitest";
import { counties, states } from "../../src/data/counties";

const scope = { stateSlug: "texas", countySlug: "potter" };
function feed(count = 1) {
  return { scope: { level: "county", ...scope }, topic: "general", items: Array.from({ length: count }, (_, i) => ({ id: String(i), title: "Amarillo school opens", link: `https://publisher.example/${i}` })), meta: { fetchedAt: new Date().toISOString(), cacheTtlSeconds: 300, sourcesUsed: ["county:primary"] } };
}

beforeEach(() => {
  vi.resetModules(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers();
  vi.stubEnv("VITE_NEWS_API_URL", "https://news.example/base/");
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) || null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) });
});

describe("shared County Post feed client", () => {
  it("maps every county and state using canonical full slugs and supported topics", async () => {
    const api = await import("../../src/lib/news-api");
    expect(counties.length).toBe(3143); expect(states.length).toBe(51);
    expect(new Set(counties.map(county => `${county.state.slug}/${county.slug}`)).size).toBe(3143);
    expect(counties.find(county => county.fips === "24510")?.slug).toBe("baltimore-city");
    for (const county of counties) for (const topic of Object.values(api.newsTopics)) {
      expect(api.newsFeedPath({ stateSlug: county.state.slug, countySlug: county.slug }, topic)).toBe(`/v1/feeds/counties/${county.state.slug}/${county.slug}/${topic}`);
    }
    for (const state of states) expect(api.newsFeedPath({ stateSlug: state.slug }, "general")).toBe(`/v1/feeds/states/${state.slug}/general`);
  });
  it("shares an in-flight request and preserves local town stories without re-filtering", async () => {
    const fetcher = vi.fn(async () => Response.json(feed())); vi.stubGlobal("fetch", fetcher);
    const api = await import("../../src/lib/news-api");
    const [a,b] = await Promise.all([api.fetchNewsFeed(scope,"general"), api.fetchNewsFeed(scope,"general")]);
    expect(fetcher).toHaveBeenCalledTimes(1); expect(a).toEqual(b); expect(a.feed.items).toHaveLength(1);
    await api.fetchNewsFeed(scope,"general"); expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://news.example/base/v1/feeds/counties/texas/potter/general?limit=40");
  });
  it("rejects a mismatched county response and unsafe article links", async () => {
    const api = await import("../../src/lib/news-api");
    expect(() => api.validateNewsFeed(feed(), { ...scope, countySlug: "randall" }, "general")).toThrow();
    const payload = feed(); payload.items[0]!.link = "javascript:alert(1)";
    expect(api.validateNewsFeed(payload, scope,"general").items).toEqual([]);
  });
  it("shows stale cached stories during outages without extending their lifetime", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(feed())));
    const api = await import("../../src/lib/news-api");
    await api.fetchNewsFeed(scope,"general"); vi.advanceTimersByTime(301_000);
    expect(api.cachedNewsFeed(scope,"general")?.stale).toBe(true);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    expect((await api.fetchNewsFeed(scope,"general")).stale).toBe(true);
    vi.advanceTimersByTime(24*60*60_000);
    await expect(api.fetchNewsFeed(scope,"general")).rejects.toThrow("offline");
  });
  it("prevents malformed publisher metadata from crashing a widget", async () => {
    const api = await import("../../src/lib/news-api");
    const payload = feed();
    const malformed = { ...payload, items: [{ ...payload.items[0], description: { text: "bad shape" }, source: 9 }] };
    expect(api.validateNewsFeed(malformed, scope, "general").items[0]?.description).toBeUndefined();
    expect(() => api.validateNewsFeed({ ...payload, meta: { ...payload.meta, sourcesUsed: {} } }, scope, "general")).toThrow("invalid feed");
  });
  it("retries empty feeds after 30 seconds and keeps unrelated feeds available", async () => {
    vi.useFakeTimers(); const fetcher = vi.fn(async () => Response.json(feed(0))); vi.stubGlobal("fetch", fetcher);
    const api = await import("../../src/lib/news-api");
    await api.fetchNewsFeed(scope,"general"); vi.advanceTimersByTime(31_000);
    await api.fetchNewsFeed(scope,"general"); expect(fetcher).toHaveBeenCalledTimes(2);
    fetcher.mockImplementationOnce(async () => new Response("Unavailable", { status: 503 }));
    await expect(api.fetchNewsFeed(scope,"sports")).rejects.toThrow();
    expect((await api.fetchNewsFeed(scope,"general")).feed.items).toEqual([]);
  });
});
