import type { CountySite } from "../data/counties";
import { stateNewsHubs, type StateNewsHub } from "../data/state-news-hubs";

type CountyCentroid = {
  latitude: number;
  longitude: number;
};

type TigerWebCountyResponse = {
  features?: Array<{
    attributes?: {
      INTPTLAT?: string;
      INTPTLON?: string;
      CENTLAT?: string;
      CENTLON?: string;
    };
  }>;
};

const marketCache = new Map<string, string>();

export async function resolveNewsMarketCity(county: CountySite): Promise<string> {
  const cacheKey = `${county.state.slug}/${county.slug}`;
  const cached = marketCache.get(cacheKey) || readCachedMarketCity(cacheKey);
  if (cached) {
    marketCache.set(cacheKey, cached);
    return cached;
  }

  if (county.primaryCity) {
    cacheMarketCity(cacheKey, county.primaryCity);
    return county.primaryCity;
  }

  const hubs = stateNewsHubs[county.state.slug] || [];
  if (!hubs.length) {
    cacheMarketCity(cacheKey, county.state.name);
    return county.state.name;
  }

  if (hubs.length === 1) {
    cacheMarketCity(cacheKey, hubs[0].city);
    return hubs[0].city;
  }

  try {
    const centroid = await fetchCountyCentroid(county);
    const nearest = nearestHub(centroid, hubs);
    cacheMarketCity(cacheKey, nearest.city);
    return nearest.city;
  } catch {
    cacheMarketCity(cacheKey, hubs[0].city);
    return hubs[0].city;
  }
}

function nearestHub(centroid: CountyCentroid, hubs: StateNewsHub[]) {
  return hubs.reduce((closest, hub) => {
    const closestDistance = haversineMiles(centroid.latitude, centroid.longitude, closest.latitude, closest.longitude);
    const hubDistance = haversineMiles(centroid.latitude, centroid.longitude, hub.latitude, hub.longitude);
    return hubDistance < closestDistance ? hub : closest;
  });
}

async function fetchCountyCentroid(county: CountySite): Promise<CountyCentroid> {
  const stateFips = county.fips.slice(0, 2);
  const countyFips = county.fips.slice(2);
  const params = new URLSearchParams({
    where: `STATE='${stateFips}' AND COUNTY='${countyFips}'`,
    outFields: "INTPTLAT,INTPTLON,CENTLAT,CENTLON",
    returnGeometry: "false",
    f: "json",
  });
  const response = await fetch(
    `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer/82/query?${params.toString()}`,
  );
  if (!response.ok) throw new Error("County coordinate request failed");

  const data = (await response.json()) as TigerWebCountyResponse;
  const attributes = data.features?.[0]?.attributes;
  const latitude = Number(attributes?.INTPTLAT || attributes?.CENTLAT);
  const longitude = Number(attributes?.INTPTLON || attributes?.CENTLON);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("No county coordinates found");
  }

  return { latitude, longitude };
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function marketCacheStorageKey(countyKey: string) {
  return `pia-news-market:v1:${countyKey}`;
}

function readCachedMarketCity(countyKey: string) {
  try {
    return window.localStorage.getItem(marketCacheStorageKey(countyKey)) || undefined;
  } catch {
    return undefined;
  }
}

function cacheMarketCity(countyKey: string, city: string) {
  marketCache.set(countyKey, city);
  try {
    window.localStorage.setItem(marketCacheStorageKey(countyKey), city);
  } catch {
    // Storage may be unavailable in private browsing.
  }
}
