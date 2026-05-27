import type { CountyPageKey } from "./counties";
import america250LogoAdImage from "../../NewAds/America250.jpg";
import america250AdImage from "../../NewAds/Banner-America250-Large.jpg";
import america250AdImageSmall from "../../NewAds/Banner-America250-Small.jpg";
import joinPiaAdImage from "../../NewAds/JoinPIALarge.jpg";
import joinPiaAdImageSmall from "../../NewAds/JoinPIASm.jpg";
import lemcAdImage from "../../NewAds/LEMC980.jpg";
import merchAdImage from "../../NewAds/Merch.jpg";
import monaSalazarAdImage from "../../NewAds/MonaSalazar.jpg";
import monaSalazarAdImageSmall from "../../NewAds/MonaSalazarSm.jpg";
import pastureExchangeAdImage from "../../NewAds/Pasture-Exchange980.jpg";
import trailerLargeAdImage from "../../NewAds/TrailerLarge.jpg";

export type AdSlotId =
  | "county-home-inline"
  | "county-news-inline"
  | "county-page-footer"
  | "site-footer"
  | "site-left-rail"
  | "site-right-rail";

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
  routes?: Array<"home" | "directory" | "state" | "county" | "tv" | "rewards" | "partners" | "contact" | "static">;
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
    id: "america-250-logo-2026",
    campaignId: "pia-america-250",
    sponsor: "America 250",
    title: "Celebrate America 250",
    body: "Discover patriotic resources and events for America's 250th anniversary.",
    cta: "View Partners",
    href: "https://america250.org/",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: america250LogoAdImage,
      mobile: america250LogoAdImage,
      alt: "America 250",
    },
    priority: 99,
    active: true,
    targeting: {
      slots: ["county-news-inline"],
      routes: ["county"],
      pages: ["home", "news", "events", "tv", "contact"],
    },
  },
  {
    id: "pia-tv-left-rail-2026",
    campaignId: "pia-house-tv",
    sponsor: "Patriots in Action TV",
    title: "Watch Patriots in Action TV",
    body: "Interviews, updates, and stories from Patriots in Action.",
    cta: "Watch Now",
    href: "/tv",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: "/ads/PIATVLarge.jpg",
      mobile: "/ads/PIATVSmall.jpg",
      alt: "Patriots in Action TV",
    },
    priority: 100,
    active: true,
    targeting: {
      slots: ["site-left-rail"],
      routes: ["home", "directory", "state", "county", "tv", "rewards", "partners", "contact"],
      pages: ["home", "about", "elections", "news", "events", "tv", "partners", "contact", "submit-event"],
    },
  },
  {
    id: "patriot-trailer-right-rail-2026",
    campaignId: "pia-house-trailer-store",
    sponsor: "Patriot Trailer Store",
    title: "Visit the Patriot Trailer Store",
    body: "Find Patriots in Action events and shop gear for showing up locally.",
    cta: "Find Events",
    href: "https://piaevents.com/",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: trailerLargeAdImage,
      mobile: "/ads/TrailerSmall.jpg",
      alt: "Patriot Trailer Store",
    },
    priority: 100,
    active: true,
    targeting: {
      slots: ["site-right-rail"],
      routes: ["home", "directory", "state", "county", "tv", "rewards", "partners", "contact"],
      pages: ["home", "about", "elections", "news", "events", "tv", "partners", "contact", "submit-event"],
    },
  },
  {
    id: "join-pia-news-inline-2026",
    campaignId: "pia-house-community",
    sponsor: "Patriots in Action",
    title: "Join Patriots in Action",
    body: "Connect with your county network and stay ready for local action.",
    cta: "Join Now",
    href: "https://community.patriotsinaction.com/",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: joinPiaAdImageSmall,
      mobile: joinPiaAdImageSmall,
      alt: "Join Patriots in Action",
    },
    priority: 97,
    active: true,
    targeting: {
      slots: ["county-news-inline"],
      routes: ["county"],
      pages: ["home", "news", "events", "tv", "contact"],
    },
  },
  {
    id: "join-pia-county-footer-2026",
    campaignId: "pia-house-community",
    sponsor: "Patriots in Action",
    title: "Join Patriots in Action",
    body: "Connect with your county network and stay ready for local action.",
    cta: "Join Now",
    href: "https://community.patriotsinaction.com/",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: joinPiaAdImage,
      mobile: joinPiaAdImageSmall,
      alt: "Join Patriots in Action",
    },
    priority: 93,
    active: true,
    targeting: {
      slots: ["county-page-footer"],
      routes: ["county"],
      pages: ["home", "about"],
    },
  },
  {
    id: "america-250-2026",
    campaignId: "pia-america-250",
    sponsor: "America 250",
    title: "Celebrate America 250",
    body: "Discover patriotic resources and events for America's 250th anniversary.",
    cta: "Learn More",
    href: "https://america250.org/",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: america250AdImage,
      mobile: america250AdImageSmall,
      alt: "America 250",
    },
    priority: 94,
    active: true,
    targeting: {
      slots: ["county-page-footer", "site-footer"],
      routes: ["county", "directory", "partners"],
      pages: ["elections", "partners"],
    },
  },
  {
    id: "mona-salazar-2026",
    campaignId: "pia-community-partners",
    sponsor: "Mona Salazar",
    title: "Mona Salazar",
    body: "Connect with Patriots in Action preferred partner resources.",
    cta: "View Partners",
    href: "https://patriotsinaction.com/partners",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: monaSalazarAdImage,
      mobile: monaSalazarAdImageSmall,
      alt: "Mona Salazar",
    },
    priority: 91,
    active: true,
    targeting: {
      slots: ["county-page-footer"],
      routes: ["county"],
      pages: ["news", "tv", "contact"],
    },
  },
  {
    id: "lemc-2026",
    campaignId: "pia-community-partners",
    sponsor: "LEMC Realty",
    title: "LEMC Realty",
    body: "Find Amarillo and Canyon area rental homes, apartments, and property management services.",
    cta: "View Rentals",
    href: "https://www.331-rent.com/",
    placement: "leaderboard",
    display: "image-only",
    image: {
      desktop: lemcAdImage,
      mobile: lemcAdImage,
      alt: "LEMC Realty",
    },
    priority: 96,
    active: true,
    targeting: {
      slots: ["county-page-footer", "site-footer"],
      routes: ["county", "contact"],
      pages: ["about", "events", "contact", "partners"],
    },
  },
  {
    id: "pasture-exchange-2026",
    campaignId: "pia-community-partners",
    sponsor: "Pasture Exchange",
    title: "Pasture Exchange",
    body: "Connect with Patriots in Action preferred partner resources.",
    cta: "View Partners",
    href: "/partners",
    placement: "leaderboard",
    display: "image-only",
    image: {
      desktop: pastureExchangeAdImage,
      mobile: pastureExchangeAdImage,
      alt: "Pasture Exchange",
    },
    priority: 92,
    active: true,
    targeting: {
      slots: ["county-page-footer", "site-footer"],
      routes: ["county", "home", "rewards"],
      pages: ["home", "news", "tv"],
    },
  },
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
    priority: 82,
    active: true,
    targeting: {
      slots: ["county-home-inline", "site-footer"],
      routes: ["county", "directory", "state"],
      pages: ["home"],
    },
  },
  {
    id: "cbt-real-estate-services-contact-2026",
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
    priority: 82,
    active: true,
    targeting: {
      slots: ["county-page-footer"],
      routes: ["county"],
      pages: ["contact"],
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
    priority: 58,
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
    priority: 64,
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
    priority: 74,
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
    sponsor: "The Patriot Merch Store",
    title: "Gear up for local action",
    body: "Shop patriotic apparel and resources for your county Patriot Network.",
    cta: "Shop Merch",
    href: "https://shop.patriotsinaction.com/",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: merchAdImage,
      mobile: merchAdImage,
      alt: "Shop Patriots in Action merchandise",
    },
    priority: 98,
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
      desktop: "/ads/TrailerSmall.jpg",
      mobile: "/ads/TrailerSmall.jpg",
      alt: "Patriot Trailer Store",
    },
    priority: 78,
    active: true,
    targeting: {
      slots: ["county-news-inline", "county-page-footer"],
      routes: ["county"],
      pages: ["news", "events", "contact"],
    },
  },
  {
    id: "pia-tv-2026",
    campaignId: "pia-house-tv",
    sponsor: "Patriots in Action TV",
    title: "Watch Patriots in Action TV",
    body: "Interviews, updates, and stories from Patriots in Action.",
    cta: "Watch Now",
    href: "/tv",
    placement: "leaderboard",
    display: "image-only",
    image: {
      desktop: "/ads/PIATVLarge.jpg",
      mobile: "/sponsors/pia-tv-small.jpg",
      alt: "Patriots in Action TV",
    },
    priority: 86,
    active: true,
    targeting: {
      slots: ["county-page-footer", "site-footer"],
      routes: ["county", "tv"],
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
      desktop: trailerLargeAdImage,
      mobile: "/ads/TrailerSmall.jpg",
      alt: "Patriot Trailer Store",
    },
    priority: 88,
    active: true,
    targeting: {
      slots: ["county-page-footer", "site-footer"],
      routes: ["county", "home"],
      pages: ["elections", "partners"],
    },
  },
];
