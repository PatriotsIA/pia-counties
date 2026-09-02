import { getCountyByState } from "@nickgraffis/us-counties";
import { buildCountyFeedUrl } from "../lib/county-feed-urls";
import { getCountyCalendarFeedUrl } from "./calendarFeeds";
import { site } from "./site";
import { getStateBySlug, stateFromAbbr, states, type StateSite } from "./states";

export type { StateSite } from "./states";
export { getStateBySlug, stateFromAbbr, states };

type UsCounty = {
  FIPS: string;
  name: string;
  state: string;
};

export type CountyPageKey =
  | "home"
  | "about"
  | "elections"
  | "candidates"
  | "news"
  | "events"
  | "tv"
  | "partners"
  | "contact"
  | "submit-event";

export type CustomBlock = {
  title: string;
  body: string;
  href?: string;
  cta?: string;
};

export type CountySite = {
  name: string;
  slug: string;
  state: StateSite;
  fips: string;
  mightySpaceId?: string;
  displayName: string;
  primaryCity?: string;
  phone?: string;
  email: string;
  heroTitle: string;
  heroSubtitle: string;
  intro: string;
  calendar: {
    icsUrl?: string;
    icsUrls?: string[];
    proxyUrl?: string;
  };
  feeds: {
    localNewsUrl: string;
    localSportsUrl: string;
    localVideoUrl: string;
    nationalNewsUrl: string;
    obituariesUrl: string;
    electionsUrl: string;
    bondIssuesUrl: string;
    countyMoneyUrl: string;
    propertyTaxesUrl: string;
  };
  links: {
    community: string;
    merch: string;
    rewards: string;
    partner: string;
    precinctMap: string;
    votingLocations: string;
    sampleBallot: string;
    registerToVote: string;
    localOfficials: string;
    stateOfficials: string;
    federalOfficials: string;
    countyParty: string;
  };
  customBlocks?: Partial<Record<CountyPageKey, CustomBlock[]>>;
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const civicResourceLinks = {
  precinctLookup: "https://www.nass.org/can-i-vote/find-your-polling-place",
  votingLocations: "https://www.nass.org/can-i-vote/find-your-polling-place",
  sampleBallot: "https://www.vote411.org/ballot",
  registerToVote: "https://www.vote.gov/register",
  localOfficials: "https://www.usa.gov/local-governments",
  stateOfficials: "https://open.pluralpolicy.com/find_your_legislator/",
  federalOfficials: "https://www.usa.gov/elected-officials",
} as const;

function createCountySite(county: UsCounty, state: StateSite): CountySite {
  const slug = slugify(county.name);
  const displayName = `${county.name} County`;
  const calendarIcsUrl = state.slug === "texas" ? getCountyCalendarFeedUrl(state.slug, slug) : undefined;

  return {
    name: county.name,
    slug,
    state,
    fips: county.FIPS,
    mightySpaceId: undefined,
    displayName,
    email: site.contact.email,
    heroTitle: `${displayName} Patriots`,
    heroSubtitle: "Making our founders proud.",
    intro:
      "Your voice matters locally and nationally. Knowing who represents you helps you stay informed, engaged, and ready to make a difference for your community and country.",
    calendar: calendarIcsUrl
      ? {
          icsUrl: calendarIcsUrl,
          proxyUrl: `/api/calendar?state=${state.slug}&county=${slug}`,
        }
      : {},
    feeds: {
      localNewsUrl: buildCountyFeedUrl("localNews", county.name, state),
      localSportsUrl: buildCountyFeedUrl("localSports", county.name, state),
      localVideoUrl: buildCountyFeedUrl("localVideo", county.name, state),
      nationalNewsUrl: site.links.nationalNews,
      obituariesUrl: buildCountyFeedUrl("obituaries", county.name, state),
      electionsUrl: buildCountyFeedUrl("elections", county.name, state),
      bondIssuesUrl: buildCountyFeedUrl("bondIssues", county.name, state),
      countyMoneyUrl: buildCountyFeedUrl("countyMoney", county.name, state),
      propertyTaxesUrl: buildCountyFeedUrl("propertyTaxes", county.name, state),
    },
    links: {
      community: site.links.community,
      merch: site.links.merch,
      rewards: site.links.rewards,
      partner: site.links.partner,
      precinctMap: civicResourceLinks.precinctLookup,
      votingLocations: civicResourceLinks.votingLocations,
      sampleBallot: civicResourceLinks.sampleBallot,
      registerToVote: `https://vote.gov/register/${state.abbr.toLowerCase()}/`,
      localOfficials: civicResourceLinks.localOfficials,
      stateOfficials: civicResourceLinks.stateOfficials,
      federalOfficials: civicResourceLinks.federalOfficials,
      countyParty: `https://www.google.com/search?q=${encodeURIComponent(`${displayName} ${state.name} political parties`)}`,
    },
  };
}

const countyOverrides: Record<string, Partial<CountySite>> = {
  "arkansas/polk": {
    primaryCity: "Mena",
  },
  "texas/potter": {
    primaryCity: "Amarillo",
    phone: "806.351.0084",
    heroTitle: "Potter County Patriots",
    mightySpaceId: "16479206",
    calendar: {
      icsUrl:
        "webcal://community.patriotsinaction.com/spaces/16479206/calendar.ics?calendar_token=AZeR0GijnuO3hSNvZjYCqEys6byc-UmmuUqEJvGMLk4",
      proxyUrl: "/api/calendar?state=texas&county=potter",
    },
    links: {
      community: site.links.community,
      merch: site.links.merch,
      rewards: site.links.rewards,
      partner: site.links.partner,
      precinctMap: "https://www.pottercountytexasvotes.gov/",
      votingLocations: "https://www.pottercountytexasvotes.gov/",
      sampleBallot: "https://www.pottercountytexasvotes.gov/",
      registerToVote: "https://www.votetexas.gov/register-to-vote/",
      localOfficials: "https://www.co.potter.tx.us/",
      stateOfficials: "https://wrm.capitol.texas.gov/",
      federalOfficials: "https://www.usa.gov/elected-officials",
      countyParty: "https://pottercountygop.com/",
    },
  },
  "texas/randall": {
    primaryCity: "Canyon",
    heroTitle: "Randall County Patriots",
    mightySpaceId: "22327304",
  },
  "texas/ector": {
    primaryCity: "Odessa",
    heroTitle: "Ector County Patriots",
    mightySpaceId: "22327334",
  },
};

function withOverrides(county: CountySite): CountySite {
  const key = `${county.state.slug}/${county.slug}`;
  const override = countyOverrides[key];
  if (!override) return county;

  return {
    ...county,
    ...override,
    calendar: { ...county.calendar, ...override.calendar },
    feeds: { ...county.feeds, ...override.feeds },
    links: { ...county.links, ...override.links },
    customBlocks: { ...county.customBlocks, ...override.customBlocks },
  };
}

export const counties = states.flatMap((state) =>
  (getCountyByState(state.name) as UsCounty[]).map((county) => withOverrides(createCountySite(county, state))),
);

const countiesByStateAndSlug = new Map(counties.map((county) => [`${county.state.slug}/${county.slug}`, county]));

export function getCounty(stateSlug?: string, countySlug?: string) {
  if (!stateSlug || !countySlug) return undefined;
  const state = getStateBySlug(stateSlug);
  if (!state) return undefined;
  return countiesByStateAndSlug.get(`${state.slug}/${countySlug.toLowerCase()}`);
}

export function getCountiesForState(stateSlug?: string) {
  const state = getStateBySlug(stateSlug);
  if (!state) return [];
  return counties.filter((county) => county.state.slug === state.slug);
}

export function getCountyCalendarFeed(stateSlug?: string, countySlug?: string) {
  return getCounty(stateSlug, countySlug)?.calendar.icsUrl;
}
