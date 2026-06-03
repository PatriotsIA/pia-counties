import { getCountyByState } from "@nickgraffis/us-counties";
import { site } from "./site";

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

export type StateSite = {
  name: string;
  abbr: string;
  slug: string;
};

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
  displayName: string;
  primaryCity?: string;
  phone?: string;
  email: string;
  heroTitle: string;
  heroSubtitle: string;
  intro: string;
  calendar: {
    icsUrl?: string;
    proxyUrl?: string;
  };
  feeds: {
    localNewsUrl: string;
    localSportsUrl: string;
    localVideoUrl: string;
    nationalNewsUrl: string;
    obituariesUrl: string;
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

export const states: StateSite[] = [
  { name: "Alabama", abbr: "AL", slug: "alabama" },
  { name: "Alaska", abbr: "AK", slug: "alaska" },
  { name: "Arizona", abbr: "AZ", slug: "arizona" },
  { name: "Arkansas", abbr: "AR", slug: "arkansas" },
  { name: "California", abbr: "CA", slug: "california" },
  { name: "Colorado", abbr: "CO", slug: "colorado" },
  { name: "Connecticut", abbr: "CT", slug: "connecticut" },
  { name: "Delaware", abbr: "DE", slug: "delaware" },
  { name: "District of Columbia", abbr: "DC", slug: "district-of-columbia" },
  { name: "Florida", abbr: "FL", slug: "florida" },
  { name: "Georgia", abbr: "GA", slug: "georgia" },
  { name: "Hawaii", abbr: "HI", slug: "hawaii" },
  { name: "Idaho", abbr: "ID", slug: "idaho" },
  { name: "Illinois", abbr: "IL", slug: "illinois" },
  { name: "Indiana", abbr: "IN", slug: "indiana" },
  { name: "Iowa", abbr: "IA", slug: "iowa" },
  { name: "Kansas", abbr: "KS", slug: "kansas" },
  { name: "Kentucky", abbr: "KY", slug: "kentucky" },
  { name: "Louisiana", abbr: "LA", slug: "louisiana" },
  { name: "Maine", abbr: "ME", slug: "maine" },
  { name: "Maryland", abbr: "MD", slug: "maryland" },
  { name: "Massachusetts", abbr: "MA", slug: "massachusetts" },
  { name: "Michigan", abbr: "MI", slug: "michigan" },
  { name: "Minnesota", abbr: "MN", slug: "minnesota" },
  { name: "Mississippi", abbr: "MS", slug: "mississippi" },
  { name: "Missouri", abbr: "MO", slug: "missouri" },
  { name: "Montana", abbr: "MT", slug: "montana" },
  { name: "Nebraska", abbr: "NE", slug: "nebraska" },
  { name: "Nevada", abbr: "NV", slug: "nevada" },
  { name: "New Hampshire", abbr: "NH", slug: "new-hampshire" },
  { name: "New Jersey", abbr: "NJ", slug: "new-jersey" },
  { name: "New Mexico", abbr: "NM", slug: "new-mexico" },
  { name: "New York", abbr: "NY", slug: "new-york" },
  { name: "North Carolina", abbr: "NC", slug: "north-carolina" },
  { name: "North Dakota", abbr: "ND", slug: "north-dakota" },
  { name: "Ohio", abbr: "OH", slug: "ohio" },
  { name: "Oklahoma", abbr: "OK", slug: "oklahoma" },
  { name: "Oregon", abbr: "OR", slug: "oregon" },
  { name: "Pennsylvania", abbr: "PA", slug: "pennsylvania" },
  { name: "Rhode Island", abbr: "RI", slug: "rhode-island" },
  { name: "South Carolina", abbr: "SC", slug: "south-carolina" },
  { name: "South Dakota", abbr: "SD", slug: "south-dakota" },
  { name: "Tennessee", abbr: "TN", slug: "tennessee" },
  { name: "Texas", abbr: "TX", slug: "texas" },
  { name: "Utah", abbr: "UT", slug: "utah" },
  { name: "Vermont", abbr: "VT", slug: "vermont" },
  { name: "Virginia", abbr: "VA", slug: "virginia" },
  { name: "Washington", abbr: "WA", slug: "washington" },
  { name: "West Virginia", abbr: "WV", slug: "west-virginia" },
  { name: "Wisconsin", abbr: "WI", slug: "wisconsin" },
  { name: "Wyoming", abbr: "WY", slug: "wyoming" },
];

const statesBySlug = new Map(states.map((state) => [state.slug, state]));
const statesByAbbr = new Map(states.map((state) => [state.abbr, state]));
const statesByAbbrSlug = new Map(states.map((state) => [state.abbr.toLowerCase(), state]));

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function newsSearchUrl(county: UsCounty, state: StateSite) {
  return googleNewsRssUrl(`${county.name} County ${state.name} local news OR ${county.name} ${state.abbr} community news`);
}

function videoSearchUrl(county: UsCounty, state: StateSite) {
  return googleNewsRssUrl(`${county.name} County ${state.name} local news video OR ${county.name} ${state.abbr} news video`);
}

function sportsSearchUrl(county: UsCounty, state: StateSite) {
  return googleNewsRssUrl(
    `${county.name} County ${state.name} high school sports OR ${county.name} ${state.abbr} college sports OR ${county.name} ${state.abbr} football OR ${county.name} ${state.abbr} basketball OR ${county.name} ${state.abbr} baseball OR ${county.name} ${state.abbr} softball`,
  );
}

function obituariesSearchUrl(county: UsCounty, state: StateSite) {
  return googleNewsRssUrl(`${county.name} County ${state.name} obituaries OR ${county.name} ${state.abbr} obituary OR ${county.name} ${state.abbr} funeral home OR ${county.name} ${state.abbr} death notice`);
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

function googleNewsRssUrl(query: string) {
  const url = new URL(site.links.googleNewsRssSearch);
  url.searchParams.set("q", query);
  url.searchParams.set("hl", "en-US");
  url.searchParams.set("gl", "US");
  url.searchParams.set("ceid", "US:en");
  return url.toString();
}

function createCountySite(county: UsCounty, state: StateSite): CountySite {
  const slug = slugify(county.name);
  const displayName = `${county.name} County`;

  return {
    name: county.name,
    slug,
    state,
    fips: county.FIPS,
    displayName,
    email: site.contact.email,
    heroTitle: `${displayName} Patriots`,
    heroSubtitle: "Making our founders proud.",
    intro:
      "Your voice matters locally and nationally. Knowing who represents you helps you stay informed, engaged, and ready to make a difference for your community and country.",
    calendar: {},
    feeds: {
      localNewsUrl: newsSearchUrl(county, state),
      localSportsUrl: sportsSearchUrl(county, state),
      localVideoUrl: videoSearchUrl(county, state),
      nationalNewsUrl: site.links.nationalNews,
      obituariesUrl: obituariesSearchUrl(county, state),
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
  "texas/potter": {
    primaryCity: "Amarillo",
    phone: "806.351.0084",
    heroTitle: "Potter County Patriots",
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

export function getStateBySlug(slug?: string) {
  if (!slug) return undefined;
  const normalized = slug.toLowerCase();
  return statesBySlug.get(normalized) || statesByAbbrSlug.get(normalized);
}

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

export function stateFromAbbr(abbr: string) {
  return statesByAbbr.get(abbr);
}
