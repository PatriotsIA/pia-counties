import type { CountyPageKey } from "./counties";
import america250AdImage from "../../NewAds/Banner-America250-Large.jpg";
import america250AdImageSmall from "../../NewAds/Banner-America250-Small.jpg";
import brownGmcAdImage from "../../NewAds/BrownGMC-250.jpg";
import canyonRidgeAdImage from "../../NewAds/CanyonRidge250.jpg";
import catchingsAdImage from "../../NewAds/Catchings250.jpg";
import cbt4AdImage from "../../NewAds/CBT4.jpg";
import dyersAdImage from "../../NewAds/Dyers250.jpg";
import joinPiaAdImage from "../../NewAds/JoinPIALarge.jpg";
import joinPiaAdImageSmall from "../../NewAds/JoinPIASm.jpg";
import lemc250AdImage from "../../NewAds/LEMC250.jpg";
import lemcAdImage from "../../NewAds/LEMC980.jpg";
import mattressBannerAdImage from "../../NewAds/matress-ad.jpg";
import merchAdImage from "../../NewAds/Merch.jpg";
import monaSalazarAdImage from "../../NewAds/MonaSalazar.jpg";
import monaSalazarAdImageSmall from "../../NewAds/MonaSalazarSm.jpg";
import papaMurphysAdImage from "../../NewAds/PapaMurphys250.jpg";
import panhandleGreenhouseAdImage from "../../NewAds/PanhandleGreenhouse250.jpg";
import pastureExchangeAdImage from "../../NewAds/Pasture-Exchange980.jpg";
import pastureExchangeLogoAdImage from "../../NewAds/PastureEXCHANGELogo.jpg";
import patriotMessagingAdImage from "../../NewAds/PatriotMessaging 2.jpg";
import patriotTrailerStoreAdImage from "../../NewAds/PatriotTrailerStore.jpg";
import plainsBankAdImage from "../../NewAds/PlainsBank250.jpg";
import trailerLargeAdImage from "../../NewAds/TrailerLarge.jpg";

export type AdSlotId =
  | "county-home-inline"
  | "county-calendar-inline"
  | "county-news-inline"
  | "county-page-footer"
  | "site-footer";

export type AdPlacement = "leaderboard" | "inline" | "compact";
export type AdDisplayMode = "card" | "image-only";

