import { expect, it } from "vitest";
import { ads } from "../../src/data/ads";
import { counties } from "../../src/data/counties";
import { parallelPartners } from "../../src/data/parallel-partners";
import { resolveAdsForSlot } from "../../src/lib/ads";

it("serves both Parallel creatives only in Randall and Potter without displacing existing carousel sponsors", () => {
  const catalogWithoutParallel = ads.filter((ad) => !ad.id.startsWith("parallel-"));
  for (const county of counties) {
    const key = `${county.state.slug}/${county.slug}`;
    const partners = parallelPartners.filter((partner) => partner.countyKeys.includes(key));
    const expected = ["texas/randall", "texas/potter"].includes(key) ? 2 : 0;
    const context = { route: "county" as const, county, page: "home" as const };
    const carousel = resolveAdsForSlot({ ...context, slot: "county-home-inline", limit: 6 + partners.length });
    expect(carousel.filter((ad) => ad.id.startsWith("parallel-"))).toHaveLength(expected);
    expect(resolveAdsForSlot({ ...context, slot: "county-page-footer", limit: 20 }).filter((ad) => ad.id.startsWith("parallel-"))).toHaveLength(expected);
    const baseline = resolveAdsForSlot({ ...context, slot: "county-home-inline", limit: 6, catalog: catalogWithoutParallel });
    for (const ad of baseline) expect(carousel.map((entry) => entry.id)).toContain(ad.id);
  }
  for (const route of ["home", "state", "partners"] as const) {
    expect(resolveAdsForSlot({ route, slot: "site-footer", limit: 20 }).some((ad) => ad.id.startsWith("parallel-"))).toBe(false);
  }
  expect(ads.filter((ad) => ad.id.startsWith("parallel-")).every((ad) => ad.href === "https://pb-tx.com/")).toBe(true);
});
