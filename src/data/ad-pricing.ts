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
    monthly: 95,
    yearly: 950,
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
    monthly: 95,
    yearly: 950,
    includes: ["Patriot Rewards membership", "Clickable county partner listing", "Business logo and ad image"],
  },
  {
    name: "County Gold Partner",
    monthly: 295,
    yearly: 2950,
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

export const adAssetDeliveryInstructions =
  "Please email your ad asset(s) to erik@patriotsinaction.com. 250x250px for regular ad spots, 980x300px for banners.";

export const paymentsQuotePath = "/contact";

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
  deliveryInstructions: adAssetDeliveryInstructions,
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

export type NationalPlacementPreviewSize = "hero" | "square" | "banner";

export const nationalHomepagePlacements = [
  {
    key: "national-hero-sponsor" as const,
    label: "Homepage Hero Presented By",
    previewSize: "hero" as const,
    note: "Presented by logo and link in the main homepage hero section.",
  },
  {
    key: "homepage-sponsor-carousel" as const,
    label: "Homepage Sponsor Carousel (250×250)",
    previewSize: "square" as const,
    note: "Rotating square sponsors below “From Awareness to Action” on patriotsinaction.com.",
  },
  {
    key: "site-footer" as const,
    label: "Homepage Bottom Banner Carousel (980×300)",
    previewSize: "banner" as const,
    note: "Wide banner carousel on the homepage and other top-level pages.",
  },
] as const;

export function nationalPlacementPreviewSize(key: AdPricingKey): NationalPlacementPreviewSize {
  const placement = nationalHomepagePlacements.find((item) => item.key === key);
  return placement?.previewSize ?? "square";
}

export const adjacentCountyPricingNote =
  "Advertisers can add multiple contiguous neighboring counties at half the base tier price for each additional county. Subscribe to your primary county at full price first, then add one adjacent-county subscription per extra county at 50% off. Each add-on is a separate Stripe product—never use a sitewide promotion code on checkout, or your base county would be discounted too.";

export const adjacentCountyAddOns = [
  {
    id: "adjacent-preferred",
    name: "Additional Adjacent County — Preferred",
    monthly: 22.5,
    yearly: 225,
    matchesTier: "Patriot Preferred Business Program ($95/mo base)",
  },
  {
    id: "adjacent-gold",
    name: "Additional Adjacent County — Gold",
    monthly: 147.5,
    yearly: 1475,
    matchesTier: "Gold Business Partner ($295/mo base)",
  },
  {
    id: "adjacent-platinum",
    name: "Additional Adjacent County — Platinum",
    monthly: 247.5,
    yearly: 2475,
    matchesTier: "Platinum Business Partner ($495/mo base)",
  },
  {
    id: "adjacent-county-sponsor",
    name: "Additional Adjacent County — County Sponsor",
    monthly: 497.5,
    yearly: 4975,
    matchesTier: "County Sponsor — Presented By ($995/mo base)",
  },
  {
    id: "adjacent-county-gold-founding",
    name: "Additional Adjacent County — County Gold Founding",
    monthly: 47.5,
    yearly: 475,
    matchesTier: "County Gold Partner founding ($95/mo base)",
  },
] as const;

export const pricingDiscounts = [
  { label: "Annual prepay", detail: "Brochure annual rates ($950 / $2,950 / $4,950 / $9,950) — equivalent to about two months free vs monthly." },
  { label: "Adjacent counties", detail: adjacentCountyPricingNote },
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
  { placement: "Partner directory listing", tier: "Patriot Preferred", note: "Included at $95/mo ($950/yr)." },
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
    monthly: 95,
    yearly: 950,
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
  const hasCents = !Number.isInteger(amount);
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  })}`;
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

export const stripePaymentLinks = {
  patriotPreferredMonthly: "https://buy.stripe.com/cNi8wPdy90605XGgAX6EU0e",
  patriotPreferredYearly: "https://buy.stripe.com/6oUeVd1Pr06099SdoL6EU0f",
  goldMonthly: "https://buy.stripe.com/8x28wP9hTdWQ2Lu98v6EU09",
  goldYearly: "https://buy.stripe.com/5kQbJ1eCdcSMbi02K76EU08",
  countyGoldFoundingMonthly: "https://buy.stripe.com/aFa28r2Tv5qk99SbgD6EU0a",
  countyGoldFoundingYearly: "https://buy.stripe.com/4gM4gz1Pr3ic0DmckH6EU0b",
  platinumMonthly: "https://buy.stripe.com/3cI6oHdy9cSM1Hq0BZ6EU0c",
  platinumYearly: "https://buy.stripe.com/7sYdR9dy9cSM5XGfwT6EU0d",
} as const;

export type PartnerSubscriptionTier = {
  id: string;
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  perks: readonly string[];
  placements: readonly string[];
  quoteOnly?: boolean;
  quoteLabel?: string;
  stripeMonthlyUrl?: string;
  stripeYearlyUrl?: string;
};

export const partnerSubscriptionTiers: readonly PartnerSubscriptionTier[] = [
  {
    id: "patriot-preferred",
    name: "Patriot Preferred Business Program",
    tagline: "Directory listing and Patriot Rewards entry point for local businesses.",
    monthly: 95,
    yearly: 950,
    perks: [
      "Patriot Rewards membership",
      "Clickable partner directory listing",
      "Business logo and short description",
      "Link to website or social profile",
    ],
    placements: ["Top-level and county partner pages", "Patriot Rewards eligibility"],
    stripeMonthlyUrl: stripePaymentLinks.patriotPreferredMonthly,
    stripeYearlyUrl: stripePaymentLinks.patriotPreferredYearly,
  },
  {
    id: "gold-business",
    name: "Gold Business Partner",
    tagline: "County content visibility on Weather, Obituary, and News surfaces.",
    monthly: 295,
    yearly: 2950,
    perks: [
      "Everything in Patriot Preferred",
      "Partner logo linked on key county content",
      "One primary Presented by or feed sponsorship",
      "Rotating county sponsor carousel inclusion",
    ],
    placements: [
      "Weather presented by",
      "Local Articles, Obituaries, Video, or Sports feed",
      "County sponsor carousel (250×250)",
      "Newsroom ad strip rotation",
    ],
    stripeMonthlyUrl: stripePaymentLinks.goldMonthly,
    stripeYearlyUrl: stripePaymentLinks.goldYearly,
  },
  {
    id: "platinum-business",
    name: "Platinum Business Partner",
    tagline: "Premium county visibility with banner and priority placement.",
    monthly: 495,
    yearly: 4950,
    perks: [
      "Everything in Gold",
      "Priority county sponsor carousel rotation",
      "County bottom banner carousel (980×300)",
      "Priority Weather, Obituary, and News placement",
      "County hero eligibility when bundled as founding sponsor",
    ],
    placements: [
      "County sponsor carousel priority",
      "County page bottom banner carousel",
      "Feed and weather sponsorship priority",
      "Partner directory premium listing",
    ],
    stripeMonthlyUrl: stripePaymentLinks.platinumMonthly,
    stripeYearlyUrl: stripePaymentLinks.platinumYearly,
  },
  {
    id: "county-gold",
    name: "County Gold Partner (Founding)",
    tagline: "Reduced founding rate for one county content sponsorship plus carousel.",
    monthly: 95,
    yearly: 950,
    perks: [
      "Everything in Patriot Preferred",
      "One county content element (Weather, Obituaries, Articles, Video, or Sports)",
      "County sponsor carousel rotation",
      "Founding partner recognition on county pages",
    ],
    placements: ["One county Presented by or feed", "County sponsor carousel (250×250)", "County partner card"],
    stripeMonthlyUrl: stripePaymentLinks.countyGoldFoundingMonthly,
    stripeYearlyUrl: stripePaymentLinks.countyGoldFoundingYearly,
  },
  {
    id: "county-platinum",
    name: "County Platinum Partner (Founding)",
    tagline: "Top county package with banners, carousel priority, and hero eligibility.",
    monthly: 495,
    yearly: 4950,
    perks: [
      "Everything in County Gold",
      "Priority county carousel placement",
      "County bottom banner carousel",
      "County hero Presented by eligibility",
      "Network homepage visibility when sold sitewide",
    ],
    placements: [
      "County carousel priority",
      "County bottom banner (980×300)",
      "County hero Presented by (when available)",
      "Feed and weather priority in county",
    ],
    quoteOnly: true,
  },
  {
    id: "county-sponsor",
    name: "County Sponsor — Presented By",
    tagline: "Own the County Hero Presented by placement for a specific county.",
    monthly: 995,
    yearly: 9950,
    perks: [
      "County Hero Presented by logo and link",
      "Premium above-the-fold county branding",
      "County-specific sponsor recognition",
      "Ideal for category leaders in a county",
    ],
    placements: ["County home hero Presented by", "County-specific visibility across hero messaging"],
    quoteOnly: true,
  },
  {
    id: "national-level",
    name: "National Level — Presented By",
    tagline: "Nationwide homepage hero, carousel, and bottom banner inventory.",
    monthly: 0,
    yearly: 0,
    perks: [
      "Homepage hero Presented by",
      "Homepage sponsor carousel (250×250)",
      "Homepage bottom banner carousel (980×300)",
      "Custom contract and category exclusivity options",
    ],
    placements: [
      "patriotsinaction.com homepage hero",
      "Homepage sponsor carousel",
      "Top-level bottom banner carousel",
    ],
    quoteOnly: true,
    quoteLabel: nationwidePricingLabel,
  },
] as const;

export function tierHasStripeCheckout(tier: PartnerSubscriptionTier) {
  return Boolean(tier.stripeMonthlyUrl && tier.stripeYearlyUrl && !tier.quoteOnly);
}