export const adClickHint = "Clickable ad, opens in new tab";

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
    id: "lemc-county-home-2026",
    campaignId: "pia-county-sponsors",
    sponsor: "LEMC Realty",
    title: "LEMC Realty",
    body: "Find Amarillo and Canyon area rental homes, apartments, and property management services.",
    cta: "View Rentals",
    href: "https://www.331-rent.com/",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: lemc250AdImage,
      mobile: lemc250AdImage,
      alt: "LEMC Realty",
    },
    priority: 110,
    active: true,
    targeting: {
      slots: ["county-home-inline"],
      routes: ["county", "home"],
      pages: ["home"],
    },
  },
  {
    id: "cbt-county-home-2026",
    campaignId: "pia-county-sponsors",
    sponsor: "CBT Real Estate Services",
    title: "CBT Real Estate Services",
    body: "Connect with local Patriots in Action partners.",
    cta: "View Partner",
    href: "https://www.facebook.com/CBTRealEstateServices/",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: cbt4AdImage,
      mobile: cbt4AdImage,
      alt: "CBT Real Estate Services",
    },
    priority: 109,
    active: true,
    targeting: {
      slots: ["county-home-inline"],
      routes: ["county", "home"],
      pages: ["home"],
    },
  },
  {
    id: "panhandle-greenhouse-county-home-2026",
    campaignId: "pia-county-sponsors",
    sponsor: "Panhandle Greenhouse",
    title: "Panhandle Greenhouse",
    body: "Connect with local Patriots in Action partners.",
    cta: "View Partner",
    href: "/partners",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: panhandleGreenhouseAdImage,
      mobile: panhandleGreenhouseAdImage,
      alt: "Panhandle Greenhouse",
    },
    priority: 108,
    active: true,
    targeting: {
      slots: ["county-home-inline"],
      routes: ["county", "home"],
      pages: ["home"],
    },
  },
  {
    id: "plains-bank-county-home-2026",
    campaignId: "pia-county-sponsors",
    sponsor: "Plains Bank",
    title: "Plains Bank",
    body: "Connect with local Patriots in Action partners.",
    cta: "View Partner",
    href: "/partners",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: plainsBankAdImage,
      mobile: plainsBankAdImage,
      alt: "Plains Bank",
    },
    priority: 107,
    active: true,
    targeting: {
      slots: ["county-home-inline"],
      routes: ["county", "home"],
      pages: ["home"],
    },
  },
  {
    id: "patriot-messaging-county-home-2026",
    campaignId: "pia-county-sponsors",
    sponsor: "Patriot Dispatch",
    title: "Patriot Dispatch",
    body: "Connect with local Patriots in Action partners.",
    cta: "Get Updates",
    href: "https://patriotsforaction.org/messaging",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: patriotMessagingAdImage,
      mobile: patriotMessagingAdImage,
      alt: "Patriot Dispatch",
    },
    priority: 106,
    active: true,
    targeting: {
      slots: ["county-home-inline"],
      routes: ["county", "home"],
      pages: ["home"],
    },
  },
  {
    id: "pasture-exchange-logo-county-home-2026",
    campaignId: "pia-county-sponsors",
    sponsor: "Pasture Exchange",
    title: "Pasture Exchange",
    body: "Connect with local Patriots in Action partners.",
    cta: "View Partner",
    href: "/partners",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: pastureExchangeLogoAdImage,
      mobile: pastureExchangeLogoAdImage,
      alt: "Pasture Exchange",
    },
    priority: 105,
    active: true,
    targeting: {
      slots: ["county-home-inline"],
      routes: ["county", "home"],
      pages: ["home"],
    },
  },
  {
    id: "dyers-county-home-2026",
    campaignId: "pia-county-sponsors",
    sponsor: "Dyer's Bar-B-Que",
    title: "Dyer's Bar-B-Que",
    body: "Connect with local Patriots in Action partners.",
    cta: "View Partner",
    href: "/partners",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: dyersAdImage,
      mobile: dyersAdImage,
      alt: "Dyer's Bar-B-Que",
    },
    priority: 104,
    active: true,
    targeting: {
      slots: ["county-home-inline"],
      routes: ["county", "home"],
      pages: ["home"],
    },
  },
  {
    id: "patriot-trailer-store-county-home-2026",
    campaignId: "pia-county-sponsors",
    sponsor: "Patriot Trailer Store",
    title: "Patriot Trailer Store",
    body: "Connect with local Patriots in Action partners.",
    cta: "Find Events",
    href: "https://piaevents.com/",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: patriotTrailerStoreAdImage,
      mobile: patriotTrailerStoreAdImage,
      alt: "Patriot Trailer Store",
    },
    priority: 103,
    active: true,
    targeting: {
      slots: ["county-home-inline"],
      routes: ["county", "home"],
      pages: ["home"],
    },
  },
  {
    id: "merch-county-home-2026",
    campaignId: "pia-county-sponsors",
    sponsor: "The Patriot Merch Store",
    title: "The Patriot Merch Store",
    body: "Connect with local Patriots in Action partners.",
    cta: "Shop Merch",
    href: "https://shop.patriotsinaction.com/",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: merchAdImage,
      mobile: merchAdImage,
      alt: "The Patriot Merch Store",
    },
    priority: 102,
    active: true,
    targeting: {
      slots: ["county-home-inline"],
      routes: ["county", "home"],
      pages: ["home"],
    },
  },
  {
    id: "brown-gmc-county-home-2026",
    campaignId: "pia-county-sponsors",
    sponsor: "Brown GMC",
    title: "Brown GMC",
    body: "Connect with local Patriots in Action partners.",
    cta: "View Partner",
    href: "/partners",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: brownGmcAdImage,
      mobile: brownGmcAdImage,
      alt: "Brown GMC",
    },
    priority: 100,
    active: true,
    targeting: {
      slots: ["county-home-inline"],
      routes: ["county", "home"],
      pages: ["home"],
    },
  },
  {
    id: "catchings-county-home-2026",
    campaignId: "pia-county-sponsors",
    sponsor: "Catchings",
    title: "Catchings",
    body: "Connect with local Patriots in Action partners.",
    cta: "View Partner",
    href: "/partners",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: catchingsAdImage,
      mobile: catchingsAdImage,
      alt: "Catchings",
    },
    priority: 99,
    active: true,
    targeting: {
      slots: ["county-home-inline"],
      routes: ["county", "home"],
      pages: ["home"],
    },
  },
  {
    id: "papa-murphys-county-home-2026",
    campaignId: "pia-county-sponsors",
    sponsor: "Papa Murphy's",
    title: "Papa Murphy's",
    body: "Connect with local Patriots in Action partners.",
    cta: "View Partner",
    href: "/partners",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: papaMurphysAdImage,
      mobile: papaMurphysAdImage,
      alt: "Papa Murphy's",
    },
    priority: 97,
    active: true,
    targeting: {
      slots: ["county-home-inline"],
      routes: ["county", "home"],
      pages: ["home"],
    },
  },
  {
    id: "canyon-ridge-county-home-2026",
    campaignId: "pia-county-sponsors",
    sponsor: "Canyon Ridge",
    title: "Canyon Ridge",
    body: "Connect with local Patriots in Action partners.",
    cta: "View Partner",
    href: "/partners",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: canyonRidgeAdImage,
      mobile: canyonRidgeAdImage,
      alt: "Canyon Ridge",
    },
    priority: 98,
    active: true,
    targeting: {
      slots: ["county-home-inline"],
      routes: ["county", "home"],
      pages: ["home"],
    },
  },
  {
    id: "lemc-news-inline-2026",
    campaignId: "pia-community-partners",
    sponsor: "LEMC Realty",
    title: "LEMC Realty",
    body: "Find Amarillo and Canyon area rental homes, apartments, and property management services.",
    cta: "View Rentals",
    href: "https://www.331-rent.com/",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: lemc250AdImage,
      mobile: lemc250AdImage,
      alt: "LEMC Realty",
    },
    priority: 100,
    active: true,
    targeting: {
      slots: ["county-news-inline", "county-calendar-inline"],
      routes: ["county"],
      pages: ["home", "news", "events", "tv", "contact"],
    },
  },
  {
    id: "america-250-logo-2026",
    campaignId: "pia-house-trailer-store",
    sponsor: "Patriot Trailer Store",
    title: "Visit the Patriot Trailer Store",
    body: "Find Patriots in Action events and shop gear for showing up locally.",
    cta: "Find Events",
    href: "https://piaevents.com/",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: patriotTrailerStoreAdImage,
      mobile: patriotTrailerStoreAdImage,
      alt: "Patriot Trailer Store",
    },
    priority: 99,
    active: true,
    targeting: {
      slots: ["county-news-inline", "county-calendar-inline"],
      routes: ["county"],
      pages: ["home", "news", "events", "tv", "contact"],
    },
  },
  {
    id: "join-pia-news-inline-2026",
    campaignId: "pia-house-dispatch",
    sponsor: "Patriot Dispatch",
    title: "Stay connected with Patriot Dispatch",
    body: "Get updates and resources for local action from Patriots in Action.",
    cta: "Get Updates",
    href: "https://patriotsforaction.org/messaging",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: patriotMessagingAdImage,
      mobile: patriotMessagingAdImage,
      alt: "Patriot Dispatch",
    },
    priority: 97,
    active: true,
    targeting: {
      slots: ["county-news-inline", "county-calendar-inline"],
      routes: ["county"],
      pages: ["home", "news", "events", "tv", "contact"],
    },
  },
  {
    id: "plains-bank-news-inline-2026",
    campaignId: "pia-community-partners",
    sponsor: "Plains Bank",
    title: "Plains Bank",
    body: "Connect with local Patriots in Action partners.",
    cta: "View Partner",
    href: "/partners",
    placement: "compact",
    display: "image-only",
    image: {
      desktop: plainsBankAdImage,
      mobile: plainsBankAdImage,
      alt: "Plains Bank",
    },
    priority: 96,
    active: true,
    targeting: {
      slots: ["county-news-inline", "county-calendar-inline"],
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
      slots: ["county-page-footer"],
      routes: ["county"],
      countyKeys: ["texas/potter", "texas/randall"],
      pages: ["home", "about", "events", "news", "tv", "contact", "partners"],
    },
  },
  {
    id: "mattress-banner-2026",
    campaignId: "pia-community-partners",
    sponsor: "Mattress By Appointment",
    title: "Mattress By Appointment",
    body: "Shop local mattress deals by appointment.",
    cta: "View Partner",
    href: "/partners",
    placement: "leaderboard",
    display: "image-only",
    image: {
      desktop: mattressBannerAdImage,
      mobile: mattressBannerAdImage,
      alt: "Mattress By Appointment",
    },
    priority: 94,
    active: true,
    targeting: {
      slots: ["county-page-footer", "site-footer"],
      routes: ["county", "home", "directory", "tv", "rewards", "partners", "contact"],
      pages: ["home", "about", "events", "news", "tv", "contact", "partners"],
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
      routes: ["county", "home", "directory", "tv", "rewards", "partners", "contact"],
      pages: ["home", "about", "events", "news", "tv", "contact", "partners"],
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
      desktop: "/ads/PATRIOTREWARDS.jpg",
      mobile: "/ads/PATRIOTREWARDS.jpg",
      alt: "Patriot Rewards partner offers",
    },
    priority: 74,
    active: true,
    targeting: {
      slots: ["county-news-inline", "county-calendar-inline"],
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
      slots: ["county-news-inline", "county-calendar-inline"],
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
      slots: ["county-news-inline", "county-calendar-inline", "county-page-footer"],
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
