import { beforeEach, describe, expect, it, vi } from "vitest";
import { counties } from "../../src/data/counties";
import { getCountyMightySpaceId } from "../../src/data/calendarFeeds";

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.stubEnv("DEV", false);
  vi.stubEnv("VITE_MIGHTY_API_BASE", "https://mighty.example/");
});

describe("Mighty events client", () => {
  it("maps every Texas county calendar to one unique Mighty space", () => {
    const texasCounties = counties.filter((county) => county.state.slug === "texas");
    const mappings = texasCounties.map((county) => ({
      county: county.slug,
      spaceId: getCountyMightySpaceId(county),
      calendarUrl: county.calendar.icsUrl,
    }));

    expect(texasCounties).toHaveLength(254);
    expect(mappings.every(({ spaceId }) => /^\d+$/.test(spaceId || ""))).toBe(true);
    expect(new Set(mappings.map(({ spaceId }) => spaceId)).size).toBe(254);
    expect(mappings.every(({ calendarUrl }) => calendarUrl?.includes("/calendar.ics"))).toBe(true);
  });

  it("loads every upstream page without browser caching or duplicate events", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({
        items: [{ id: 1, title: "First event" }],
        links: { next: "/spaces/123/events?page=2" },
      }))
      .mockResolvedValueOnce(Response.json({
        items: [{ id: 1, title: "First event" }, { id: 2, title: "Second event" }],
        links: {},
      }));
    vi.stubGlobal("fetch", fetcher);

    const { fetchSpaceEvents } = await import("../../src/lib/mighty");
    const events = await fetchSpaceEvents("123", 2);

    expect(events.map((event) => event.id)).toEqual([1, 2]);
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "https://mighty.example/spaces/123/events?page=1&per_page=2",
      { cache: "no-store" },
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "https://mighty.example/spaces/123/events?page=2&per_page=2",
      { cache: "no-store" },
    );
  });

  it("removes expired events and expands upcoming recurring occurrences", async () => {
    const { normalizeMightyEvents } = await import("../../src/lib/mighty");
    const events = normalizeMightyEvents([
      {
        id: 1,
        title: "Expired event",
        starts_at: "2026-09-01T09:00:00-05:00",
        ends_at: "2026-09-01T10:00:00-05:00",
      },
      {
        id: 2,
        title: "One-time event",
        starts_at: "2026-09-12T11:00:00-05:00",
        ends_at: "2026-09-12T12:00:00-05:00",
      },
      {
        id: 3,
        title: "Second Monday meeting",
        starts_at: "2026-04-13T09:00:00-05:00",
        ends_at: "2026-04-13T10:00:00-05:00",
        time_zone: "America/Chicago",
        frequency: "monthly",
        recurrence_rule: "FREQ=MONTHLY;INTERVAL=1;BYDAY=2MO;COUNT=10;",
      },
    ], new Date("2026-09-10T12:00:00Z"));

    expect(events.map((event) => event.title)).not.toContain("Expired event");
    expect(events[0]?.title).toBe("One-time event");
    expect(events.filter((event) => event.title === "Second Monday meeting")).toHaveLength(5);
    expect(events.find((event) => event.start.toISOString() === "2026-09-14T14:00:00.000Z")).toBeDefined();
    expect(events.find((event) => event.start.toISOString() === "2026-11-09T15:00:00.000Z")).toBeDefined();
  });
});
