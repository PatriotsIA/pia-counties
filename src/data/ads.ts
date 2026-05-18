import type { CountyPageKey } from "./counties";

export type AdSlotId =
  | "county-home-inline"
  | "county-news-inline"
  | "county-page-footer"
  | "site-footer";

export type AdPlacement = "leaderboard" | "inline" | "compact";
export type AdDisplayMode = "card" | "image-only";

export type AdImageSet = {
  desktop: string;
  mobile?: string;
  alt: string;
};

export type AdTargeting = {
  slots: AdSlotId[];
  countyKeys?: string[];
  stateSlugs?: string[];
  pages?: CountyPageKey[];
  routes?: Array<"home" | "directory" | "state" | "county" | "static">;
};

export type AdCreative = {
  id: string;
  campaignId: string;
  sponsor: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  placement: AdPlacement;
  display: AdDisplayMode;
  image: AdImageSet;
  priority: number;
  active: boolean;
  startsAt?: string;
  endsAt?: string;
  targeting: AdTargeting;
};

export const ads: AdCreative[] = [
  {
    id: "cbt-real-estate-services-2026",
    campaignId: "cbt-real-estate-services",
    sponsor: "CBT Real Estate Services",
    title: "CBT Real Estate Services",
    body: "Connect with CBT Real Estate Services for local real estate support.",
    cta: "Visit CBT Real Estate Services",
    href: "https://www.facebook.com/CBTRealEstateServices/",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: "/sponsors/pia-ad-cbt.jpg",
      mobile: "/sponsors/pia-ad-cbt.jpg",
      alt: "CBT Real Estate Services",
    },
    priority: 100,
    active: true,
    targeting: {
      slots: ["county-home-inline", "county-news-inline", "county-page-footer", "site-footer"],
    },
  },
  {
    id: "patriot-dispatch-2026",
    campaignId: "pia-house-dispatch",
    sponsor: "Patriot Dispatch",
    title: "Stay connected with Patriot Dispatch",
    body: "Get updates and resources for local action from Patriots in Action.",
    cta: "Get Updates",
    href: "https://patriotsforaction.org/messaging",
    placement: "inline",
    display: "card",
    image: {
      desktop: "/sponsors/patriot-dispatch.jpg",
      mobile: "/sponsors/patriot-dispatch.jpg",
      alt: "Patriot Dispatch",
    },
    priority: 90,
    active: true,
    targeting: {
      slots: ["county-page-footer"],
      routes: ["county"],
      pages: ["home", "about"],
    },
  },
  {
    id: "patriot-dispatch-site-footer-2026",
    campaignId: "pia-house-dispatch",
    sponsor: "Patriot Dispatch",
    title: "Stay connected with Patriot Dispatch",
    body: "Get updates and resources for local action from Patriots in Action.",
    cta: "Get Updates",
    href: "https://patriotsforaction.org/messaging",
    placement: "inline",
    display: "card",
    image: {
      desktop: "/sponsors/patriot-dispatch.jpg",
      mobile: "/sponsors/patriot-dispatch.jpg",
      alt: "Patriot Dispatch",
    },
    priority: 90,
    active: true,
    targeting: {
      slots: ["site-footer"],
      routes: ["home"],
    },
  },
  {
    id: "pia-rewards-2026",
    campaignId: "pia-house-rewards",
    sponsor: "Patriot Rewards",
    title: "Save with Patriot Rewards",
    body: "Get connected to your local patriot network, preferred partners, member benefits, and offers built for the PIA community.",
    cta: "Discover Your Patriot Rewards",
    href: "https://community.patriotsinaction.com/",
    placement: "inline",
    display: "card",
    image: {
      desktop: "/sponsors/patriot-rewards.jpg",
      mobile: "/sponsors/patriot-rewards-250.jpg",
      alt: "Patriot Rewards partner offers",
    },
    priority: 75,
    active: true,
    targeting: {
      slots: ["county-home-inline"],
      routes: ["county"],
      pages: ["home", "partners", "elections"],
    },
  },
  {
    id: "pia-merch-2026",
    campaignId: "pia-house-merch",
    sponsor: "PIA Merch Store",
    title: "Gear up for local action",
    body: "Shop patriotic apparel and resources for your county Patriot Network.",
    cta: "Shop Merch",
    href: "https://shop.patriotsinaction.com/",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: "/sponsors/patriot-merch.jpg",
      mobile: "/sponsors/patriot-merch.jpg",
      alt: "Shop Patriots in Action merchandise",
    },
    priority: 60,
    active: true,
    targeting: {
      slots: ["county-news-inline"],
      routes: ["county"],
      pages: ["home", "news", "events", "tv", "contact"],
    },
  },
  {
    id: "patriot-trailer-store-events-2026",
    campaignId: "pia-house-trailer-store",
    sponsor: "Patriot Trailer Store",
    title: "Visit the Patriot Trailer Store",
    body: "Find Patriots in Action events and shop gear for showing up locally.",
    cta: "Find Events",
    href: "https://piaevents.com/",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: "/sponsors/patriot-trailer-store.jpg",
      mobile: "/sponsors/patriot-trailer-store.jpg",
      alt: "Patriot Trailer Store",
    },
    priority: 65,
    active: true,
    targeting: {
      slots: ["county-news-inline"],
      routes: ["county"],
      pages: ["home", "news", "events", "tv", "contact"],
    },
  },
  {
    id: "pia-tv-2026",
    campaignId: "pia-house-tv",
    sponsor: "Patriots in Action TV",
    title: "Watch Patriots in Action TV",
    body: "Interviews, updates, and stories from Patriots in Action.",
    cta: "Watch Now",
    href: "https://vimeo.com/patriotsinactiontv",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: "/sponsors/pia-tv.jpg",
      mobile: "/sponsors/pia-tv-small.jpg",
      alt: "Patriots in Action TV",
    },
    priority: 80,
    active: true,
    targeting: {
      slots: ["county-page-footer"],
      routes: ["county"],
      pages: ["news", "tv"],
    },
  },
  {
    id: "patriot-trailer-store-2026",
    campaignId: "pia-house-trailer-store",
    sponsor: "Patriot Trailer Store",
    title: "Visit the Patriot Trailer Store",
    body: "Shop gear and resources for local Patriots in Action events.",
    cta: "Shop Now",
    href: "https://piaevents.com/",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: "/sponsors/patriot-trailer-store.jpg",
      mobile: "/sponsors/patriot-trailer-store.jpg",
      alt: "Patriot Trailer Store",
    },
    priority: 70,
    active: true,
    targeting: {
      slots: ["county-page-footer"],
      routes: ["county"],
      pages: ["elections", "partners"],
    },
  },
];
