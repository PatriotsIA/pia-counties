import type { AdSlotId } from "./ads";

export type AdPricingKey =
  | AdSlotId
  | "weather-sponsor"
  | "county-hero-sponsor"
  | "feed-articles"
  | "feed-obituaries"
  | "feed-video"
  | "feed-sports"
  | "feed-pia-video"
  | "calendar-presented-by"
  | "partner-directory"
  | "homepage-sponsor-carousel";

export type AdPricingTier = "Patriot Preferred" | "Gold" | "Platinum";

export type AdPricing = {
  key: AdPricingKey;
  label: string;
  monthly: number;
  yearly: number;
  tier: AdPricingTier;
};

export const brochureTiers = [
  {
    name: "Patriot Preferred Business Program",
    monthly: 45,
    yearly: 450,
    summary: "Patriot Rewards membership and clickable business directory listing.",
  },
  {
    name: "Gold Business Partner",
    monthly: 95,
    yearly: 950,
    summary: "Logo linked on Weather, Obituary, and News pages, plus Patriot Preferred membership.",
  },
  {
    name: "Platinum Business Partner",
    monthly: 495,
    yearly: 4950,
    summary: "Top-tier homepage placement, bottom banners, priority Weather/Obituary/News placement, plus Patriot Preferred membership.",
  },
] as const;

export const countyPackages = [
  {
    name: "County Patriot Preferred",
    monthly: 45,
    yearly: 450,
    includes: ["Patriot Rewards membership", "Clickable county partner listing", "Business logo and ad image"],
  },
  {
    name: "County Gold Partner",
    monthly: 95,
    yearly: 950,
    includes: [
      "Everything in Patriot Preferred",
      "One key county content sponsorship (Weather, Obituaries, Articles, Video, or Sports)",
      "Rotating county sponsor carousel inclusion",
    ],
  },
  {
    name: "County Platinum Partner",
    monthly: 495,
    yearly: 4950,
    includes: [
      "Everything in Gold",
      "Priority county sponsor carousel placement",
      "County hero sponsor eligibility",
      "Bottom banner carousel inclusion",
      "Homepage visibility when sold as a network sponsor",
    ],
  },
] as const;

export const pricingDiscounts = [
  { label: "Annual prepay", detail: "Brochure annual rates ($450 / $950 / $4,950) — equivalent to about two months free vs monthly." },
  { label: "Multi-county buy", detail: "10% off 3–5 counties; 15% off 6+ counties." },
  { label: "Multi-placement county bundle", detail: "10% off when buying 3+ elements in one county." },
  { label: "Category exclusivity", detail: "Add 25%–50% premium when one sponsor owns a business category in a geography." },
  { label: "Founding sponsor scarcity", detail: "Limit to 3–5 founding sponsors per county." },
] as const;

export const pricingAddOns = [
  { label: "Extra feed sponsorship", detail: "Add $50/mo to Gold or $100/mo to Platinum for another feed beyond the base tier." },
  { label: "Category exclusivity", detail: "25%–50% premium for one sponsor per category in a county." },
  { label: "Reporting add-on", detail: "$25–$100/mo when click/impression reporting is available." },
  { label: "Creative production", detail: "One-time setup fee if PIA creates ad art." },
] as const;

export const placementTierGuide = [
  { placement: "Partner directory listing", tier: "Patriot Preferred", note: "Included at $45/mo." },
  { placement: "Weather sponsor", tier: "Gold or Platinum", note: "Gold pricing minimum if sold standalone." },
  { placement: "Local Articles feed sponsor", tier: "Gold or Platinum", note: "Gold pricing minimum." },
  { placement: "Local Obituaries feed sponsor", tier: "Gold or Platinum", note: "Ideal for funeral, floral, hospice, estate services." },
  { placement: "County News Videos feed sponsor", tier: "Gold or Platinum", note: "Gold pricing minimum." },
  { placement: "Local Sports feed sponsor", tier: "Gold or Platinum", note: "Gold pricing minimum." },
  { placement: "PIA Video Feed sponsor", tier: "Gold or Platinum", note: "Consider Platinum if promoted sitewide." },
  { placement: "Community Calendar presented by", tier: "Gold or Platinum", note: "Venues, banks, churches, civic groups." },
  { placement: "County sponsor carousel", tier: "Gold or Platinum", note: "Priority rotation for Platinum." },
  { placement: "Homepage sponsor carousel", tier: "Platinum", note: "Included in Platinum only." },
  { placement: "Bottom banner carousel", tier: "Platinum", note: "Wide banner creatives only." },
  { placement: "County hero sponsor", tier: "Platinum", note: "Premium county-specific placement." },
  { placement: "County news ad strip", tier: "Gold or Platinum", note: "Gold rotates; Platinum gets priority." },
] as const;

