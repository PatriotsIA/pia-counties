import type { AdSlotId } from "./ads";

export type AdPricingKey =
  | AdSlotId
  | "weather-sponsor"
  | "county-hero-sponsor"
  | "national-hero-sponsor"
  | "feed-articles"
  | "feed-obituaries"
  | "feed-video"
  | "feed-sports"
  | "feed-pia-video"
  | "calendar-presented-by"
  | "partner-directory"
  | "homepage-sponsor-carousel";

export type AdPricingTier = "Patriot Preferred" | "Gold" | "Platinum" | "County Sponsor" | "National Level";

export const nationwidePricingLabel = "Contact for nationwide ad pricing";

export type AdPricing = {
  key: AdPricingKey;
  label: string;
  monthly: number;
  yearly: number;
  tier: AdPricingTier;
  quoteOnly?: boolean;
  quoteLabel?: string;
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
    monthly: 295,
    yearly: 2950,
    summary: "Partner logos linked on Weather, Obituary, and News pages, plus automatic Patriot Preferred membership.",
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

export const adAssetSpecs = {
  square: {
    size: "250×250",
    placements: "Homepage sponsor carousel, county sponsor carousel, and newsroom ad strip",
  },
  banner: {
    size: "980×300",
    placements: "Bottom banner carousel on homepage, county pages, and top-level pages",
  },
  format: "PNG",
  backgrounds: "White or transparent background",
  email: "erik@patriotsinaction.com",
} as const;

export const countyPresentedByTier = {
  name: "County Sponsor — Presented By",
  monthly: 995,
  yearly: 9950,
  summary: "County Hero Presented By sponsorship for premium county-specific visibility.",
} as const;

export const nationalPresentedByTier = {
  name: "National Level — Presented By",
  quoteLabel: nationwidePricingLabel,
  summary: "Nationwide homepage hero, sponsor carousel, and bottom banner placements for brands supporting the full Patriots in Action network.",
} as const;

export const nationalHomepagePlacements = [
  {
    key: "national-hero-sponsor" as const,
    label: "Homepage Hero Presented By",
    note: "Presented by logo and link in the main homepage hero section.",
  },
  {
    key: "homepage-sponsor-carousel" as const,
    label: "Homepage Sponsor Carousel (250×250)",
    note: "Rotating square sponsors below “From Awareness to Action” on patriotsinaction.com.",
  },
  {
    key: "site-footer" as const,
    label: "Homepage Bottom Banner Carousel (980×300)",
    note: "Wide banner carousel on the homepage and other top-level pages.",
  },
] as const;

export const pricingDiscounts = [
  { label: "Annual prepay", detail: "Brochure annual rates ($450 / $2,950 / $4,950 / $9,950) — equivalent to about two months free vs monthly." },
  { label: "Multi-county buy", detail: "Additional adjacent counties are half off." },
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
  { placement: "Partner directory listing", tier: "Patriot Preferred", note: "Included at $45/mo ($450/yr)." },
  { placement: "Weather sponsor", tier: "Gold or Platinum", note: "Gold minimum $295/mo if sold standalone." },
  { placement: "Local Articles feed sponsor", tier: "Gold or Platinum", note: "Gold minimum $295/mo." },
  { placement: "Local Obituaries feed sponsor", tier: "Gold or Platinum", note: "Ideal for funeral, floral, hospice, estate services." },
  { placement: "County News Videos feed sponsor", tier: "Gold or Platinum", note: "Gold pricing minimum." },
  { placement: "Local Sports feed sponsor", tier: "Gold or Platinum", note: "Gold pricing minimum." },
  { placement: "PIA Video Feed sponsor", tier: "Gold or Platinum", note: "Consider Platinum if promoted sitewide." },
  { placement: "Community Calendar presented by", tier: "Gold or Platinum", note: "Venues, banks, churches, civic groups." },
  { placement: "County sponsor carousel", tier: "Gold or Platinum", note: "Priority rotation for Platinum." },
  { placement: "Homepage hero presented by", tier: "National Level", note: nationwidePricingLabel },
  { placement: "Homepage sponsor carousel", tier: "National Level", note: nationwidePricingLabel },
  { placement: "Homepage bottom banner carousel", tier: "National Level", note: `${nationwidePricingLabel}; 980×300 PNG creatives.` },
  { placement: "County page bottom banner carousel", tier: "Platinum", note: "980×300 PNG banner creatives on county pages." },
  { placement: "County hero sponsor", tier: "County Sponsor", note: "$995/mo County Hero Presented By placement." },
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
    monthly: 295,
    yearly: 2950,
    tier: "Gold",
  },
  "county-hero-sponsor": {
    key: "county-hero-sponsor",
    label: "County Hero Presented By",
    monthly: 995,
    yearly: 9950,
    tier: "County Sponsor",
  },
  "national-hero-sponsor": {
    key: "national-hero-sponsor",
    label: "Homepage Hero Presented By",
    monthly: 0,
    yearly: 0,
    tier: "National Level",
    quoteOnly: true,
    quoteLabel: nationwidePricingLabel,
  },
  "feed-articles": {
    key: "feed-articles",
    label: "Local Articles Feed",
    monthly: 295,
    yearly: 2950,
    tier: "Gold",
  },
  "feed-obituaries": {
    key: "feed-obituaries",
    label: "Recent Obituaries Feed",
    monthly: 295,
    yearly: 2950,
    tier: "Gold",
  },
  "feed-video": {
    key: "feed-video",
    label: "County News Videos Feed",
    monthly: 295,
    yearly: 2950,
    tier: "Gold",
  },
  "feed-sports": {
    key: "feed-sports",
    label: "Local Sports Feed",
    monthly: 295,
    yearly: 2950,
    tier: "Gold",
  },
  "feed-pia-video": {
    key: "feed-pia-video",
    label: "PIA Video Feed",
    monthly: 295,
    yearly: 2950,
    tier: "Gold",
  },
  "calendar-presented-by": {
    key: "calendar-presented-by",
    label: "Community Calendar",
    monthly: 295,
    yearly: 2950,
    tier: "Gold",
  },
  "homepage-sponsor-carousel": {
    key: "homepage-sponsor-carousel",
    label: "Homepage Sponsor Carousel (250×250)",
    monthly: 0,
    yearly: 0,
    tier: "National Level",
    quoteOnly: true,
    quoteLabel: nationwidePricingLabel,
  },
  "county-home-inline": {
    key: "county-home-inline",
    label: "County Sponsor Carousel (250×250)",
    monthly: 295,
    yearly: 2950,
    tier: "Gold",
  },
  "county-news-inline": {
    key: "county-news-inline",
    label: "Newsroom Ad Strip (250×250)",
    monthly: 295,
    yearly: 2950,
    tier: "Gold",
  },
  "county-calendar-inline": {
    key: "county-calendar-inline",
    label: "Calendar Inline Sponsor (250×250)",
    monthly: 295,
    yearly: 2950,
    tier: "Gold",
  },
  "county-page-footer": {
    key: "county-page-footer",
    label: "Bottom Banner Carousel (980×300)",
    monthly: 495,
    yearly: 4950,
    tier: "Platinum",
  },
  "site-footer": {
    key: "site-footer",
    label: "Homepage Bottom Banner Carousel (980×300)",
    monthly: 0,
    yearly: 0,
    tier: "National Level",
    quoteOnly: true,
    quoteLabel: nationwidePricingLabel,
  },
};

const pricingInventoryExcludedKeys = new Set<AdPricingKey>([
  "site-footer",
  "homepage-sponsor-carousel",
  "national-hero-sponsor",
]);

export function getAdPricing(key: AdPricingKey): AdPricing {
  return pricingByKey[key];
}

export function formatAdPrice(amount: number) {
  return `$${amount.toLocaleString("en-US")}`;
}

export function formatPlacementPricing(pricing: AdPricing) {
  if (pricing.quoteOnly) {
    return pricing.quoteLabel || nationwidePricingLabel;
  }

  return `${formatAdPrice(pricing.monthly)}/mo · ${formatAdPrice(pricing.yearly)}/yr`;
}

export function adSlotPricingKey(slot: AdSlotId): AdPricingKey {
  return slot;
}

export function pricingByKeyFromEntries() {
  return Object.values(pricingByKey);
}

/** County and local placements for the payments page (excludes national homepage inventory). */
export function pricingInventoryPlacements() {
  return Object.values(pricingByKey).filter((placement) => !pricingInventoryExcludedKeys.has(placement.key));
}

/** National homepage placements (quote-based pricing). */
export function pricingNationalPlacements() {
  return nationalHomepagePlacements.map((placement) => getAdPricing(placement.key));
}
