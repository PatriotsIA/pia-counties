import { expect, it } from "vitest";
import { ads } from "../../src/data/ads";
import { counties } from "../../src/data/counties";
import { gopConnectPartner, GOPCONNECT_AD_ID } from "../../src/data/gopconnect";
import { parallelPartners } from "../../src/data/parallel-partners";
import { resolveAdsForSlot } from "../../src/lib/ads";

it("includes GOPConnect nationwide while keeping the previous county sponsors", () => {
  const ad = ads.find((entry) => entry.id === GOPCONNECT_AD_ID)!;
  expect(ad.targeting.countyKeys).toBeUndefined();
  expect(ad.targeting.stateSlugs).toBeUndefined();
  expect(ad.href).toBe("https://mylocalgop.com/");
  expect(gopConnectPartner.href).toBe("https://mylocalgop.com/");
  for (const route of ["home", "state"] as const) {
    expect(resolveAdsForSlot({ route, slot: "site-inline", limit: 3 }).filter((entry) => entry.id === GOPCONNECT_AD_ID)).toEqual([ad]);
  }
  expect(counties).toHaveLength(3143);
  for (const county of counties) {
    const key = `${county.state.slug}/${county.slug}`;
    const localCount = parallelPartners.filter((partner) => partner.countyKeys.includes(key)).length;
    const context = { route: "county" as const, county, page: "home" as const, slot: "county-home-inline" as const };
    const resolved = resolveAdsForSlot({ ...context, limit: 9 + localCount });
    expect(resolved.filter((entry) => entry.id === GOPCONNECT_AD_ID)).toHaveLength(1);
    const baseline = resolveAdsForSlot({ ...context, limit: 8 + localCount, catalog: ads.filter((entry) => entry.id !== GOPCONNECT_AD_ID) });
    expect(resolved.filter((entry) => entry.id !== GOPCONNECT_AD_ID).map((entry) => entry.id).sort()).toEqual(baseline.map((entry) => entry.id).sort());
  }
});