const pricingByKey: Record<AdPricingKey, AdPricing> = {
  "partner-directory": {
    key: "partner-directory",
    label: "Partner Directory Listing",
    monthly: 45,
    yearly: 450,
    tier: "Patriot Preferred",
  },
  "weather-sponsor": {
    key: "weather-sponsor",
    label: "Weather Presented By",
    monthly: 95,
    yearly: 950,
    tier: "Gold",
  },
  "county-hero-sponsor": {
    key: "county-hero-sponsor",
    label: "County Hero Presented By",
    monthly: 495,
    yearly: 4950,
    tier: "Platinum",
  },
  "feed-articles": {
    key: "feed-articles",
    label: "Local Articles Feed",
    monthly: 95,
    yearly: 950,
    tier: "Gold",
  },
  "feed-obituaries": {
    key: "feed-obituaries",
    label: "Recent Obituaries Feed",
    monthly: 95,
    yearly: 950,
    tier: "Gold",
  },
  "feed-video": {
    key: "feed-video",
    label: "County News Videos Feed",
    monthly: 95,
    yearly: 950,
    tier: "Gold",
  },
  "feed-sports": {
    key: "feed-sports",
    label: "Local Sports Feed",
    monthly: 95,
    yearly: 950,
    tier: "Gold",
  },
  "feed-pia-video": {
    key: "feed-pia-video",
    label: "PIA Video Feed",
    monthly: 95,
    yearly: 950,
    tier: "Gold",
  },
  "calendar-presented-by": {
    key: "calendar-presented-by",
    label: "Community Calendar",
    monthly: 95,
    yearly: 950,
    tier: "Gold",
  },
  "homepage-sponsor-carousel": {
    key: "homepage-sponsor-carousel",
    label: "Homepage Sponsor Carousel (300×250)",
    monthly: 495,
    yearly: 4950,
    tier: "Platinum",
  },
  "county-home-inline": {
    key: "county-home-inline",
    label: "County Sponsor Carousel (300×250)",
    monthly: 95,
    yearly: 950,
    tier: "Gold",
  },
  "county-news-inline": {
    key: "county-news-inline",
    label: "Newsroom Ad Strip (300×250)",
    monthly: 95,
    yearly: 950,
    tier: "Gold",
  },
  "county-calendar-inline": {
    key: "county-calendar-inline",
    label: "Calendar Inline Sponsor",
    monthly: 95,
    yearly: 950,
    tier: "Gold",
  },
  "county-page-footer": {
    key: "county-page-footer",
    label: "Bottom Banner Carousel",
    monthly: 495,
    yearly: 4950,
    tier: "Platinum",
  },
  "site-footer": {
    key: "site-footer",
    label: "Bottom Banner Carousel",
    monthly: 495,
    yearly: 4950,
    tier: "Platinum",
  },
  "site-left-rail": {
    key: "site-left-rail",
    label: "Desktop Left Rail",
    monthly: 495,
    yearly: 4950,
    tier: "Platinum",
  },
  "site-right-rail": {
    key: "site-right-rail",
    label: "Desktop Right Rail",
    monthly: 495,
    yearly: 4950,
    tier: "Platinum",
  },
};

export function getAdPricing(key: AdPricingKey): AdPricing {
  return pricingByKey[key];
}

export function formatAdPrice(amount: number) {
  return `$${amount.toLocaleString("en-US")}`;
}

export function adSlotPricingKey(slot: AdSlotId): AdPricingKey {
  return slot;
}

export function pricingByKeyFromEntries() {
  return Object.values(pricingByKey);
}
