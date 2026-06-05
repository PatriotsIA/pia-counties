import { ads, type AdCreative, type AdSlotId } from "../data/ads";
import type { CountyPageKey, CountySite } from "../data/counties";

export type AdRouteType = "home" | "directory" | "state" | "county" | "tv" | "rewards" | "partners" | "contact" | "static";

export type AdContext = {
  route: AdRouteType;
  county?: CountySite;
  page?: CountyPageKey;
  now?: Date;
};

export type ResolveAdsOptions = AdContext & {
  slot: AdSlotId;
  limit?: number;
  catalog?: AdCreative[];
};

export const SPONSOR_ADS_ENABLED = true;

export function resolveAdsForSlot({ slot, limit = 1, catalog = ads, ...context }: ResolveAdsOptions) {
  if (!SPONSOR_ADS_ENABLED) return [];

  return catalog
    .filter((ad) => isAdEligible(ad, slot, context))
    .sort((first, second) => second.priority - first.priority || first.id.localeCompare(second.id))
    .slice(0, limit);
}

export function resolveAdsByIds(adIds: string[], catalog = ads) {
  if (!SPONSOR_ADS_ENABLED) return [];

  const adsById = new Map(catalog.filter((ad) => ad.active).map((ad) => [ad.id, ad]));
  return adIds.map((id) => adsById.get(id)).filter((ad): ad is AdCreative => Boolean(ad));
}

export function isAdEligible(ad: AdCreative, slot: AdSlotId, context: AdContext) {
  if (!ad.active) return false;
  if (!ad.targeting.slots.includes(slot)) return false;
  if (!isWithinAdSchedule(ad, context.now || new Date())) return false;

  const { county, page, route } = context;
  const countyKey = county ? `${county.state.slug}/${county.slug}` : undefined;

  if (ad.targeting.routes?.length && !ad.targeting.routes.includes(route)) return false;
  if (route === "county" && ad.targeting.pages?.length && (!page || !ad.targeting.pages.includes(page))) return false;
  if (ad.targeting.stateSlugs?.length && (!county || !ad.targeting.stateSlugs.includes(county.state.slug))) return false;
  if (ad.targeting.countyKeys?.length && (!countyKey || !ad.targeting.countyKeys.includes(countyKey))) return false;

  return true;
}

function isWithinAdSchedule(ad: AdCreative, now: Date) {
  const startsAt = ad.startsAt ? new Date(ad.startsAt) : undefined;
  const endsAt = ad.endsAt ? new Date(ad.endsAt) : undefined;

  if (startsAt && !Number.isNaN(startsAt.getTime()) && now < startsAt) return false;
  if (endsAt && !Number.isNaN(endsAt.getTime()) && now > endsAt) return false;

  return true;
}
