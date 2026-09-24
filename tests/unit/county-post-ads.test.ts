import { expect, it } from "vitest";
import { ads } from "../../src/data/ads";
import { counties } from "../../src/data/counties";
import { COUNTY_POST_CAMPAIGN } from "../../src/data/county-post-ads";
import { parallelPartners } from "../../src/data/parallel-partners";
import { resolveAdsForSlot } from "../../src/lib/ads";

const isCountyPost = (ad: (typeof ads)[number]) => ad.campaignId === COUNTY_POST_CAMPAIGN;

it("adds both linked creatives nationally and statewide with GOPConnect between", () => {
  for (const route of ["home", "state"] as const) {
    const resolved = resolveAdsForSlot({ route, slot: "site-inline", limit: 3 });
    expect(resolved.map(isCountyPost)).toEqual([true, false, true]);
    for (const ad of resolved.filter(isCountyPost)) {
      expect(ad.href).toBe("https://thecountypost.com/");
      expect(ad.targeting.countyKeys).toBeUndefined();
      expect(ad.targeting.stateSlugs).toBeUndefined();
    }
  }
});

it("preserves every previous county sponsor and separates the new ads including carousel wrap", () => {
  const baselineCatalog = ads.filter((ad) => !isCountyPost(ad));
  expect(counties).toHaveLength(3143);
  for (const county of counties) {
    const local = parallelPartners.filter((p) => p.countyKeys.includes(`${county.state.slug}/${county.slug}`)).length;
    const context = { county, route: "county" as const, page: "home" as const, slot: "county-home-inline" as const };
    const baseline = resolveAdsForSlot({ ...context, limit: 7 + local, catalog: baselineCatalog });
    const resolved = resolveAdsForSlot({ ...context, limit: 9 + local });
    expect(resolved.filter((ad) => !isCountyPost(ad))).toEqual(baseline);
    expect(resolved.filter(isCountyPost)).toHaveLength(2);
    resolved.forEach((ad, index) => {
      expect(isCountyPost(ad) && isCountyPost(resolved[(index + 1) % resolved.length])).toBe(false);
    });
  }
});
