import anyCounty from "../../assets/source/county-post-any-county.png";
import noSweat from "../../assets/source/county-post-no-sweat.png";
import type { AdCreative } from "./ads";

export const COUNTY_POST_CAMPAIGN = "county-post-national-2026";

export const countyPostAds: AdCreative[] = [
  { id: "county-post-any-county-2026", image: { desktop: anyCounty, alt: "The County Post — From where you are to any county in America. Find your county and explore." } },
  { id: "county-post-no-sweat-2026", image: { desktop: noSweat, alt: "The County Post — No MSM? No Sweat. Local news and information from any county in the U.S." } },
].map((creative) => ({
  ...creative,
  campaignId: COUNTY_POST_CAMPAIGN,
  sponsor: "The County Post",
  title: "Find your county and explore",
  body: "Local news and information from across America.",
  cta: "Visit The County Post",
  href: "https://thecountypost.com/",
  placement: "compact",
  display: "image-only",
  priority: 126,
  active: true,
  targeting: { slots: ["site-inline", "county-home-inline"], routes: ["home", "state", "county"], pages: ["home"] },
}));
