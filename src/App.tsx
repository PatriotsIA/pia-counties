import { useEffect, useMemo, useState, type FormEvent, type ReactNode, type UIEvent } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { AdSlot } from "./components/AdSlot";
import { ScrollToTop } from "./components/ScrollToTop";
import { countyNewsMidRowAdIds } from "./data/ads";
import { CountyShowUpMeter } from "./components/CountyShowUpMeter";
import { PatriotNetworkCommunityBanner } from "./components/PatriotNetworkCommunityBanner";
import { PresentedByPartner } from "./components/PresentedByPartner";
import { TopTicker } from "./components/TopTicker";
import { getCandidateById, getCandidatesForCounty, getCandidatesForState, getPinnedCandidates, isPinnedCandidate, type Candidate } from "./data/candidates";
import { counties, getCountiesForState, getCounty, getStateBySlug, states, type CountyPageKey, type CountySite } from "./data/counties";
import { site } from "./data/site";
import type { AdRouteType } from "./lib/ads";
import { initGoogleTagManager, trackPageView } from "./lib/analytics";
import { fetchCalendarFeed, parseIcsEvents, type CalendarEvent } from "./lib/calendar";
import { sendCountyFormEmail, sendSiteContactEmail } from "./lib/email";
import { fetchRssFeedItems, RSS_FEED_MIN_ITEMS } from "./lib/rss-client";
import { buildMarketFeedUrl, type CountyFeedKind } from "./lib/county-feed-urls";
import { filterFeedItemsByRegion } from "./lib/county-feed-filter";
import { resolveNewsMarketCity } from "./lib/county-news-market";
import type { NewsFeedItem } from "./lib/rss-feed";
import { fetchSpaceEvents as fetchMightyEvents, fetchSpaceFeed as fetchMightyFeed, mightyIsConfigured } from "./lib/mighty";
import patriotDispatchFallback from "../ads/PatriotDispatch.jpg";
import cbtPartnerImage from "../NewAds/CBT4.jpg";
import dyersPartnerImage from "../NewAds/Dyers250.jpg";
import lemcPartnerImage from "../NewAds/LEMC250.jpg";
import mattressPartnerImage from "../NewAds/matress-ad.jpg";
import merchPartnerImage from "../NewAds/Merch.jpg";
import panhandleGreenhouseImage from "../NewAds/PanhandleGreenhouse250.jpg";
import pastureExchangePartnerImage from "../NewAds/PastureEXCHANGELogo.jpg";
import patriotMessagingPartnerImage from "../NewAds/PatriotMessaging 2.jpg";
import patriotTrailerPartnerImage from "../NewAds/PatriotTrailerStore.jpg";
import piaTvPartnerImage from "../NewAds/PIATV2.jpg";
import plainsBankPartnerImage from "../NewAds/PlainsBank250.jpg";

const countyPages: { key: CountyPageKey; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "about", label: "About" },
  { key: "elections", label: "Elections & Resources" },
  { key: "candidates", label: "Candidates" },
  { key: "news", label: "News & Events" },
  { key: "events", label: "Calendar" },
  { key: "tv", label: "TV" },
  { key: "partners", label: "Partners" },
  { key: "contact", label: "Contact" },
];

const candidateProjectUrl = "https://secure.anedot.com/patriots-for-action/donate";
const candidateProjectDisclaimer =
  "You are leaving Patriots in Action and will be redirected to Patriots For Action PAC's secure Anedot donation page. Contributions are not tax-deductible. Not authorized by any candidate's committee. Texas Ethics Commission Filer ID 00090846.";
const candidateProjectCandidateIds = new Set(["mayes-middleton", "jim-wright", "thomas-smith"]);
const heroHeadline = "Patriots in Action";
const heroKicker = "A Nationwide and Ultra Local Hub for Action";
const heroDescription =
  "A nationwide county-by-county civic hub for ultra-local county and statewide Candidates, events, trusted resources, community updates, and practical action. Patriots In Action helps Patriots get informed, get involved, and restore our Republic one county at a time.";
type Partner = {
  name: string;
  description: string;
  href: string;
  image?: string;
  countyKeys?: string[];
  presentsCountyPages?: boolean;
};

const panhandleCountySponsorKeys = ["texas/potter", "texas/randall"];

const nationwidePartners: Partner[] = [
  {
    name: "Patriots For Action",
    description: "Connect with the Patriots For Action organization for civic engagement, grassroots action, and community resources.",
    href: site.links.patriotsForAction,
    image: site.brand.patriot,
  },
  {
    name: "Patriot Dispatch",
    description: "Get Patriots in Action updates and messaging resources.",
    href: site.links.patriotDispatch,
    image: patriotMessagingPartnerImage,
  },
  {
    name: "Patriot Rewards",
    description: "Discover community connections, preferred partners, and member benefits.",
    href: site.links.community,
    image: "/ads/PATRIOTREWARDS.jpg",
  },
  {
    name: "Patriots in Action TV",
    description: "Watch candidate interviews, updates, and community stories.",
    href: "/tv",
    image: piaTvPartnerImage,
  },
  {
    name: "piaevents.com",
    description: "Find upcoming Patriots in Action events and places to show up.",
    href: site.links.piaEvents,
    image: patriotTrailerPartnerImage,
  },
  {
    name: "The Patriots in Action Trailer Store",
    description: "Shop and connect with Patriots in Action at live events.",
    href: site.links.piaEvents,
    image: patriotTrailerPartnerImage,
  },
  {
    name: "The Patriot Merch Store",
    description: "Shop patriotic merchandise and gear from the Patriots in Action merch store.",
    href: site.links.merch,
    image: merchPartnerImage,
  },
  {
    name: "Guerrilla Gear",
    description: "Faith-based apparel for those who serve. A portion of every purchase supports veteran mental health initiatives.",
    href: "https://www.guerrillagear.com/",
    image: "/ads/ad-guerilla-gear.png",
  },
];

const countySpecificPartners: Partner[] = [
  {
    name: "CBT Real Estate Services",
    description: "Connect with CBT Real Estate Services on Facebook.",
    href: site.links.cbtRealEstate,
    image: cbtPartnerImage,
    countyKeys: panhandleCountySponsorKeys,
    presentsCountyPages: true,
  },
  {
    name: "LEMC Realty",
    description: "Find Amarillo and Canyon area rental homes, apartments, and property management services.",
    href: site.links.lemcRealty,
    image: lemcPartnerImage,
    countyKeys: panhandleCountySponsorKeys,
  },
  {
    name: "Mattress By Appointment",
    description: "Shop local mattress deals by appointment.",
    href: "/partners",
    image: mattressPartnerImage,
    countyKeys: panhandleCountySponsorKeys,
  },
  {
    name: "Panhandle Greenhouse",
    description: "Connect with Panhandle Greenhouse.",
    href: "/partners",
    image: panhandleGreenhouseImage,
    countyKeys: panhandleCountySponsorKeys,
  },
  {
    name: "Plains Bank",
    description: "Connect with Plains Bank.",
    href: "/partners",
    image: plainsBankPartnerImage,
    countyKeys: panhandleCountySponsorKeys,
  },
  {
    name: "Dyer's Bar-B-Que",
    description: "Connect with Dyer's Bar-B-Que.",
    href: "/partners",
    image: dyersPartnerImage,
    countyKeys: panhandleCountySponsorKeys,
  },
  {
    name: "Pasture Exchange",
    description: "Pasture sharing made easy.",
    href: "/partners",
    image: pastureExchangePartnerImage,
    countyKeys: panhandleCountySponsorKeys,
  },
];

const preferredPartners = [...nationwidePartners, ...countySpecificPartners];

function preferredPartner(name: string) {
  return preferredPartners.find((partner) => partner.name === name);
}

function patriotMerchPresentedBy(county?: CountySite) {
  const partner = preferredPartner("The Patriot Merch Store");
  if (!partner) return null;

  return {
    name: partner.name,
    href: county?.links.merch ?? partner.href,
    image: partner.image,
  };
}

function patriotsForActionPresentedBy() {
  const partner = preferredPartner("Patriots For Action");
  if (!partner) return null;

  return {
    name: partner.name,
    href: partner.href,
    image: partner.image,
  };
}

function piaEventsPresentedBy() {
  const partner = preferredPartner("piaevents.com");
  if (!partner) return null;

  return {
    name: partner.name,
    href: partner.href,
    image: partner.image,
  };
}

function CandidateDirectorySponsors({ county }: { county?: CountySite }) {
  const merchPresentedBy = patriotMerchPresentedBy(county);
  const patriotsPresentedBy = patriotsForActionPresentedBy();
  const eventsPresentedBy = piaEventsPresentedBy();

  if (!merchPresentedBy && !patriotsPresentedBy && !eventsPresentedBy) return null;

  return (
    <div className="candidate-directory-sponsored">
      <div className="candidate-directory-sponsored-start">
        {patriotsPresentedBy ? <PresentedByPartner {...patriotsPresentedBy} /> : null}
      </div>
      <div className="candidate-directory-sponsored-center">
        {eventsPresentedBy ? <PresentedByPartner {...eventsPresentedBy} /> : null}
      </div>
      <div className="candidate-directory-sponsored-end">
        {merchPresentedBy ? <PresentedByPartner {...merchPresentedBy} /> : null}
      </div>
    </div>
  );
}

function countyKey(county: CountySite) {
  return `${county.state.slug}/${county.slug}`;
}

function countyPartners(county: CountySite) {
  const key = countyKey(county);
  return countySpecificPartners.filter((partner) => partner.countyKeys?.includes(key));
}

function countyPartner(county: CountySite, name: string) {
  return countyPartners(county).find((partner) => partner.name === name);
}

function countyWeatherSponsor(county: CountySite) {
  const partners = [...countyPartners(county), ...nationwidePartners].filter((partner) => partner.href);
  const index = Number.parseInt(county.fips, 10) % partners.length;
  return partners[index];
}

function candidateProfilePath(candidate: Candidate) {
  return `/candidates/${candidate.id}`;
}

function statePath(state: { abbr: string }) {
  return `/${state.abbr.toLowerCase()}`;
}

function countyPath(county: CountySite) {
  return `${statePath(county.state)}/${county.slug}`;
}

function StateFlag({ state, size = "sm" }: { state: { name: string; abbr: string }; size?: "sm" | "md" | "lg" }) {
  return (
    <span className={`state-flag state-flag-${size}`} aria-hidden="true">
      <img src={`/state-flags/${state.abbr.toLowerCase()}.svg`} alt="" loading="lazy" />
    </span>
  );
}

function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | ${site.name}`;
  }, [title]);
}

type SeoData = {
  title: string;
  description: string;
  canonicalPath: string;
  type?: "website" | "article" | "profile";
  structuredData?: Record<string, unknown>[];
};

function SeoTracker() {
  const location = useLocation();

  useEffect(() => {
    applySeoData(seoDataForPath(location.pathname));
  }, [location.pathname]);

  return null;
}

function seoTitle(title: string) {
  return `${title} | ${site.name}`;
}

function absoluteUrl(pathname: string) {
  return new URL(pathname, site.url).toString();
}

function applySeoData(data: SeoData) {
  const title = seoTitle(data.title);
  const canonicalUrl = absoluteUrl(data.canonicalPath);

  document.title = title;
  setMeta("description", data.description);
  setMeta("robots", "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");
  setMeta("og:site_name", site.name, "property");
  setMeta("og:type", data.type || "website", "property");
  setMeta("og:title", title, "property");
  setMeta("og:description", data.description, "property");
  setMeta("og:url", canonicalUrl, "property");
  setMeta("og:image", absoluteUrl(site.brand.icon), "property");
  setMeta("twitter:card", "summary_large_image");
  setMeta("twitter:title", title);
  setMeta("twitter:description", data.description);
  setLink("canonical", canonicalUrl);
  setStructuredData(data.structuredData || defaultStructuredData(data, canonicalUrl));
}

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, name);
    document.head.appendChild(element);
  }
  element.content = content;
}

function setLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
}

function setStructuredData(items: Record<string, unknown>[]) {
  document.head.querySelectorAll('script[data-seo-json-ld="true"]').forEach((node) => node.remove());
  items.forEach((item) => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.seoJsonLd = "true";
    script.text = JSON.stringify(item);
    document.head.appendChild(script);
  });
}

function defaultStructuredData(data: SeoData, canonicalUrl: string) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: data.title,
      description: data.description,
      url: canonicalUrl,
      isPartOf: {
        "@type": "WebSite",
        name: site.name,
        url: site.url,
      },
    },
  ];
}

function seoDataForPath(pathname: string): SeoData {
  if (pathname === "/") {
    return {
      title: "Nationwide & Local Civic Hub",
      description: heroDescription,
      canonicalPath: "/",
      structuredData: [
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: site.name,
          url: site.url,
          description: heroDescription,
          potentialAction: {
            "@type": "SearchAction",
            target: `${site.url}/counties?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        },
        {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: site.name,
          url: site.url,
          logo: absoluteUrl(site.brand.icon),
          contactPoint: {
            "@type": "ContactPoint",
            telephone: site.contact.phone,
            email: site.contact.email,
            contactType: "customer support",
          },
        },
      ],
    };
  }

  if (pathname === "/counties") {
    return {
      title: "Find Your County Patriot Network",
      description: "Search nationwide by state, county, or city to find local Patriots in Action county pages with voter resources, candidate profiles, events, news, and civic information.",
      canonicalPath: "/counties",
    };
  }

  if (pathname === "/tv") return { title: "PIA TV", description: "Watch Patriots in Action TV videos, candidate interviews, civic updates, and community stories.", canonicalPath: "/tv" };
  if (pathname === "/rewards") return { title: "Patriot Rewards", description: "Learn how Patriots Rewards connects local Patriots with community updates, partner resources, events, media, and county action.", canonicalPath: "/rewards" };
  if (pathname === "/partners") return { title: "Patriot Partners", description: "Discover Patriots in Action partners, founding partner opportunities, community resources, events, rewards, media, and merchandise.", canonicalPath: "/partners" };
  if (pathname === "/contact") return { title: "Contact Patriots in Action", description: "Contact Patriots in Action about county information, candidate profiles, interviews, events, partnerships, and civic action.", canonicalPath: "/contact" };
  if (pathname === "/privacy") return { title: "Privacy Policy", description: "Read the Patriots in Action privacy policy covering forms, contact information, SMS consent data, analytics, donations, community links, and merchandise links.", canonicalPath: "/privacy" };
  if (pathname === "/terms") return { title: "Terms & Conditions", description: "Read the Patriots in Action terms and conditions for website use, mobile communications, donations, payment processing, entity relationships, and user submissions.", canonicalPath: "/terms" };

  const candidateMatch = pathname.match(/^\/candidates\/([^/]+)$/);
  if (candidateMatch) {
    const candidate = getCandidateById(candidateMatch[1]);
    if (candidate) {
      return {
        title: `${candidate.name} Candidate Profile`,
        description: `${candidate.name} is running for ${candidate.office}. View candidate information, interview video, contact details, and Patriots in Action profile resources.`,
        canonicalPath: candidateProfilePath(candidate),
        type: "profile",
        structuredData: [
          {
            "@context": "https://schema.org",
            "@type": "Person",
            name: candidate.name,
            url: absoluteUrl(candidateProfilePath(candidate)),
            image: candidate.image ? absoluteUrl(candidate.image) : undefined,
            affiliation: candidate.party,
            jobTitle: `Candidate for ${candidate.office}`,
          },
        ],
      };
    }
  }

  const parts = pathname.split("/").filter(Boolean);
  const state = getStateBySlug(parts[0]);
  if (state && parts.length === 1) {
    return {
      title: `${state.name} County Patriot Networks`,
      description: `Find ${state.name} county Patriots in Action pages with local voter resources, county news, candidate information, events, partners, and civic action tools.`,
      canonicalPath: statePath(state),
    };
  }
  if (state && parts.length === 2 && parts[1] === "candidates") {
    return {
      title: `${state.name} Candidates`,
      description: `Browse ${state.name} candidate profiles, county and district races, campaign information, and Patriots in Action interview resources.`,
      canonicalPath: `${statePath(state)}/candidates`,
    };
  }
  if (state && parts.length >= 2) {
    const county = getCounty(parts[0], parts[1]);
    if (county) {
      const page = (parts[2] as CountyPageKey | undefined) || "home";
      return countySeoData(county, page);
    }
  }

  return {
    title: "Page Not Found",
    description: "The Patriots in Action page you requested could not be found. Use the county directory to find local civic resources and county pages.",
    canonicalPath: pathname,
  };
}

function countySeoData(county: CountySite, page: CountyPageKey): SeoData {
  const basePath = countyPath(county);
  const canonicalPath = page === "home" ? basePath : `${basePath}/${page}`;
  const titleByPage: Record<CountyPageKey, string> = {
    home: `${county.displayName}, ${county.state.name} Patriots`,
    about: `${county.displayName} Civic Action Hub`,
    elections: `${county.displayName} Elections & Resources`,
    candidates: `${county.displayName} Candidates`,
    news: `${county.displayName} Local News & Events`,
    events: `${county.displayName} Community Calendar`,
    tv: `${county.displayName} PIA TV`,
    partners: `${county.displayName} Partners`,
    contact: `Contact ${county.displayName} Patriots`,
    "submit-event": `Submit a ${county.displayName} Event`,
  };
  const descriptionByPage: Record<CountyPageKey, string> = {
    home: `Find ${county.displayName}, ${county.state.name} voter resources, elected officials, candidates, local news, community events, and Patriots in Action updates.`,
    about: `Learn how Patriots in Action helps ${county.displayName} voters get informed, get involved, and restore our Republic one county at a time.`,
    elections: `Find ${county.displayName} precinct maps, voting locations, sample ballots, voter registration, elected official lookups, and civic reference resources.`,
    candidates: `Browse candidate profiles connected to ${county.displayName}, ${county.state.name}, including local, district, county, city, and precinct races.`,
    news: `Follow ${county.displayName} local news, obituary updates, civic video coverage, community events, and Patriots in Action TV updates.`,
    events: `View the ${county.displayName} community calendar and submit local civic events for Patriots in Action review.`,
    tv: `Watch Patriots in Action TV videos and interviews relevant to ${county.displayName} and local civic action.`,
    partners: `Discover preferred partners, events, merchandise, and community resources connected to ${county.displayName} Patriots.`,
    contact: `Contact ${county.displayName} Patriots about local resources, events, candidate profiles, civic updates, and community action.`,
    "submit-event": `Submit a ${county.displayName} community event for review and possible addition to the Patriots in Action calendar.`,
  };

  return {
    title: titleByPage[page] || titleByPage.home,
    description: descriptionByPage[page] || descriptionByPage.home,
    canonicalPath,
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: titleByPage[page] || titleByPage.home,
        description: descriptionByPage[page] || descriptionByPage.home,
        url: absoluteUrl(canonicalPath),
        about: {
          "@type": "AdministrativeArea",
          name: `${county.displayName}, ${county.state.name}`,
        },
        isPartOf: {
          "@type": "WebSite",
          name: site.name,
          url: site.url,
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: site.url },
          { "@type": "ListItem", position: 2, name: county.state.name, item: absoluteUrl(statePath(county.state)) },
          { "@type": "ListItem", position: 3, name: county.displayName, item: absoluteUrl(basePath) },
        ],
      },
    ],
  };
}

function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    initGoogleTagManager();
  }, []);

  useEffect(() => {
    trackPageView(`${location.pathname}${location.search}`, document.title);
  }, [location.pathname, location.search]);

  return null;
}

function App() {
  return (
    <>
      <ScrollToTop />
      <AnalyticsTracker />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/counties" element={<DirectoryPage />} />
        <Route path="/tv" element={<MainTvPage />} />
      <Route path="/rewards" element={<RewardsPage />} />
        <Route path="/partners" element={<MainPartnersPage />} />
        <Route path="/contact" element={<SiteContactPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/candidates/:candidateId" element={<CandidateProfilePage />} />
        <Route path="/:stateSlug/candidates" element={<StateCandidatesPage />} />
        <Route path="/:stateSlug" element={<StatePage />} />
        <Route path="/:stateSlug/:countySlug" element={<CountyRoute page="home" />} />
        <Route path="/:stateSlug/:countySlug/:pageSlug" element={<CountyRoute />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <SeoTracker />
    </>
  );
}

function HomePage() {
  usePageTitle("County Patriot Networks");

  return (
    <Shell route="home" suppressAdRails>
      <section className="hero hero-home">
        <div>
          <p className="eyebrow">Join Our Interactive Community</p>
          <h1>{heroHeadline}</h1>
          <p className="eyebrow hero-subtitle-eyebrow">{heroKicker}</p>
          <p>{heroDescription}</p>
          <p className="hero-tagline"><em>Patriot inaction is the cause. Patriots in Action is the Cure.</em></p>
          <div className="actions">
            <Link className="button primary" to="/counties">Find Your County</Link>
            <Link className="button red" to="/tx/candidates">Explore Your Candidates</Link>
            <a className="button" href={site.links.community}>Join Our Community</a>
            <a className="button red" href={site.links.merch} target="_blank" rel="noreferrer">Shop Merchandise</a>
          </div>
          <img className="hero-patriot-mark" src={site.brand.patriot} alt="Patriots in Action patriot mark" />
        </div>
        <HeroMedia />
      </section>
      <CountyFinder />
      <ElectionCountdown />
      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">From Awareness To Action</p>
          <h2>Built to help Patriots restore our Republic one county at a time</h2>
          <p>PatriotsInAction.com gives voters a practical county-by-county hub for finding local information, understanding who represents them, following community updates, and taking the next step where local government decisions are made.</p>
        </div>
        <div className="card-grid three">
          <InfoCard title="Find Your Local Network" body={`Browse ${states.length} states and DC with county pages built to connect voters to local resources, officials, candidates, calendars, and community updates.`} />
          <InfoCard title="Know Who Represents You" body="Use county pages to find voter resources, precinct maps, sample ballots, elected officials, candidate profiles, interviews, and links that help you make informed decisions." />
          <InfoCard title="Move Patriots To Action" body="Follow local news, submit events, watch PIA TV, join the community, discover partners, and turn civic concern into practical action in your county." />
        </div>
      </section>
      <FoundingPartnerCallout />
      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Patriots in Action TV</p>
          <h2>Latest PIA video updates</h2>
          <p>Watch recent interviews, candidate conversations, and updates from the Patriots in Action Vimeo channel.</p>
        </div>
        <VimeoFeed compact />
      </section>
    </Shell>
  );
}

function FoundingPartnerCallout({ county }: { county?: CountySite }) {
  const isCounty = Boolean(county);

  return (
    <section className="section founding-partner-callout">
      <div>
        <p className="eyebrow">{isCounty ? "Become a County Founding Partner" : "Become a Founding Partner"}</p>
        <PatriotReachNote />
        <h2>
          {isCounty
            ? `Support the ${county!.displayName} page local Patriots use every day`
            : "Support the county pages local Patriots use every day"}
        </h2>
        <p>
          {isCounty ? `Your ${county!.displayName} page is already live. ` : "Your county page is already live. "}
          We are selecting founding partners who want to support local civic information, events, weather, election resources, news, and
          community engagement in their county. Put your business in front of engaged local Patriots on the county pages they use for news,
          weather, obituaries, events, and civic resources.
        </p>
        <p>Get listed as a Patriot Preferred Business so local Patriots can find and support your business.</p>
      </div>
      <div className="actions">
        <Link className="button primary" to="/contact">
          {isCounty ? "Become a County Founding Partner" : "Become a Founding Partner"}
        </Link>
        <Link className="button" to={isCounty ? `${countyPath(county!)}/partners` : "/partners"}>
          {isCounty ? "See County Partners" : "See Partner Opportunities"}
        </Link>
      </div>
    </section>
  );
}

function CountyFinder() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const normalizedQuery = query.trim().toLowerCase();
  const hasQuery = Boolean(normalizedQuery);
  const stateMatches = useMemo(
    () =>
      hasQuery
        ? states
            .filter((state) => [state.name, state.abbr, state.slug].some((value) => value.toLowerCase().includes(normalizedQuery)))
            .slice(0, 5)
        : [],
    [hasQuery, normalizedQuery],
  );
  const countyMatches = useMemo(
    () =>
      hasQuery
        ? counties
            .filter((county) =>
              [county.displayName, county.name, county.primaryCity, county.state.name, county.state.abbr, county.slug].some((value) =>
                value?.toLowerCase().includes(normalizedQuery),
              ),
            )
            .slice(0, 10)
        : [],
    [hasQuery, normalizedQuery],
  );
  const bestState = stateMatches.find(
    (state) => state.name.toLowerCase() === normalizedQuery || state.abbr.toLowerCase() === normalizedQuery,
  );

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (bestState) {
      navigate(statePath(bestState));
    } else if (countyMatches[0]) {
      navigate(countyPath(countyMatches[0]));
    }
  }

  return (
    <section className="home-county-finder" aria-labelledby="home-county-finder-heading">
      <h2 id="home-county-finder-heading">Find a County</h2>
      <form onSubmit={submitSearch}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by county or state (e.g., Orange, TX)"
          type="search"
          aria-label="Search for a county or state"
        />
        <button type="submit" disabled={!bestState && !countyMatches.length}>Search</button>
      </form>
      {hasQuery ? (
        <div className="home-county-finder-results">
          {stateMatches.map((state) => (
            <Link key={state.abbr} to={statePath(state)}>
              <strong>{state.name}</strong>
              <span>State · {state.abbr}</span>
            </Link>
          ))}
          {countyMatches.map((county) => (
            <Link key={county.fips} to={countyPath(county)}>
              <strong>{county.displayName}</strong>
              <span>County · {county.state.name}</span>
            </Link>
          ))}
          {!stateMatches.length && !countyMatches.length ? <p>No counties or states match that search.</p> : null}
        </div>
      ) : null}
    </section>
  );
}

function electionDay(year: number) {
  const novemberFirst = new Date(year, 10, 1);
  const firstMonday = 1 + ((1 - novemberFirst.getDay() + 7) % 7);
  return new Date(year, 10, firstMonday + 1);
}

function nextElectionYear(remainder: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let year = today.getFullYear();
  while (year % 4 !== remainder || electionDay(year) < today) {
    year += 1;
  }

  return year;
}

function daysUntil(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86_400_000);
}

function formatElectionDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function ElectionCountdown() {
  const midtermDate = electionDay(nextElectionYear(2));
  const presidentialDate = electionDay(nextElectionYear(0));
  const elections = [
    {
      label: `${presidentialDate.getFullYear()} Presidential Election`,
      date: presidentialDate,
      days: daysUntil(presidentialDate),
    },
    {
      label: `${midtermDate.getFullYear()} Midterm Elections`,
      date: midtermDate,
      days: daysUntil(midtermDate),
    },
  ];

  return (
    <section className="election-countdown" aria-labelledby="election-countdown-heading">
      <div className="election-countdown-inner">
        <p className="eyebrow">Election Countdown</p>
        <h2 id="election-countdown-heading">Every day is a chance to make a difference.</h2>
        <div className="election-countdown-grid">
          {elections.map((election) => (
            <article className="election-countdown-card" key={election.label}>
              <h3>{election.label}</h3>
              <p>{formatElectionDate(election.date)}</p>
              <strong>{election.days.toLocaleString()}</strong>
              <span>Days</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function MainTvPage() {
  usePageTitle("PIA TV");

  return (
    <Shell route="tv">
      <PageHero eyebrow="Patriots in Action TV" title="PIA TV" subtitle="Latest videos, interviews, candidate conversations, and updates from Patriots in Action." />
      <VimeoFeed />
    </Shell>
  );
}

function RewardsPage() {
  usePageTitle("Patriot Rewards");

  return (
    <Shell route="rewards">
      <PageHero
        eyebrow="Patriot Rewards"
        title="Your community connection hub"
        subtitle="Patriots Rewards connects local Patriots with community updates, county action pages, partner resources, events, video updates, and ways to stay engaged between elections."
      />
      <section className="section split top-align">
        <div>
          <p className="eyebrow">How It Works</p>
          <h2>Join once, stay connected locally.</h2>
          <p>
            The Patriots in Action Community is the central place to connect with neighbors, follow local civic updates, discover events, watch media,
            and stay plugged into county-by-county action. County pages help you find the local resources; the community gives you a place to keep the
            conversation and coordination going.
          </p>
          <div className="actions">
            <a className="button primary" href={site.links.community}>Join Our Interactive Community</a>
            <Link className="button" to="/counties">Find Your County</Link>
          </div>
        </div>
        <div className="panel">
          <h2>Patriot Rewards</h2>
          <p>Patriot Rewards is designed to bring community, partners, media, and local action together in one place.</p>
          <ul className="feature-list">
            <li>Connect with your local county network.</li>
            <li>Find updates, events, videos, and calls to action.</li>
            <li>Discover partner resources and community benefits.</li>
            <li>Stay informed through your county page and the broader Patriots in Action community.</li>
          </ul>
        </div>
      </section>
      <section className="section">
        <div className="card-grid three">
          <InfoCard title="Start With Your County" body="Find your county Patriot Network for local news, calendars, candidates, resources, and contact options." href="/counties" cta="Find Your County" />
          <InfoCard title="Join The Community" body="Use the Patriots in Action community to connect, coordinate, and keep local conversations moving." href={site.links.community} cta="Join Now" />
          <InfoCard title="Watch And Share" body="Use PIA TV and candidate profiles to share interviews, updates, and resources with neighbors." href="/tv" cta="Watch PIA TV" />
        </div>
      </section>
    </Shell>
  );
}

function MainPartnersPage() {
  usePageTitle("Patriot Partners");

  return (
    <Shell route="partners">
      <PageHero
        eyebrow="Partners"
        title="Patriot Partners"
        subtitle="Connect with Patriots in Action partners, founding partners, events, rewards, media, and merchandise."
      />
      <section className="partner-sponsor-banner">
        <div>
          <p className="eyebrow">Founding Partners</p>
          <PatriotReachNote />
          <h2>Become a Founding Partner</h2>
          <p>
            We are selecting founding businesses in counties and states to help support local civic information, events, election resources,
            weather, news, and community engagement.
          </p>
        </div>
        <div className="actions">
          <Link className="button primary" to="/contact">Become a Founding Partner</Link>
          <Link className="button" to="/counties">Find Your County</Link>
        </div>
      </section>
      <section className="section partner-sections">
        <div className="panel">
          <p className="eyebrow">Sitewide Partners</p>
          <h2>Nationwide partners supporting Patriots in Action</h2>
          <p>
            These partners support the broader Patriots in Action network across counties, states, events, media, rewards, and merchandise.
          </p>
          <PartnerList partners={nationwidePartners} />
        </div>
        <div className="panel">
          <p className="eyebrow">County Founding Partners</p>
          <h2>County founding partners</h2>
          <p>
            These founding partners currently support specific local county pages. More state and county founding partners can be added as those relationships grow.
          </p>
          <PartnerList partners={countySpecificPartners} showCountyScope />
        </div>
      </section>
    </Shell>
  );
}

function SiteContactPage() {
  usePageTitle("Contact");

  return (
    <Shell route="contact">
      <PageHero eyebrow="Contact" title="Contact Patriots in Action" subtitle="Reach out about candidate profiles, interviews, voter outreach, events, partnerships, or county-level action." />
      <section className="section split top-align">
        <div className="panel">
          <h2>How can we help?</h2>
          <p><strong>Phone:</strong> <a href={`tel:${site.contact.phoneDial}`}>{site.contact.phone}</a></p>
          <p><strong>Email:</strong> <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a></p>
          <p><strong>Community:</strong> <a href={site.links.community}>Join the movement</a></p>
        </div>
        <SiteContactForm />
      </section>
    </Shell>
  );
}

function DirectoryPage() {
  const [directorySearch, setDirectorySearch] = useState("");
  const [selectedStateSlug, setSelectedStateSlug] = useState("all");
  const query = directorySearch.trim().toLowerCase();
  const filteredCounties = counties.filter((county) =>
    (selectedStateSlug === "all" || county.state.slug === selectedStateSlug) &&
    [
      county.displayName,
      county.name,
      county.slug,
      county.primaryCity,
      county.fips,
      county.state.name,
      county.state.abbr,
      county.state.slug,
    ].some((value) => value?.toLowerCase().includes(query)),
  );
  const visibleStates = states.filter((state) =>
    selectedStateSlug === "all" &&
    !query &&
    [state.name, state.abbr, state.slug].some((value) => value.toLowerCase().includes(query)),
  );
  const selectedState = selectedStateSlug === "all" ? undefined : getStateBySlug(selectedStateSlug);

  usePageTitle("Find Your County");

  return (
    <Shell route="directory">
      <PageHero eyebrow="Counties" title="Find your county Patriot Network" subtitle="Search nationwide by state, county, or city to open local county pages for civic information, calendars, news, TV, partners, and forms." />
      <CountyDirectoryNotice />
      <section className="directory-search directory-search-wide" aria-label="Search states and counties">
        <label className="field">
          <span>Search states and counties</span>
          <input
            value={directorySearch}
            onChange={(event) => setDirectorySearch(event.target.value)}
            placeholder="Search Texas, TX, Potter, Amarillo..."
            type="search"
          />
          <CountyVotingResourcesTooltip stateName={selectedState?.name} />
        </label>
        <label className="field">
          <span>Filter by state</span>
          <select value={selectedStateSlug} onChange={(event) => setSelectedStateSlug(event.target.value)}>
            <option value="all">All states</option>
            {states.map((state) => (
              <option key={state.abbr} value={state.slug}>{state.name}</option>
            ))}
          </select>
        </label>
        <p>{filteredCounties.length} of {counties.length} counties shown</p>
      </section>
      <PatriotNetworkCommunityBanner className="directory-community-banner" />
      {!query && !selectedState ? (
        <>
          <div className="section-heading compact-heading">
            <p className="eyebrow">Browse by State</p>
            <h2>Choose a state or search directly for a county</h2>
          </div>
          <div className="directory-grid">
            {visibleStates.map((state) => (
              <Link key={state.abbr} className="directory-card" to={statePath(state)}>
                <StateFlag state={state} />
                <span className="directory-card-copy">
                  <strong>{state.name}</strong>
                  <span>{getCountiesForState(state.slug).length} counties</span>
                </span>
              </Link>
            ))}
          </div>
        </>
      ) : null}
      {query || selectedState ? (
        <>
          <div className="section-heading compact-heading">
            <p className="eyebrow">County Results</p>
            <h2>{selectedState ? `${selectedState.name} counties` : "Nationwide county matches"}</h2>
            <p>{filteredCounties.length ? "Open a county page for local resources, candidates, news, events, and civic information." : "No counties match your search yet."}</p>
          </div>
          <div className="directory-grid">
            {filteredCounties.map((county) => (
              <Link key={county.fips} className="directory-card" to={countyPath(county)}>
                <StateFlag state={county.state} />
                <span className="directory-card-copy">
                  <strong>{county.displayName}</strong>
                  <span>{county.state.name}{county.primaryCity ? ` | ${county.primaryCity}` : ""}</span>
                </span>
              </Link>
            ))}
          </div>
        </>
      ) : null}
      {!filteredCounties.length ? <p className="status">No counties match your search.</p> : null}
    </Shell>
  );
}

function StatePage() {
  const { stateSlug } = useParams();
  const state = getStateBySlug(stateSlug);
  const stateCounties = getCountiesForState(stateSlug);
  const [countySearch, setCountySearch] = useState("");
  const countyQuery = countySearch.trim().toLowerCase();
  const visibleCounties = stateCounties.filter((county) =>
    [county.displayName, county.name, county.slug, county.primaryCity, county.fips].some((value) => value?.toLowerCase().includes(countyQuery)),
  );

  usePageTitle(state ? `${state.name} Counties` : "Not Found");
  if (!state) return <NotFound />;
  if (stateSlug?.toLowerCase() !== state.abbr.toLowerCase()) return <Navigate to={statePath(state)} replace />;

  return (
    <Shell route="state" suppressAdRails>
      <PageHero eyebrow={state.abbr} title={`${state.name} Patriot Networks`} subtitle="Select a county to open its local Patriots in Action site." />
      <CountyDirectoryNotice stateName={state.name} />
      <section className="directory-search" aria-label={`Search ${state.name} counties`}>
        <label className="field">
          <span>Search {state.name} counties</span>
          <input
            value={countySearch}
            onChange={(event) => setCountySearch(event.target.value)}
            placeholder="Search by county or city..."
            type="search"
          />
          <CountyVotingResourcesTooltip stateName={state.name} />
        </label>
        <p>{visibleCounties.length} of {stateCounties.length} counties shown</p>
      </section>
      <PatriotNetworkCommunityBanner className="directory-community-banner" />
      <div className="directory-grid">
        {visibleCounties.map((county) => (
          <Link key={county.fips} className="directory-card" to={countyPath(county)}>
            <StateFlag state={county.state} />
            <span className="directory-card-copy">
              <strong>{county.displayName}</strong>
              <span>{county.primaryCity || state.name}</span>
            </span>
          </Link>
        ))}
      </div>
      {!visibleCounties.length ? <p className="status">No counties match your search.</p> : null}
    </Shell>
  );
}

function CandidateDirectoryEmptyBanner() {
  return (
    <section className="candidate-directory-empty-banner" aria-label="Help build candidate directories">
      <div>
        <p className="eyebrow">Candidate Directory</p>
        <h2>Don&apos;t see your state and local candidates?</h2>
        <p>Contact us to help us build our candidate directories.</p>
      </div>
      <Link className="button primary" to="/contact">Contact Us</Link>
    </section>
  );
}

function CountyDirectoryNotice({ stateName }: { stateName?: string }) {
  const scope = stateName ? `${stateName} county pages` : "county and state pages";

  return (
    <section className="candidate-directory-notice">
      <div>
        <p className="eyebrow">County Information</p>
        <h2>Help us improve local civic resources</h2>
        <p>
          We are working to gather more county-specific data for {scope}. If you are a county official or a civically minded citizen
          within a county or state and want to help us, please review your county page and submit accurate information through the
          contact form.
        </p>
      </div>
      <Link className="button primary" to="/contact">Contact Us</Link>
    </section>
  );
}

function CountyVotingResourcesTooltip({ stateName }: { stateName?: string }) {
  return (
    <p className="directory-search-tooltip" role="note">
      {stateName
        ? `State and local voting resources are available on your ${stateName} county page.`
        : "State and local voting resources are available on your county page."}
    </p>
  );
}

function StateVotingResources({ state }: { state: { name: string; abbr: string; slug: string } }) {
  const stateAbbr = state.abbr.toLowerCase();

  return (
    <section className="section">
      <div className="section-heading">
        <p className="eyebrow">{state.name} Voting Resources</p>
        <h2>Dates, deadlines, voting resources, and polling places</h2>
        <p>Use these official and national voter tools to confirm current rules, registration status, deadlines, and where to vote in {state.name}.</p>
      </div>
      <div className="card-grid four">
        <ResourceCard title={`${state.name} Registration`} href={`https://vote.gov/register/${stateAbbr}/`} />
        <ResourceCard title={`${state.name} Dates and Deadlines`} href={`https://www.vote.org/state/${state.slug}/`} />
        <ResourceCard title="Polling Place Locator" href="https://www.vote.org/polling-place-locator/" />
        <ResourceCard title="Check Registration" href="https://www.nass.org/can-i-vote/voter-registration-status" />
        <ResourceCard title="State Election Office Directory" href="https://www.nass.org/can-i-vote/election-officials-directory" />
        <ResourceCard title="Absentee and Early Voting" href="https://www.vote.org/absentee-voting-rules/" />
        <ResourceCard title="Voter ID Rules" href="https://www.vote.org/voter-id-laws/" />
        <ResourceCard title="Election Protection Hotline" href="https://866ourvote.org/" />
      </div>
    </section>
  );
}

function StateCandidatesPage() {
  const { stateSlug } = useParams();
  const state = getStateBySlug(stateSlug);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [jurisdictionFilter, setJurisdictionFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [candidateSort, setCandidateSort] = useState("name");
  const allCandidates = getCandidatesForState(stateSlug);
  const jurisdictionOptions = candidateJurisdictionOptions(allCandidates);
  const scopeOptions = candidateScopeOptions(allCandidates);
  const filteredCandidates = filterAndSortCandidates(allCandidates, {
    search: candidateSearch,
    jurisdiction: jurisdictionFilter,
    scope: scopeFilter,
    sort: candidateSort,
  });
  const statewideCandidates = filteredCandidates.filter((candidate) => candidate.scope === "statewide");
  const localCandidates = filteredCandidates.filter((candidate) => candidate.scope !== "statewide");
  const pinnedCandidates = getPinnedCandidates(filteredCandidates);
  const remainingStatewideCandidates = statewideCandidates.filter((candidate) => !isPinnedCandidate(candidate.id));
  const remainingLocalCandidates = localCandidates.filter((candidate) => !isPinnedCandidate(candidate.id));
  const hasJurisdictionFilter = jurisdictionFilter !== "all";

  usePageTitle(state ? `${state.name} Candidates` : "Not Found");
  if (!state) return <NotFound />;
  if (stateSlug?.toLowerCase() !== state.abbr.toLowerCase()) return <Navigate to={`${statePath(state)}/candidates`} replace />;

  return (
    <Shell route="state">
      <PageHero eyebrow="Candidate Directory" title={`${state.name} candidates running for office`} subtitle="Browse statewide, district, county, city, and precinct candidates connected to Patriots in Action." />
      <CandidateDirectorySponsors />
      <CandidateFilters
        jurisdictions={jurisdictionOptions}
        jurisdiction={jurisdictionFilter}
        scope={scopeFilter}
        scopes={scopeOptions}
        search={candidateSearch}
        sort={candidateSort}
        total={allCandidates.length}
        visible={filteredCandidates.length}
        onJurisdictionChange={setJurisdictionFilter}
        onScopeChange={setScopeFilter}
        onSearchChange={setCandidateSearch}
        onSortChange={setCandidateSort}
      />
      <PatriotNetworkCommunityBanner className="directory-community-banner" />
      {!allCandidates.length ? <CandidateDirectoryEmptyBanner /> : null}
      {pinnedCandidates.length && !hasJurisdictionFilter ? <FeaturedInterviewsSection candidates={pinnedCandidates} /> : null}
      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Local and District Races</p>
          <h2>{remainingLocalCandidates.length ? `${remainingLocalCandidates.length} local and district candidates` : "Local candidates coming soon"}</h2>
          <p>{hasJurisdictionFilter ? `Candidates matching ${jurisdictionFilter}. Statewide candidates are shown separately below.` : "County pages show county-specific races when a candidate can be matched to a county."}</p>
        </div>
        <CandidateGrid candidates={remainingLocalCandidates} emptyText={`No local ${state.name} candidates have been added yet.`} showCounty />
      </section>
      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Statewide Races</p>
          <h2>{remainingStatewideCandidates.length ? `${remainingStatewideCandidates.length} statewide candidates` : "Statewide candidates coming soon"}</h2>
          <p>{hasJurisdictionFilter ? `Statewide candidates are included with ${jurisdictionFilter} results because they appear on ballots across ${state.name}.` : "The source directory includes candidate names and offices, with room to add profile pages and campaign links later."}</p>
        </div>
        <CandidateGrid candidates={remainingStatewideCandidates} emptyText={`No statewide ${state.name} candidates have been added yet.`} />
      </section>
      {allCandidates.length ? <p className="source-note">Candidate data is modeled after the public Patriots in Action candidates directory.</p> : null}
    </Shell>
  );
}

function CandidateProfilePage() {
  const { candidateId } = useParams();
  const candidate = getCandidateById(candidateId);
  const state = getStateBySlug(candidate?.stateSlug);

  usePageTitle(candidate ? `${candidate.name} Candidate Profile` : "Candidate Not Found");
  if (!candidate) return <NotFound />;

  const backPath = candidate.countySlug && state
    ? `${statePath(state)}/${candidate.countySlug}/candidates`
    : state
      ? `${statePath(state)}/candidates`
      : "/counties";

  return (
    <Shell route="static" suppressAdRails>
      <section className="section">
        <CandidateProfile candidate={candidate} backPath={backPath} />
      </section>
    </Shell>
  );
}

function CountyRoute({ page }: { page?: CountyPageKey }) {
  const { stateSlug, countySlug, pageSlug } = useParams();
  const county = getCounty(stateSlug, countySlug);
  const resolvedPage = page || normalizeCountyPage(pageSlug);

  if (!county) return <NotFound />;
  if (stateSlug?.toLowerCase() !== county.state.abbr.toLowerCase()) {
    return <Navigate to={resolvedPage && resolvedPage !== "home" ? `${countyPath(county)}/${resolvedPage}` : countyPath(county)} replace />;
  }
  if (!resolvedPage) return <Navigate to={countyPath(county)} replace />;

  return <CountyPage county={county} page={resolvedPage} />;
}

function normalizeCountyPage(pageSlug?: string): CountyPageKey | undefined {
  if (!pageSlug) return "home";
  if (pageSlug === "submit-event") return "submit-event";
  return countyPages.some((page) => page.key === pageSlug) ? (pageSlug as CountyPageKey) : undefined;
}

function CountyPage({ county, page }: { county: CountySite; page: CountyPageKey }) {
  usePageTitle(`${county.displayName}, ${county.state.name}`);

  return (
    <CountyShell county={county} page={page}>
      {page === "home" ? <CountyHome county={county} /> : null}
      {page === "about" ? <CountyAbout county={county} /> : null}
      {page === "elections" ? <CountyElections county={county} /> : null}
      {page === "candidates" ? <CountyCandidates county={county} /> : null}
      {page === "news" ? <CountyNews county={county} /> : null}
      {page === "events" ? <CountyEvents county={county} /> : null}
      {page === "tv" ? <CountyTv county={county} /> : null}
      {page === "partners" ? <CountyPartners county={county} /> : null}
      {page === "contact" ? <CountyContact county={county} /> : null}
      {page === "submit-event" ? <CountySubmitEvent county={county} /> : null}
    </CountyShell>
  );
}

function CountyHome({ county }: { county: CountySite }) {
  const presentingSponsor = countyPartners(county).find((partner) => partner.presentsCountyPages);

  return (
    <>
      <section className="county-hero">
        <div>
          <div className="county-hero-flag">
            <StateFlag state={county.state} size="md" />
            <p className="eyebrow">Powered by Patriots In Action</p>
          </div>
          <h1>{county.displayName} Patriots</h1>
          <p className="eyebrow hero-subtitle-eyebrow">{county.displayName} Hub For Action</p>
          {presentingSponsor ? (
            <a className="county-hero-sponsor" href={presentingSponsor.href} target="_blank" rel="noreferrer">
              {presentingSponsor.image ? <img src={presentingSponsor.image} alt="" loading="lazy" /> : null}
              <span>Presented by</span>
              <strong>{presentingSponsor.name}</strong>
            </a>
          ) : null}
          <p>{heroDescription}</p>
          <p className="hero-tagline"><em>Patriot inaction is the cause. Patriots in Action is the Cure.</em></p>
          <div className="actions">
            <a className="button primary" href={county.links.rewards}>Join Patriot Rewards</a>
            <Link className="button red" to="/tx/candidates">Explore Your Candidates</Link>
            <Link className="button" to={`${countyPath(county)}/events`}>Community Calendar</Link>
            <Link className="button" to={`${countyPath(county)}/submit-event`}>Submit an Event</Link>
          </div>
          <img className="hero-patriot-mark" src={site.brand.patriot} alt="Patriots in Action patriot mark" />
        </div>
        <HeroMedia />
      </section>
      <ElectionCountdown />
      <CountyShowUpMeter county={county} className="county-show-up-section-home" />
      <CountyAboutCompact county={county} />
      <FoundingPartnerCallout county={county} />
      <AdSlot county={county} page="home" route="county" slot="county-home-inline" limit={6} />
      <section className="section split">
        <div>
          <p className="eyebrow">Know Your Leaders. Become Empowered.</p>
          <h2>{county.intro}</h2>
          <p>Your Vote. Your Voice. Your Power. Every election matters, from your local school board to the White House.</p>
        </div>
        <EventCalendar county={county} compact />
      </section>
      <CountyCommunityFeed county={county} />
      <CountyNewsSection county={county} page="home" />
      <ActionGrid county={county} />
    </>
  );
}

function CountyAboutCompact({ county }: { county: CountySite }) {
  return (
    <section className="compact-about">
      <div>
        <p className="eyebrow">{county.displayName} Action Hub</p>
        <h2>Local information. Local relationships. Local action.</h2>
      </div>
      <p>
        Use this county page to find voter resources, elected officials, candidates, local updates, events, and community links that help
        Patriots move from concern to action where local decisions are made.
      </p>
      <Link className="button" to={`${countyPath(county)}/about`}>Learn About {county.displayName}</Link>
    </section>
  );
}

function CountyAbout({ county }: { county: CountySite }) {
  return (
    <>
      <PageHero eyebrow={county.displayName} title="Making our founders proud." subtitle="Patriots in Action helps local voters find the information, relationships, and next steps they need to take action where it matters most." />
      <CountyShowUpMeter county={county} />
      <section className="section">
        <div className="card-grid three">
          <InfoCard title="Know Your Local Ground" body={`Use the ${county.displayName} page to find voter resources, elected officials, candidates, precinct information, local news, events, and community links in one place.`} />
          <InfoCard title="Turn Concern Into Action" body="Follow what is happening locally, share candidate profiles and interviews, submit community events, and invite neighbors into practical civic action." />
          <InfoCard title="Build County Power" body="Connect with the Patriots in Action community, discover trusted partners, and help restore accountability by showing up where local decisions are made." />
        </div>
      </section>
      <CustomBlocks county={county} page="about" />
    </>
  );
}

function CountyElections({ county }: { county: CountySite }) {
  return (
    <>
      <PageHero
        eyebrow="Elections & Resources"
        title="Important civic information"
        subtitle="County, state, and federal voting resources and leader lookups for your community."
      />
      <ElectionCountdown />
      <CountyShowUpMeter county={county} />
      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">{county.displayName} Resources</p>
          <h2>County voting resources and elected officials</h2>
          <p>Local precinct maps, ballots, registration, and elected-official lookups for {county.displayName}.</p>
        </div>
        <ActionGrid county={county} embedded />
      </section>
      <StateVotingResources state={county.state} />
      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Civic References</p>
          <h2>Founding documents and election offices</h2>
          <p>Use these references to understand your rights, your state framework, and where official election information is maintained.</p>
        </div>
        <div className="card-grid three">
          <ResourceCard title="Ten Commandments" href="https://www.archives.gov/milestone-documents" />
          <ResourceCard title="Declaration of Independence" href="https://www.archives.gov/founding-docs/declaration" />
          <ResourceCard title="U.S. Constitution" href="https://www.archives.gov/founding-docs/constitution" />
          <ResourceCard title={`${county.state.name} Constitution`} href={stateConstitutionUrl(county.state.name)} />
          <ResourceCard title="Election Officials Directory" href="https://www.nass.org/can-i-vote/election-officials-directory" />
          <ResourceCard title="State Voting Rules" href="https://www.vote411.org/plan-your-vote" />
        </div>
      </section>
    </>
  );
}

function stateConstitutionUrl(stateName: string) {
  return `https://ballotpedia.org/${stateName.replace(/\s+/g, "_")}_Constitution`;
}

function CountyCandidates({ county }: { county: CountySite }) {
  const countyCandidates = getCandidatesForCounty(county).filter((candidate) => !isPinnedCandidate(candidate.id));
  const pinnedCandidates = getPinnedCandidates(getCandidatesForState(county.state.slug));
  return (
    <>
      <PageHero eyebrow="Candidate Directory" title={`${county.displayName} candidates`} subtitle={`Candidates running for local offices connected to ${county.displayName}, ${county.state.name}.`} />
      <CountyShowUpMeter county={county} />
      <CandidateDirectorySponsors county={county} />
      <PatriotNetworkCommunityBanner className="directory-community-banner" />
      {pinnedCandidates.length ? <FeaturedInterviewsSection candidates={pinnedCandidates} /> : null}
      {!countyCandidates.length ? <CandidateDirectoryEmptyBanner /> : null}
      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Local Ballot Watch</p>
          <h2>{countyCandidates.length ? `${countyCandidates.length} local candidates` : "Candidate profiles coming soon"}</h2>
          <p>Find candidates connected to county, city, court, and precinct races. Statewide candidates are listed in the state directory.</p>
        </div>
        <CandidateGrid
          candidates={countyCandidates}
          emptyText={`No ${county.displayName} candidate profiles have been added yet.`}
        />
        <div className="actions">
          <Link className="button" to={`${statePath(county.state)}/candidates`}>View {county.state.name} Candidates</Link>
          <a className="button primary" href="https://patriotsinaction.com/candidates/">Open PIA Candidate Directory</a>
        </div>
      </section>
    </>
  );
}

function FeaturedInterviewsSection({ candidates }: { candidates: Candidate[] }) {
  return (
    <section className="section">
      <div className="section-heading">
        <p className="eyebrow">Featured Interviews</p>
        <h2>Recent Patriots in Action TV interviews</h2>
        <p>Watch recent conversations with Texas Republican Party leadership candidates, local office seekers, and conservative leaders interviewed on Patriots in Action TV.</p>
      </div>
      <CandidateGrid candidates={candidates} emptyText="No featured interviews are available yet." />
    </section>
  );
}

function CountyNews({ county }: { county: CountySite }) {
  return (
    <>
      <PageHero eyebrow="News & Events" title="Stay informed" subtitle="Local news, national news, obituaries, interviews, and community updates." />
      <CountyShowUpMeter county={county} />
      <CountyCommunityFeed county={county} />
      <CountyNewsSection county={county} page="news" />
    </>
  );
}

function CountyEvents({ county }: { county: CountySite }) {
  return (
    <>
      <PageHero eyebrow="Community Calendar" title={`${county.displayName} events`} subtitle="Find upcoming local events or submit one for review." />
      <CountyShowUpMeter county={county} />
      <section className="section split top-align">
        <EventCalendar county={county} />
        <div className="panel">
          <h2>Submit an Event</h2>
          <p>Share your local meeting, fundraiser, training, or civic action event with the Patriots in Action team.</p>
          <Link className="button primary" to={`${countyPath(county)}/submit-event`}>Submit an Event</Link>
        </div>
      </section>
    </>
  );
}

function CountyTv({ county }: { county: CountySite }) {
  return (
    <>
      <PageHero eyebrow="Patriots in Action TV" title="Interviews & updates" subtitle="Videos from the Patriots in Action Vimeo channel." />
      <CountyShowUpMeter county={county} />
      <VimeoFeed />
    </>
  );
}

function CountyPartners({ county }: { county: CountySite }) {
  const partners = countyPartners(county);

  return (
    <>
      <PageHero
        eyebrow="Partners"
        title="Partner with Patriots in Action"
        subtitle="Preferred partners, founding partners, merchandise, and Patriot Rewards."
      />
      <CountyShowUpMeter county={county} />
      <FoundingPartnerCallout county={county} />
      <section className="section partner-sections">
        <div className="panel">
          <p className="eyebrow">{county.displayName} Partners</p>
          <h2>{county.displayName} founding partners</h2>
          <p>These are the founding partners currently connected to {county.displayName}.</p>
          {partners.length ? <PartnerList county={county} partners={partners} /> : <p className="status">No county founding partners have been added for {county.displayName} yet.</p>}
          <div className="actions">
            <Link className="button" to="/contact">Become a County Founding Partner</Link>
          </div>
        </div>
        <div className="panel">
          <p className="eyebrow">Sitewide Partners</p>
          <h2>Nationwide partners supporting Patriots in Action</h2>
          <p>These partners support the broader Patriots in Action network across counties, states, events, media, rewards, and merchandise.</p>
          <PartnerList partners={nationwidePartners} />
          <div className="actions">
            <Link className="button primary" to="/partners">See All Partners</Link>
          </div>
        </div>
      </section>
    </>
  );
}

function PartnerList({ county, partners, showCountyScope = false }: { county?: CountySite; partners: Partner[]; showCountyScope?: boolean }) {
  return (
    <ul className="partner-list">
      {partners.map((partner) => (
        <li key={partner.name}>
          <article className="partner-card">
            {partner.image ? <img src={partner.image} alt="" loading="lazy" /> : null}
            <div className="partner-card-copy">
              <a className="partner-card-title" href={county && partner.name === "The Patriot Merch Store" ? county.links.merch : partner.href} target="_blank" rel="noreferrer">
                {partner.name}
              </a>
              <p>{partner.description}</p>
              {showCountyScope && partner.countyKeys?.length ? (
                <div className="partner-county-scope">
                  <span>County founding partners:</span>
                  <div className="partner-county-links">
                    {partner.countyKeys.map((key) => {
                      const countyScope = countyScopeForKey(key);
                      return (
                        <Link className="partner-county-link" key={key} to={countyScope.path}>
                          {countyScope.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}

function countyScopeForKey(key: string) {
  const [stateSlug, countySlug] = key.split("/");
  const state = getStateBySlug(stateSlug);
  const county = getCounty(stateSlug, countySlug);
  return {
    label: county && state ? `${county.displayName}, ${state.name}` : key,
    path: county && state ? countyPath(county) : "/counties",
  };
}

function CountyContact({ county }: { county: CountySite }) {
  return (
    <>
      <PageHero eyebrow={county.displayName} title="Connect with us" subtitle="Reach your county Patriot Network." />
      <CountyShowUpMeter county={county} />
      <section className="section split top-align">
        <div className="panel">
          <h2>Contact</h2>
          <p><strong>Phone:</strong> {county.phone || site.contact.phone}</p>
          <p><strong>Email:</strong> <a href={`mailto:${county.email}`}>{county.email}</a></p>
          <p><strong>Community:</strong> <a href={county.links.community}>Join the movement</a></p>
        </div>
        <CountyForm county={county} kind="contact" />
      </section>
    </>
  );
}

function CountySubmitEvent({ county }: { county: CountySite }) {
  return (
    <>
      <PageHero eyebrow={county.displayName} title="Submit an event" subtitle="Approved events may be added to the community calendar." />
      <CountyShowUpMeter county={county} />
      <section className="section narrow">
        <CountyForm county={county} kind="event" />
      </section>
    </>
  );
}

type RssFeedWidgetProps = {
  county: CountySite;
  title: string;
  eyebrow: string;
  description: string;
  feedUrl: string;
  supplementalFeedUrl?: string;
  fallbackFeedUrl?: string;
  fallbackMarketCity?: string;
  emptyText: string;
  presentedBy?: (typeof preferredPartners)[number];
  topic?: "general" | "obituaries" | "sports";
};

type CountyRssFeedWidgetProps = Omit<RssFeedWidgetProps, "fallbackFeedUrl" | "fallbackMarketCity" | "county"> & {
  county: CountySite;
  feedKind: CountyFeedKind;
};

function CountyRssFeedWidget({ county, feedKind, feedUrl, ...props }: CountyRssFeedWidgetProps) {
  const [fallbackFeedUrl, setFallbackFeedUrl] = useState<string>();
  const [fallbackMarketCity, setFallbackMarketCity] = useState<string>();

  useEffect(() => {
    let active = true;

    resolveNewsMarketCity(county).then((marketCity) => {
      if (!active) return;
      setFallbackMarketCity(marketCity);
      setFallbackFeedUrl(buildMarketFeedUrl(feedKind, marketCity, county.state));
    });

    return () => {
      active = false;
    };
  }, [county, feedKind]);

  return (
    <RssFeedWidget
      {...props}
      county={county}
      feedUrl={feedUrl}
      fallbackFeedUrl={fallbackFeedUrl}
      fallbackMarketCity={fallbackMarketCity}
    />
  );
}

function countyFeedLabel(topic: RssFeedWidgetProps["topic"]) {
  if (topic === "obituaries") return "obituary results";
  if (topic === "sports") return "sports coverage";
  return "local news";
}

function RssFeedWidget({
  county,
  title,
  eyebrow,
  description,
  feedUrl,
  supplementalFeedUrl,
  fallbackFeedUrl,
  fallbackMarketCity,
  emptyText,
  presentedBy,
  topic = "general",
}: RssFeedWidgetProps) {
  const [items, setItems] = useState<NewsFeedItem[]>([]);
  const [activeFeedUrl, setActiveFeedUrl] = useState(feedUrl);
  const [usedFallback, setUsedFallback] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [status, setStatus] = useState("Loading feed...");

  useEffect(() => {
    let active = true;

    function applyFeedFilters(parsed: NewsFeedItem[], isFallback: boolean) {
      return filterFeedItemsByRegion(filterFeedItemsByTopic(parsed, topic), {
        county,
        marketCity: fallbackMarketCity,
        usedFallback: isFallback,
      });
    }

    async function fetchMergedFeedItems(...urls: Array<string | undefined>) {
      const uniqueUrls = [...new Set(urls.filter((url): url is string => Boolean(url)))];
      const results = await Promise.allSettled(uniqueUrls.map((url) => fetchRssFeedItems(url)));
      return mergeFeedItems(
        results
          .filter((result): result is PromiseFulfilledResult<NewsFeedItem[]> => result.status === "fulfilled")
          .map((result) => result.value),
      );
    }

    async function loadFeed() {
      let topicItems: NewsFeedItem[] = [];
      let nextUsedFallback = false;
      let nextActiveFeedUrl = feedUrl;

      try {
        const parsed = await fetchMergedFeedItems(feedUrl, supplementalFeedUrl);
        topicItems = applyFeedFilters(parsed, false);
      } catch {
        // Primary county feed failed; try the nearby market feed below.
      }

      if (
        topicItems.length < RSS_FEED_MIN_ITEMS &&
        fallbackFeedUrl &&
        fallbackFeedUrl !== feedUrl
      ) {
        try {
          const fallbackParsed = await fetchRssFeedItems(fallbackFeedUrl);
          const fallbackTopicItems = applyFeedFilters(fallbackParsed, true);
          if (fallbackTopicItems.length > topicItems.length) {
            topicItems = fallbackTopicItems;
            nextUsedFallback = true;
            nextActiveFeedUrl = fallbackFeedUrl;
          }
        } catch {
          if (!topicItems.length) {
            if (!active) return;
            setItems([]);
            setActiveFeedUrl(feedUrl);
            setUsedFallback(false);
            setVisibleCount(5);
            setStatus("This feed could not be loaded right now.");
            return;
          }
        }
      }

      if (!active) return;

      setItems(topicItems);
      setActiveFeedUrl(nextActiveFeedUrl);
      setUsedFallback(nextUsedFallback);
      setVisibleCount(5);
      if (topicItems.length) {
        setStatus(
          nextUsedFallback && fallbackMarketCity
            ? `Limited ${countyFeedLabel(topic)} for this county. Showing nearby coverage from ${fallbackMarketCity}.`
            : "",
        );
      } else {
        setStatus(emptyText);
      }
    }

    loadFeed().catch(() => {
      if (!active) return;
      setItems([]);
      setActiveFeedUrl(feedUrl);
      setUsedFallback(false);
      setVisibleCount(5);
      setStatus("This feed could not be loaded right now.");
    });

    return () => {
      active = false;
    };
  }, [county, emptyText, fallbackFeedUrl, fallbackMarketCity, feedUrl, supplementalFeedUrl, topic]);

  const orderedItems = [...items].sort((first, second) => feedItemTimestamp(second) - feedItemTimestamp(first));
  const visibleItems = orderedItems.slice(0, visibleCount);
  const hasMore = visibleCount < orderedItems.length;
  const feedSource = readableFeedSource(activeFeedUrl);

  return (
    <article className="feed-widget">
      <div className="feed-hero">
        <div className="feed-hero-title">
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
        </div>
        {presentedBy ? (
          <a className="feed-presented-by" href={presentedBy.href} target="_blank" rel="noreferrer">
            {presentedBy.image ? <img src={presentedBy.image} alt="" loading="lazy" /> : null}
            <span>Presented by</span>
            <strong>{presentedBy.name}</strong>
          </a>
        ) : null}
        <p className="feed-hero-description">{description}</p>
      </div>
      {status ? <p className={`status${usedFallback ? " feed-fallback-notice" : ""}`}>{status}</p> : null}
      <div className="feed-list scroll-feed" onScroll={(event) => handleScrollLoadMore(event, hasMore, () => setVisibleCount((count) => count + 5))}>
        {visibleItems.map((item) => (
          <a className={item.imageUrl ? "feed-item" : "feed-item no-image"} href={item.link} key={item.id} target="_blank" rel="noreferrer">
            {item.imageUrl ? <img src={item.imageUrl} alt="" /> : null}
            <div>
              <strong>{item.title}</strong>
              <span>{[item.source, formatFeedDate(item.publishedAt)].filter(Boolean).join(" | ")}</span>
              {item.description ? <p>{item.description}</p> : null}
            </div>
          </a>
        ))}
        {hasMore ? <p className="feed-more">Scroll for more</p> : null}
      </div>
      <a className="feed-source" href={feedSource.href} target="_blank" rel="noreferrer">{feedSource.label}</a>
    </article>
  );
}

function CountyNewsSection({ county, page }: { county: CountySite; page: CountyPageKey }) {
  return (
    <section className="section news-section">
      <div className="section-heading">
        <p className="eyebrow">County Newsroom</p>
        <h2>Local news feeds for {county.displayName}</h2>
        <p>Follow local articles, sports, video coverage, obituaries, and Patriots in Action TV from one county news section.</p>
      </div>
      <div className="feed-layout">
        <div className="feed-pair">
          <CountyRssFeedWidget
            county={county}
            feedKind="localNews"
            eyebrow="Local Articles"
            title="County & City News"
            description={`Online news articles focused on ${county.displayName} and nearby city coverage.`}
            feedUrl={county.feeds.localNewsUrl}
            emptyText="No local article results are available yet."
            presentedBy={countyPartner(county, "CBT Real Estate Services")}
          />
          <CountyRssFeedWidget
            county={county}
            feedKind="obituaries"
            eyebrow="Obituaries"
            title="Local Obituaries"
            description={`Recent obituary notices and memorial news for ${county.displayName}.`}
            feedUrl={county.feeds.obituariesUrl}
            supplementalFeedUrl={county.feeds.localNewsUrl}
            emptyText="No local obituary results are available yet."
            presentedBy={preferredPartner("Patriot Rewards")}
            topic="obituaries"
          />
        </div>
        <div className="news-sponsor-mid-row">
          <AdSlot
            adIds={countyNewsMidRowAdIds}
            county={county}
            page={page}
            route="county"
            slot="county-news-mid-inline"
          />
        </div>
        <div className="feed-pair">
          <CountyRssFeedWidget
            county={county}
            feedKind="localVideo"
            eyebrow="Local Video"
            title="County News Videos"
            description={`Video news coverage mentioning ${county.displayName}, local communities, and civic updates.`}
            feedUrl={county.feeds.localVideoUrl}
            emptyText="No local video results are available yet."
            presentedBy={countyPartner(county, "Mattress By Appointment") || preferredPartner("Patriots in Action TV")}
          />
          <VimeoFeed compact />
        </div>
      </div>
      <div className="feed-feature-row">
        <CountyRssFeedWidget
          county={county}
          feedKind="localSports"
          eyebrow="Local Sports"
          title="High School & College Sports"
          description={`Local high school, college, and athletics coverage connected to ${county.displayName}.`}
          feedUrl={county.feeds.localSportsUrl}
          emptyText="No local sports results are available yet."
          presentedBy={preferredPartner("piaevents.com")}
          topic="sports"
        />
      </div>
      <div className="news-sponsor-row">
        <AdSlot county={county} page={page} route="county" slot="county-news-inline" limit={5} />
        <a className="button primary" href={site.links.piaEvents}>Find Patriots in Action Events</a>
      </div>
    </section>
  );
}

function readableFeedSource(feedUrl: string) {
  try {
    const url = new URL(feedUrl);
    if (url.hostname === "news.google.com" && url.pathname.startsWith("/rss/search")) {
      const sourceUrl = new URL("https://news.google.com/search");
      const query = url.searchParams.get("q");
      if (query) sourceUrl.searchParams.set("q", query);
      sourceUrl.searchParams.set("hl", url.searchParams.get("hl") || "en-US");
      sourceUrl.searchParams.set("gl", url.searchParams.get("gl") || "US");
      sourceUrl.searchParams.set("ceid", url.searchParams.get("ceid") || "US:en");
      return { href: sourceUrl.toString(), label: "Open Google News results" };
    }

    if (url.hostname === "news.google.com" && url.pathname.startsWith("/rss")) {
      url.pathname = url.pathname.replace(/^\/rss/, "") || "/";
      return { href: url.toString(), label: "Open news source" };
    }
  } catch {
    return { href: feedUrl, label: "Open source" };
  }

  return { href: feedUrl, label: "Open source" };
}

function handleScrollLoadMore(event: UIEvent<HTMLElement>, hasMore: boolean, loadMore: () => void) {
  if (!hasMore) return;
  const element = event.currentTarget;
  const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
  if (isNearBottom) loadMore();
}

function feedItemTimestamp(item: NewsFeedItem) {
  const timestamp = item.publishedAt ? new Date(item.publishedAt).getTime() : 0;
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function mergeFeedItems(groups: NewsFeedItem[][]) {
  const deduped = new Map<string, NewsFeedItem>();

  for (const items of groups) {
    for (const item of items) {
      const key = item.link || item.id;
      if (!deduped.has(key)) deduped.set(key, item);
    }
  }

  return [...deduped.values()];
}

function filterFeedItemsByTopic(items: NewsFeedItem[], topic: RssFeedWidgetProps["topic"]) {
  if (topic === "obituaries") return items.filter(isObituaryFeedItem);
  if (topic === "sports") return items.filter(isSportsFeedItem);
  return items.filter((item) => !isObituaryFeedItem(item));
}

function feedSearchText(item: NewsFeedItem) {
  return [item.title, item.description, item.source].filter(Boolean).join(" ").toLowerCase();
}

function isObituaryFeedItem(item: NewsFeedItem) {
  const text = feedSearchText(item);
  return [
    "obituary",
    "obituaries",
    "death notice",
    "funeral service",
    "funeral home",
    "funeral",
    "memorial service",
    "celebration of life",
    "passed away",
    "survived by",
    "preceded in death",
    "visitation",
    "interment",
    "in memory",
    "legacy.com",
    "tributes",
  ].some((keyword) => text.includes(keyword));
}

function isSportsFeedItem(item: NewsFeedItem) {
  const text = feedSearchText(item);
  if ([
    "arrest",
    "arrested",
    "charged",
    "crash",
    "dead",
    "death",
    "deputies",
    "dies",
    "fire",
    "funeral",
    "killed",
    "murder",
    "obituary",
    "police",
    "shooting",
    "victim",
    "wanted",
  ].some((keyword) => text.includes(keyword))) {
    return false;
  }

  return [
    "sports",
    "athletic",
    "athletics",
    "football",
    "basketball",
    "baseball",
    "softball",
    "volleyball",
    "soccer",
    "track",
    "track & field",
    "track and field",
    "cross country",
    "wrestling",
    "tennis",
    "golf",
    "swimming",
    "cheer",
    "coach",
    "athlete",
    "playoff",
    "tournament",
    "scoreboard",
    "uil",
    "ncaa",
    "regional meet",
    "state meet",
  ].some((keyword) => text.includes(keyword));
}

function EventCalendar({ county, compact = false, page = "events" }: { county: CountySite; compact?: boolean; page?: CountyPageKey }) {
  const feedUrl = county.calendar.icsUrl;
  const mightySpaceId = county.mightySpaceId;
  const hasMightyApi = Boolean(mightySpaceId && mightyIsConfigured());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [status, setStatus] = useState("Loading community events...");
  const [mightyError, setMightyError] = useState(false);
  const presentedBy = countyPartner(county, "Mattress By Appointment") || preferredPartner("piaevents.com");

  useEffect(() => {
    let active = true;

    async function loadFromMighty() {
      if (!hasMightyApi || !mightySpaceId) return false;
      try {
        setMightyError(false);
        const items = await fetchMightyEvents(mightySpaceId, 100);
        if (!active) return true;
        const normalized: CalendarEvent[] = items
          .flatMap((event) => {
            const startRaw = event.starts_at || event.published_at || event.created_at;
            if (!startRaw) return [];
            const start = new Date(startRaw);
            const end = event.ends_at ? new Date(event.ends_at) : undefined;
            const calendarEvent: CalendarEvent = {
              id: `mn-${event.id}`,
              title: event.title || event.summary || "Community event",
              start,
              end,
              eventLink: event.permalink || event.link || undefined,
              location: event.location || undefined,
              isAllDay: false,
            };
            return [calendarEvent];
          })
          .sort((a, b) => a.start.getTime() - b.start.getTime());

        setEvents(normalized);
        setStatus(normalized.length ? "" : "No upcoming events are listed yet.");
        return true;
      } catch (error) {
        if (active) {
          setStatus("");
          setMightyError(true);
        }
        return false;
      }
    }

    async function loadFromIcs() {
      if (!feedUrl) {
        setEvents([]);
        setStatus("No calendar feed has been added for this county yet.");
        return;
      }

      try {
        const text = await fetchCalendarFeed(feedUrl);
        if (!active) return;
        const parsed = parseIcsEvents(text);
        setEvents(parsed);
        setStatus(parsed.length ? "" : "No upcoming events are listed yet.");
      } catch (error) {
        if (active) setStatus("The calendar feed could not be loaded right now.");
      }
    }

    (async () => {
      if (await loadFromMighty()) return;
      await loadFromIcs();
    })();

    return () => {
      active = false;
    };
  }, [feedUrl, hasMightyApi, mightySpaceId]);

  const visible = compact ? events.slice(0, 3) : events.slice(0, 12);
  const displayedStatus = status;

  return (
    <div className="panel">
      <div className="panel-heading">
        <p className="eyebrow">Community Calendar</p>
        <h2>Upcoming Events</h2>
        {presentedBy ? (
          <a className="feed-presented-by calendar-presented-by" href={presentedBy.href} target="_blank" rel="noreferrer">
            {presentedBy.image ? <img src={presentedBy.image} alt="" loading="lazy" /> : null}
            <span>Presented by</span>
            <strong>{presentedBy.name}</strong>
          </a>
        ) : null}
      </div>
      {mightyError ? (
        <div className="panel" style={{ marginBottom: "1rem" }}>
          <p>The community calendar can&rsquo;t be loaded right now.</p>
          <a className="button primary" href={county.links.community} target="_blank" rel="noreferrer">
            Join your county&apos;s Patriot Network to see the calendar
          </a>
        </div>
      ) : null}
      {displayedStatus ? <p>{displayedStatus}</p> : null}
      <div className="event-list">
        {visible.map((event) => (
          <article className="event-card" key={event.id}>
            <strong>{event.title}</strong>
            <span>{formatDate(event)} {event.isAllDay ? "All day" : formatTime(event)}</span>
            {event.location ? <span>{event.location}</span> : null}
            {event.eventLink ? <a href={event.eventLink}>View event</a> : null}
          </article>
        ))}
      </div>
      {!compact ? <AdSlot county={county} page={page} route="county" slot="county-calendar-inline" limit={4} /> : null}
    </div>
  );
}

function CountyCommunityFeed({ county }: { county: CountySite }) {
  const mightySpaceId = county.mightySpaceId;
  const hasMightyApi = Boolean(mightySpaceId && mightyIsConfigured());
  const [posts, setPosts] = useState<Awaited<ReturnType<typeof fetchMightyFeed>>>([]);
  const [status, setStatus] = useState(hasMightyApi ? "Loading Patriot Network feed..." : "");
  const [fetchError, setFetchError] = useState(false);
  const [visibleCount, setVisibleCount] = useState(8);

  useEffect(() => {
    let active = true;

    if (!hasMightyApi || !mightySpaceId) {
      setPosts([]);
      setStatus("Join The Patriot Network to see county community posts.");
      return () => {
        active = false;
      };
    }

    setStatus("Loading Patriot Network feed...");
    setFetchError(false);
    setVisibleCount(8);
    fetchMightyFeed(mightySpaceId, 40)
      .then((data) => {
        if (!active) return;
        setPosts(data);
        setStatus(data.length ? "" : "No community posts yet. Check back soon!");
      })
      .catch(() => {
        if (!active) return;
        setPosts([]);
        setStatus("");
        setFetchError(true);
      });

    return () => {
      active = false;
    };
  }, [hasMightyApi, mightySpaceId]);

  const visible = posts.slice(0, visibleCount);
  const hasMore = visibleCount < posts.length;

  function postTitle(post: (typeof posts)[number]) {
    const text = (post.title || post.summary || "Community update")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const words = text.split(" ");
    return words.length > 10 ? `${words.slice(0, 10).join(" ")}…` : text;
  }

  function postImage(post: (typeof posts)[number]) {
    return post.images?.find(Boolean) || patriotDispatchFallback;
  }

  return (
    <section className="section" style={{ textAlign: "center" }}>
      <div className="section-heading">
        <p className="eyebrow">Patriot Network</p>
        <h2>{county.displayName} Community Feed</h2>
        <p>Updates from the {county.displayName} space on Patriots in Action.</p>
      </div>
      {status ? <p className="status">{status}</p> : null}
      {fetchError ? (
        <div className="panel" style={{ maxWidth: "720px", margin: "0 auto 1rem" }}>
          <p>The community feed can&rsquo;t be loaded right now.</p>
          <a className="button primary" href={county.links.community} target="_blank" rel="noreferrer">
            Join your county&apos;s Patriot Network to see the feed
          </a>
        </div>
      ) : null}
      <div className="feed-list scroll-feed" style={{ maxWidth: "960px", margin: "0 auto" }} onScroll={(event) => handleScrollLoadMore(event, hasMore, () => setVisibleCount((count) => count + 6))}>
        {visible.map((post) => (
          <a className="feed-item" href={post.permalink || county.links.community} key={`mn-${post.id}`} target="_blank" rel="noreferrer">
            <img src={postImage(post) as string} alt="" />
            <div>
              <strong>{postTitle(post)}</strong>
              <span>{formatFeedDate(post.updated_at || post.created_at || "")}</span>
            </div>
          </a>
        ))}
        {hasMore ? <p className="feed-more">Scroll for more</p> : posts.length ? <p className="feed-more">Join The Patriot Network to See More</p> : null}
      </div>
      <div className="actions" style={{ justifyContent: "center", marginTop: "1rem" }}>
        <a className="button primary" href={county.links.community} target="_blank" rel="noreferrer">
          Join The Patriot Network
        </a>
      </div>
    </section>
  );
}

function VimeoFeed({ compact = false }: { compact?: boolean }) {
  const [videos, setVideos] = useState<NewsFeedItem[]>([]);
  const [status, setStatus] = useState("Loading videos...");
  const [visibleCount, setVisibleCount] = useState(compact ? 8 : 12);

  useEffect(() => {
    let active = true;

    fetchRssFeedItems(site.links.vimeoTvRss)
      .then((items) => {
        if (!active) return;
        setVideos(items);
        setVisibleCount(compact ? 8 : 12);
        setStatus(items.length ? "" : "No videos found in this Vimeo feed.");
      })
      .catch(() => {
        if (!active) return;
        setVideos([]);
        setVisibleCount(compact ? 8 : 12);
        setStatus("Could not load the Vimeo feed right now.");
      });

    return () => {
      active = false;
    };
  }, [compact]);

  const visibleVideos = videos.slice(0, visibleCount);
  const hasMore = visibleCount < videos.length;
  const piaTvPartner = preferredPartner("Patriots in Action TV");

  return (
    <section className={compact ? "feed-widget" : "section"}>
      {compact ? (
        <div className="feed-hero">
          <div className="feed-hero-title">
            <p className="eyebrow">Patriots in Action TV</p>
            <h3>PIA Video Feed</h3>
          </div>
          {piaTvPartner ? (
            <Link className="feed-presented-by" to="/tv">
              {piaTvPartner.image ? <img src={piaTvPartner.image} alt="" loading="lazy" /> : null}
              <span>Presented by</span>
              <strong>{piaTvPartner.name}</strong>
            </Link>
          ) : null}
          <p className="feed-hero-description">Latest videos from <Link to="/tv">Patriots in Action TV</Link>.</p>
        </div>
      ) : null}
      {status ? <p className="status">{status}</p> : null}
      <div className="feed-list video-feed scroll-feed" onScroll={(event) => handleScrollLoadMore(event, hasMore, () => setVisibleCount((count) => count + (compact ? 8 : 12)))}>
        {visibleVideos.map((video) => {
          return (
            <a className={video.imageUrl ? "feed-item video-feed-item" : "feed-item video-feed-item no-image"} href={video.link || "/tv"} key={video.id} target="_blank" rel="noreferrer">
              {video.imageUrl ? <img src={video.imageUrl} alt="" /> : null}
              <div>
                <strong>{video.title || "Patriots in Action TV"}</strong>
                <span>{["Vimeo", formatFeedDate(video.publishedAt)].filter(Boolean).join(" | ")}</span>
                {video.description ? <p>{video.description}</p> : null}
              </div>
            </a>
          );
        })}
        {hasMore ? <p className="feed-more">Scroll for more</p> : null}
      </div>
      {!compact && hasMore ? (
        <button className="button primary" type="button" onClick={() => setVisibleCount((count) => count + 12)}>
          Load more videos
        </button>
      ) : null}
      {compact ? <Link className="feed-source" to="/tv">Open PIA TV</Link> : null}
    </section>
  );
}

function SiteContactForm() {
  const [status, setStatus] = useState<{ message: string; tone: "success" | "error" } | undefined>();
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (form.get("website")) return;
    const values = Object.fromEntries(form.entries()) as Record<string, string>;

    setSending(true);
    setStatus(undefined);
    try {
      await sendSiteContactEmail({
        title: "General contact form",
        replyTo: values.email,
        values: {
          ...values,
          sponsorInterest: values.sponsorInterest === "on",
          consent: values.consent === "on",
        },
      });
      formElement.reset();
      setStatus({
        tone: "success",
        message: "Your message has been sent. You can expect a reply from a @patriotsinaction.com email.",
      });
    } catch {
      setStatus({
        tone: "error",
        message: `Submission failed. Please try again or email us directly at ${site.contact.email}.`,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <label className="honeypot">Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      <FormInput name="name" label="Name" required />
      <FormInput name="email" label="Email" type="email" required />
      <FormInput name="phone" label="Phone" />
      <FormInput name="subject" label="Subject" required />
      <FormInput name="message" label="Message" textarea required />
      <SponsorInterestCheckbox />
      <ConsentCheckbox />
      {status ? <p className={`status form-status-${status.tone}`}>{status.message}</p> : null}
      <button className="button primary" type="submit" disabled={sending}>{sending ? "Sending..." : "Send Message"}</button>
      <p className="privacy-reassurance">Your Information Stays Safe With US. <Link to="/privacy">Read our Privacy Policy</Link>.</p>
    </form>
  );
}

function CountyForm({ county, kind }: { county: CountySite; kind: "contact" | "event" }) {
  const [status, setStatus] = useState<{ message: string; tone: "success" | "error" } | undefined>();
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (form.get("website")) return;
    const values = Object.fromEntries(form.entries()) as Record<string, string>;

    setSending(true);
    setStatus(undefined);
    try {
      await sendCountyFormEmail({
        county,
        title: kind === "contact" ? "County contact form" : "County event submission",
        replyTo: values.email || values.submitterEmail,
        values: {
          ...values,
          sponsorInterest: values.sponsorInterest === "on",
          consent: values.consent === "on",
        },
      });
      formElement.reset();
      setStatus({
        tone: "success",
        message:
          kind === "contact"
            ? "Your message has been sent. You can expect a reply from a @patriotsinaction.com email."
            : "Thank you. Your event has been submitted for review. You can expect a reply from a @patriotsinaction.com email.",
      });
    } catch {
      setStatus({
        tone: "error",
        message: `Submission failed. Please try again or email us directly at ${site.contact.email}.`,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <input type="hidden" name="county" value={`${county.displayName}, ${county.state.name}`} />
      <label className="honeypot">Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      {kind === "contact" ? (
        <>
          <FormInput name="name" label="Name" required />
          <FormInput name="email" label="Email" type="email" required />
          <FormInput name="phone" label="Phone" />
          <FormInput name="subject" label="Subject" required />
          <FormInput name="message" label="Message" textarea required />
          <SponsorInterestCheckbox />
          <ConsentCheckbox />
        </>
      ) : (
        <>
          <FormInput name="submitterName" label="Your Name" required />
          <FormInput name="submitterEmail" label="Your Email" type="email" required />
          <FormInput name="submitterPhone" label="Phone" />
          <FormInput name="eventName" label="Event Name" required />
          <FormInput name="eventDate" label="Event Date" type="date" required />
          <FormInput name="eventStartTime" label="Start Time" type="time" />
          <FormInput name="eventEndTime" label="End Time" type="time" />
          <FormInput name="eventLocation" label="Event Location" />
          <FormInput name="eventAddress" label="Event Address" />
          <FormInput name="eventUrl" label="Event URL / Community Link" type="url" />
          <FormInput name="eventDescription" label="Event Description" textarea required />
          <label className="checkbox">
            <input name="eventReviewAck" type="checkbox" required />
            <span>I understand this submission will be reviewed before being added to the calendar.</span>
          </label>
          <ConsentCheckbox />
        </>
      )}
      {status ? <p className={`status form-status-${status.tone}`}>{status.message}</p> : null}
      <button className="button primary" type="submit" disabled={sending}>{sending ? "Sending..." : kind === "contact" ? "Send Message" : "Submit Event"}</button>
      <p className="privacy-reassurance">Your Information Stays Safe With US. <Link to="/privacy">Read our Privacy Policy</Link>.</p>
    </form>
  );
}

function FormInput({ name, label, type = "text", required = false, textarea = false }: { name: string; label: string; type?: string; required?: boolean; textarea?: boolean }) {
  return (
    <label className="field">
      <span>{label}{required ? " *" : ""}</span>
      {textarea ? <textarea name={name} required={required} rows={5} /> : <input name={name} type={type} required={required} />}
    </label>
  );
}

function SponsorInterestCheckbox() {
  return (
    <label className="checkbox sponsor-interest-checkbox">
      <input name="sponsorInterest" type="checkbox" />
      <span>I am interested in becoming a sponsor or buying ad space.</span>
    </label>
  );
}

function ConsentCheckbox() {
  return (
    <label className="checkbox consent-checkbox">
      <input name="consent" type="checkbox" required />
      <span>
        I consent to receive marketing, donation-related, and informational emails, calls and text messages from Patriots in
        Action, including pre-recorded messages and via automated methods. Msg &amp; data rates may apply. Msg frequency may
        vary. Reply &ldquo;STOP&rdquo; to opt-out and &ldquo;HELP&rdquo; for help. I have read and agree to the{" "}
        <Link to="/privacy">Privacy Policy</Link> and <Link to="/terms">Terms &amp; Conditions</Link>.
      </span>
    </label>
  );
}

function CountyShell({ county, page, children }: { county: CountySite; page: CountyPageKey; children: ReactNode }) {
  const base = countyPath(county);
  return (
    <Shell county={county} page={page} route="county">
      <nav className="county-tabs" aria-label={`${county.displayName} pages`}>
        {countyPages.map((page) => (
          <NavLink key={page.key} end={page.key === "home"} to={page.key === "home" ? base : `${base}/${page.key}`}>
            {page.label}
          </NavLink>
        ))}
      </nav>
      {children}
    </Shell>
  );
}

function Shell({
  county,
  children,
  page,
  route,
  suppressAdRails = false,
}: {
  county?: CountySite;
  children: ReactNode;
  page?: CountyPageKey;
  route: AdRouteType;
  suppressAdRails?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const showAdRails = false;

  return (
    <>
      <TopTicker county={county} weatherSponsor={county ? countyWeatherSponsor(county) : undefined} />
      <header className="topbar">
        <div className="container topbar-inner">
          <span>Meet Your Neighbors!</span>
          <a href={`tel:${site.contact.phoneDial}`}>{site.contact.phone}</a>
          <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
        </div>
      </header>
      <header className="site-header">
        <div className="container header-inner">
          <Link className="brand" to="/">
            <img src={site.brand.icon} alt="" />
            <span>{site.name}</span>
          </Link>
          <button
            className="menu-toggle"
            type="button"
            aria-controls="site-navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
            <span className="sr-only">Toggle navigation</span>
          </button>
          <nav id="site-navigation" className={menuOpen ? "site-nav open" : "site-nav"} onClick={() => setMenuOpen(false)}>
            <Link to="/counties">Counties</Link>
            <Link to="/rewards">Rewards</Link>
            <Link to="/partners">Partners</Link>
            <a href={site.links.community}>Community</a>
            <Link to="/tx/candidates">Candidates</Link>
            <Link to="/tv">PIA TV</Link>
            <Link to="/contact">Contact</Link>
            <a href={site.links.merch} target="_blank" rel="noreferrer">Merch</a>
          </nav>
        </div>
      </header>
      <main className={showAdRails ? "shell-content-frame" : "container"}>
        {showAdRails ? <AdSlot county={county} page={page} route={route} slot="site-left-rail" /> : null}
        <div className={showAdRails ? "container shell-main-content" : "shell-page-stack"}>
          {children}
          <div className="shell-pre-footer">
            {route !== "directory" && route !== "state" && !(route === "county" && page === "candidates") ? (
              <PatriotNetworkCommunityBanner />
            ) : null}
            {route === "county" && county ? (
              <AdSlot county={county} page={page} route="county" slot="county-page-footer" limit={6} />
            ) : !suppressAdRails ? (
              <AdSlot county={county} page={page} route={route} slot="site-footer" limit={6} />
            ) : null}
          </div>
        </div>
        {showAdRails ? <AdSlot county={county} page={page} route={route} slot="site-right-rail" /> : null}
      </main>
      <Footer />
      {county ? <CountyBookmarkToast county={county} /> : null}
    </>
  );
}

function CountyBookmarkToast({ county }: { county: CountySite }) {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState("");
  const storageKey = `pia-bookmark-toast-dismissed:${county.state.slug}/${county.slug}`;
  const countyUrl = typeof window === "undefined" ? countyPath(county) : new URL(countyPath(county), window.location.origin).toString();
  const bookmarkTitle = `${county.displayName}, ${county.state.name} | ${site.name}`;

  useEffect(() => {
    setStatus("");
    try {
      setVisible(window.sessionStorage.getItem(storageKey) !== "true");
    } catch {
      setVisible(true);
    }
  }, [storageKey]);

  if (!visible) return null;

  function dismiss() {
    try {
      window.sessionStorage.setItem(storageKey, "true");
    } catch {
      // Ignore storage failures; the toast can still close for this render.
    }
    setVisible(false);
  }

  async function handleBookmark() {
    const legacyWindow = window as Window & {
      external?: { AddFavorite?: (url: string, title: string) => void };
      sidebar?: { addPanel?: (title: string, url: string, content?: string) => void };
    };

    try {
      if (legacyWindow.external?.AddFavorite) {
        legacyWindow.external.AddFavorite(countyUrl, bookmarkTitle);
        setStatus("Bookmark prompt opened.");
        return;
      }
      if (legacyWindow.sidebar?.addPanel) {
        legacyWindow.sidebar.addPanel(bookmarkTitle, countyUrl, "");
        setStatus("Bookmark prompt opened.");
        return;
      }
    } catch {
      // Modern browsers may expose but block legacy bookmark APIs.
    }

    try {
      await navigator.clipboard.writeText(countyUrl);
      setStatus("Link copied.");
    } catch {
      setStatus("Use the instructions below to save this county.");
    }
  }

  return (
    <aside className="bookmark-toast" role="status" aria-live="polite">
      <button className="bookmark-toast-close" type="button" onClick={dismiss} aria-label="Dismiss bookmark reminder">x</button>
      <p className="eyebrow">Save Your County</p>
      <h2>Bookmark {county.displayName}</h2>
      <p>Keep your home county or counties handy so you can get back to local updates, weather, candidates, and events quickly.</p>
      <div className="bookmark-toast-actions">
        <button className="button primary" type="button" onClick={handleBookmark}>Bookmark this county</button>
        <button className="button" type="button" onClick={dismiss}>Not now</button>
      </div>
      {status ? (
        <div className="bookmark-toast-instructions">
          <p className="bookmark-toast-status">{status}</p>
          <p><strong>Desktop:</strong> Press Ctrl+D on Windows/Linux or Cmd+D on Mac.</p>
          <p><strong>Mobile:</strong> iPhone/iPad: tap Share, then Add Bookmark or Add to Home Screen. Android: tap the browser menu, then Star or Add to Home screen.</p>
        </div>
      ) : null}
    </aside>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <img src={site.brand.footerLogo} alt={site.name} />
          <p>{site.tagline}</p>
          <p>Patriots Connect, LLC, DBA Patriots in Action, is an independent, privately owned business and is not sponsored by, controlled by, or officially associated with any political party or candidate.</p>
        </div>
        <div>
          <h3>Stay informed</h3>
          <Link to="/counties">County Directory</Link>
          <Link to="/rewards">Patriot Rewards</Link>
          <Link to="/partners">Patriot Partners</Link>
          <a href={site.links.community}>Join Our Interactive Community</a>
          <a href={site.links.merch} target="_blank" rel="noreferrer">Merch Store</a>
        </div>
        <div>
          <h3>Contact</h3>
          <a href={`tel:${site.contact.phoneDial}`}>{site.contact.phone}</a>
          <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </div>
      </div>
    </footer>
  );
}

function HeroMedia() {
  return (
    <div className="hero-media">
      <img className="hero-main-image" src={site.brand.americanHeader} alt="American flag and civic action artwork" />
    </div>
  );
}

function PatriotReachNote() {
  return (
    <p className="patriot-reach-note">
      We reach <strong>6 million Patriots</strong> a month.
    </p>
  );
}

function PageHero({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <section className="page-hero">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </section>
  );
}

function ActionGrid({ county, embedded = false }: { county: CountySite; embedded?: boolean }) {
  const cards = (
    <div className="card-grid four">
      <ResourceCard title="Precinct Map" href={county.links.precinctMap} />
      <ResourceCard title="Voting Locations" href={county.links.votingLocations} />
      <ResourceCard title="Sample Ballot" href={county.links.sampleBallot} />
      <ResourceCard title="Register to Vote" href={county.links.registerToVote} />
      <ResourceCard title="Local Elected Officials" href={county.links.localOfficials} />
      <ResourceCard title="State Elected Officials" href={county.links.stateOfficials} />
      <ResourceCard title="Federal Elected Officials" href={county.links.federalOfficials} />
      <ResourceCard title="County Party" href={county.links.countyParty} />
    </div>
  );

  if (embedded) return cards;

  return <section className="section">{cards}</section>;
}

function CustomBlocks({ county, page }: { county: CountySite; page: CountyPageKey }) {
  const blocks = county.customBlocks?.[page] || [];
  if (!blocks.length) return null;

  return (
    <section className="section">
      <div className="card-grid">
        {blocks.map((block) => (
          <InfoCard key={block.title} title={block.title} body={block.body} href={block.href} cta={block.cta} />
        ))}
      </div>
    </section>
  );
}

type CandidateFilterOptions = {
  search: string;
  jurisdiction: string;
  scope: string;
  sort: string;
};

function CandidateFilters({
  jurisdictions,
  jurisdiction,
  scope,
  scopes,
  search,
  sort,
  total,
  visible,
  onJurisdictionChange,
  onScopeChange,
  onSearchChange,
  onSortChange,
}: {
  jurisdictions: string[];
  jurisdiction: string;
  scope: string;
  scopes: string[];
  search: string;
  sort: string;
  total: number;
  visible: number;
  onJurisdictionChange: (value: string) => void;
  onScopeChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: string) => void;
}) {
  return (
    <section className="candidate-filters" aria-label="Filter candidates">
      <label className="field">
        <span>Search candidates</span>
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name, county, office, district..."
          type="search"
        />
      </label>
      <label className="field">
        <span>County / district</span>
        <select value={jurisdiction} onChange={(event) => onJurisdictionChange(event.target.value)}>
          <option value="all">All available areas</option>
          {jurisdictions.map((area) => (
            <option key={area} value={area}>{area}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Race type</span>
        <select value={scope} onChange={(event) => onScopeChange(event.target.value)}>
          <option value="all">All race types</option>
          {scopes.map((scopeName) => (
            <option key={scopeName} value={scopeName}>{candidateScopeLabel(scopeName)}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Sort by</span>
        <select value={sort} onChange={(event) => onSortChange(event.target.value)}>
          <option value="name">Name A-Z</option>
          <option value="office">Office A-Z</option>
          <option value="county">County A-Z</option>
          <option value="race-type">Race type</option>
        </select>
      </label>
      <p className="candidate-filter-count">{visible} of {total} candidates shown</p>
    </section>
  );
}

function candidateJurisdictionOptions(candidates: Candidate[]) {
  return [...new Set(candidates.map(candidateJurisdiction).filter(Boolean))].sort((first, second) => first.localeCompare(second));
}

function candidateScopeOptions(candidates: Candidate[]) {
  const scopeOrder = ["statewide", "district", "county", "precinct", "city"];
  const availableScopes = new Set(candidates.map((candidate) => candidate.scope));
  return scopeOrder.filter((scope) => availableScopes.has(scope as Candidate["scope"]));
}

function filterAndSortCandidates(candidates: Candidate[], options: CandidateFilterOptions) {
  const query = options.search.trim().toLowerCase();

  return candidates
    .filter((candidate) => {
      const matchesSearch = !query || [
        candidate.name,
        candidate.office,
        candidate.countyName,
        candidate.district,
        candidate.scope,
        candidate.party,
      ].some((value) => value?.toLowerCase().includes(query));
      const matchesJurisdiction = options.jurisdiction === "all" || candidate.scope === "statewide" || candidateJurisdiction(candidate) === options.jurisdiction;
      const matchesScope = options.scope === "all" || candidate.scope === options.scope;
      return matchesSearch && matchesJurisdiction && matchesScope;
    })
    .sort((first, second) => candidateSortValue(first, options.sort).localeCompare(candidateSortValue(second, options.sort)) || first.name.localeCompare(second.name));
}

function candidateSortValue(candidate: Candidate, sort: string) {
  if (sort === "office") return candidate.office;
  if (sort === "county") return candidateJurisdiction(candidate) || "Statewide";
  if (sort === "race-type") return candidate.scope;
  return candidate.name;
}

function candidateJurisdiction(candidate: Candidate) {
  return candidate.countyName || candidate.district || (candidate.scope === "statewide" ? "Statewide" : "");
}

function candidateScopeLabel(scope: string) {
  return scope.charAt(0).toUpperCase() + scope.slice(1);
}

function CandidateGrid({ candidates, emptyText, showCounty = false }: { candidates: Candidate[]; emptyText: string; showCounty?: boolean }) {
  const navigate = useNavigate();

  if (!candidates.length) return <p className="status">{emptyText}</p>;

  return (
    <div className="candidate-grid">
      {candidates.map((candidate) => (
        <article
          className="candidate-card candidate-card-clickable"
          key={candidate.id}
          role="link"
          tabIndex={0}
          onClick={(event) => {
            if (isInteractiveTarget(event.target)) return;
            navigate(candidateProfilePath(candidate));
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") navigate(candidateProfilePath(candidate));
          }}
        >
          {candidate.image ? <img className="candidate-photo" src={candidate.image} alt={candidate.name} /> : null}
          <div className="candidate-card-heading">
            <p className="eyebrow">{candidateLabel(candidate, showCounty)}</p>
            <h3>{candidate.name}</h3>
            <p>For {candidate.office}</p>
          </div>
          {candidate.videoEmbedUrl ? <CandidateVideoPreview candidate={candidate} /> : null}
          <CandidateDetails candidate={candidate} />
          <div className="actions candidate-card-actions">
            <Link className="button primary" to={candidateProfilePath(candidate)}>View Profile</Link>
            <ShareCandidateProfileButton candidate={candidate} />
          </div>
          {candidateProjectCandidateIds.has(candidate.id) ? (
            <div className="candidate-support">
              <a className="button red" href={candidateProjectUrl}>Help This Candidate Get Their Message Out</a>
              <CandidateProjectDisclaimer />
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("a, button, input, select, textarea, iframe"));
}

function CandidateProjectDisclaimer() {
  return (
    <p>
      {candidateProjectDisclaimer} <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.
    </p>
  );
}

function CandidateVideoPreview({ candidate }: { candidate: Candidate }) {
  const navigate = useNavigate();

  return (
    <button className="candidate-video-preview" type="button" onClick={() => navigate(candidateProfilePath(candidate))}>
      <iframe
        allow="autoplay; fullscreen; picture-in-picture"
        src={candidate.videoEmbedUrl}
        title={candidate.videoTitle || `${candidate.name} video`}
      />
      <span>Watch Interview</span>
    </button>
  );
}

function CandidateProfile({ candidate, backPath }: { candidate: Candidate; backPath: string }) {
  return (
    <article className="candidate-profile">
      <div className="candidate-profile-header">
        <div>
          <p className="eyebrow">Candidate Profile</p>
          <h1>{candidate.name}</h1>
          <p>For {candidate.office}</p>
        </div>
        <div className="actions">
          <Link className="button" to={backPath}>Back to Candidates</Link>
          <ShareCandidateProfileButton candidate={candidate} />
        </div>
      </div>
      <div className="candidate-profile-grid">
        <div className="candidate-profile-main">
          {candidate.videoEmbedUrl ? (
            <iframe
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              src={candidate.videoEmbedUrl}
              title={candidate.videoTitle || `${candidate.name} video`}
            />
          ) : candidate.image ? (
            <img src={candidate.image} alt={candidate.name} />
          ) : (
            <div className="candidate-profile-empty-video">No candidate video has been added yet.</div>
          )}
        </div>
        <aside className="candidate-profile-sidebar">
          {candidate.image ? <img className="candidate-profile-photo" src={candidate.image} alt={candidate.name} /> : null}
          <CandidateDetails candidate={candidate} showProfileLink />
          {candidateProjectCandidateIds.has(candidate.id) ? (
            <div className="candidate-support">
              <a className="button red" href={candidateProjectUrl}>Help This Candidate Get Their Message Out</a>
              <CandidateProjectDisclaimer />
            </div>
          ) : null}
        </aside>
      </div>
    </article>
  );
}

function ShareCandidateProfileButton({ candidate }: { candidate: Candidate }) {
  const [status, setStatus] = useState("");
  const path = candidateProfilePath(candidate);

  async function handleShare() {
    const url = new URL(path, window.location.origin).toString();

    try {
      await navigator.clipboard.writeText(url);
      setStatus("Copied");
      window.setTimeout(() => setStatus(""), 1800);
    } catch {
      setStatus("");
    }
  }

  return (
    <button className="button" type="button" onClick={handleShare}>
      {status || "Share Candidate Profile"}
    </button>
  );
}

type CandidateDetailRow = {
  label: string;
  value?: string;
  href?: string;
  linkText?: string;
};

function CandidateDetails({ candidate, showProfileLink = false }: { candidate: Candidate; showProfileLink?: boolean }) {
  const rows: CandidateDetailRow[] = [];

  rows.push(
    { label: "Running For", value: candidate.office },
    { label: "Jurisdiction", value: candidateJurisdiction(candidate) },
    { label: "Party", value: candidate.party },
    { label: "Ballotpedia Profile", value: candidate.ballotpediaUrl, linkText: candidate.name },
    { label: "Email", value: candidate.email, href: candidate.email ? `mailto:${candidate.email}` : undefined },
    { label: "Phone", value: candidate.phone, href: candidate.phone ? `tel:${candidate.phone.replace(/\D+/g, "")}` : undefined },
    { label: "Website", value: candidate.websiteUrl, linkText: "Website" },
  );

  if (showProfileLink) rows.splice(3, 0, { label: "Profile Link", value: candidateProfilePath(candidate), linkText: "Direct profile" });

  const visibleRows = rows.filter((row): row is CandidateDetailRow & { value: string } => Boolean(row.value));

  return (
    <dl className="candidate-details">
      {visibleRows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd>
            {row.href || row.value?.startsWith("http") || row.value?.startsWith("/") ? (
              <a href={row.href || row.value}>{row.linkText || row.value}</a>
            ) : (
              row.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function candidateLabel(candidate: Candidate, showCounty: boolean) {
  if (showCounty && candidate.countyName) return candidate.countyName;
  if (candidate.scope === "statewide") return "Statewide";
  if (candidate.district) return candidate.district;
  return candidate.scope;
}

function InfoCard({ title, body, href, cta = "Learn more" }: { title: string; body: string; href?: string; cta?: string }) {
  return (
    <article className="card">
      <h3>{title}</h3>
      <p>{body}</p>
      {href ? <a href={href}>{cta}</a> : null}
    </article>
  );
}

function ResourceCard({ title, href }: { title: string; href: string }) {
  return (
    <a className="resource-card" href={href}>
      <strong>{title}</strong>
      <span>Open resource</span>
    </a>
  );
}

function TermsPage() {
  usePageTitle("Terms");

  return (
    <Shell route="static">
      <PageHero
        eyebrow={site.name}
        title="Terms & Conditions"
        subtitle="Terms for use of Patriots in Action online services, including mobile communications disclosures."
      />
      <section className="section narrow legal-content">
        <p>
          <strong>Last revised:</strong> June 22, 2026
        </p>
        <p>
          These Terms and Conditions (&ldquo;Terms&rdquo;) apply to your access to and use of the websites and other online
          services (collectively, the &ldquo;Services&rdquo;) provided by Patriots Connect, LLC, DBA Patriots in Action
          (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) at {site.url.replace("https://", "")}. By accessing and
          using the Services, you agree to these Terms. If you do not agree to these Terms, do not use the Services.
        </p>
        <p>
          We may update these Terms from time to time by revising the &ldquo;Last revised&rdquo; date above; when required we
          may provide additional notice. Continued use after changes constitutes acceptance unless you stop using the Services.
        </p>
        <p>
          Questions:{" "}
          <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>, by phone at {site.contact.phone}, or through
          the <Link to="/contact">Contact</Link> page on this website.
        </p>

        <h3>Privacy policy</h3>
        <p>
          For information about how we collect, use, and share information about you, please see our{" "}
          <Link to="/privacy">Privacy Policy</Link>.
        </p>

        <h3>Mobile communications</h3>
        <p>
          If you subscribe to receive messages or calls, you consent to receive automated messages from us via your mobile
          device. Subscribers may receive multiple messages a week from us, depending on the program you join.
        </p>
        <p>
          We do not charge for these services. However, your carrier&apos;s normal messaging, data, and other rates and fees
          will still apply. You should check with your carrier to find out what plans are available and how much they cost. At
          any time, you may text STOP to cancel or HELP for customer support information. For all questions about the services
          provided, you can send an email to <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>.
        </p>
        <p>Carriers are not liable for delayed or undelivered messages.</p>
        <p>
          By entering your phone number and selecting to opt in, you consent to join a recurring SMS/MMS text messaging
          program that may provide alerts, donation requests, updates, and other important information. By participating, you
          agree to the terms &amp; privacy policy for auto-dialed messages from us to the phone number you provide. No consent
          is required to buy goods or services. Msg &amp; data rates may apply. Reply HELP for help or STOP to opt-out at any
          time. SMS information is not rented, sold, or shared. See our <Link to="/privacy">Privacy Policy</Link> and these
          Terms.
        </p>

        <h3>Donations and partner payments</h3>
        <p>
          Donations may be processed through Anedot or another designated payment processor. Partner and sponsorship payments
          may be processed through Stripe or another payment processor we designate. We do not collect raw payment-card details
          on this site. Refunds, chargebacks, recurring contributions, and payment-processing rules are governed by the
          processor and applicable law.
        </p>
        <p>
          Donation links may direct users to a third-party donation page or payment processor. Donations and
          payment-processing rules are governed by the processor, the receiving organization, and applicable law.
        </p>

        <h3>User submissions</h3>
        <p>
          Contact form messages, county information updates, event submissions, candidate-related requests, and other content
          you provide may be reviewed, edited for clarity, or declined. Do not submit confidential information you are not
          authorized to share.
        </p>

        <h3>Third-party services</h3>
        <p>
          The Services may link to or integrate with third-party community platforms, merchandise storefronts, donation pages,
          news feeds, video hosts, analytics tools, and other vendors. Those third parties have their own terms and privacy
          practices. We are not responsible for third-party content or services.
        </p>

        <h3>Disclaimer &amp; limitation of liability</h3>
        <p>
          THE SERVICES AND CONTENT ARE PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT
          WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, TO THE FULLEST EXTENT PERMITTED BY LAW. TO THE FULLEST EXTENT PERMITTED
          BY LAW, WE WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS
          OF DATA, PROFITS, OR REVENUE, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICES.
        </p>
      </section>
    </Shell>
  );
}

function PrivacyPage() {
  usePageTitle("Privacy Policy");

  return (
    <Shell route="static">
      <PageHero
        eyebrow={site.name}
        title="Privacy Policy"
        subtitle="Privacy practices for patriotsinaction.com, structured for counsel review and aligned with common political texting expectations."
      />
      <section className="section narrow legal-content">
        <p>
          <strong>Effective date:</strong> June 22, 2026
        </p>
        <p>
          Patriots Connect, LLC, DBA Patriots in Action (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is
          committed to protecting the privacy of visitors and users (&ldquo;you&rdquo; or &ldquo;your&rdquo;) of our nationwide
          county civic network website at {site.url.replace("https://", "")}. This Privacy Policy outlines our practices
          regarding the collection, use, and disclosure of personal information through our website. By accessing and using our
          website, you consent to the terms of this Privacy Policy.
        </p>

        <h3>1. Information we collect</h3>
        <h4>a) Personal information</h4>
        <p>
          We may collect personal information you voluntarily provide, such as your name, email address, postal address, phone
          number, and any other information you submit through our website&apos;s forms—including contact forms, county event
          submissions, county information updates, and partner or sponsorship inquiries.
        </p>
        <h4>b) Text messaging opt-in data</h4>
        <p>
          If you choose to opt in to receive text messages from us, we may collect your phone number and related data required
          for text messaging services, including consent status, opt-in source, and related form submission details.
        </p>
        <h4>c) Automatically collected information</h4>
        <p>
          When you visit our website, we may automatically collect certain information about your device, browser, and usage
          patterns. This information may include IP addresses, cookies, analytics data, and other tracking technologies when
          those tools are enabled for this deployment.
        </p>

        <h3>2. Use of information</h3>
        <h4>a) General uses</h4>
        <p>We may use the personal information you provide to:</p>
        <ul>
          <li>Communicate with you, respond to your inquiries, and provide information about our civic network and county pages;</li>
          <li>
            Send updates, newsletters, fundraising and volunteer communications, partner and sponsorship information, and other
            Patriots in Action-related information;
          </li>
          <li>Analyze and improve our website&apos;s performance, content, and user experience;</li>
          <li>Comply with legal obligations and enforce our rights and agreements.</li>
        </ul>
        <h4>b) Text messaging opt-in data</h4>
        <p>
          Your phone number and related data collected for text messaging services will be used to send you Patriots in Action
          text messages and updates you have consented to receive.
        </p>

        <h3>3. Sharing of information</h3>
        <h4>a) General</h4>
        <p>
          <strong>We will not share, sell, rent, or disclose your personal information to any third parties,</strong> except as
          described in this Privacy Policy or when required by law. For clarity, we may engage service providers (such as website
          hosting, form intake, email delivery, analytics, payment processing, or SMS delivery vendors) solely to operate our
          programs on our behalf, under contractual obligations consistent with this Policy—they may not use your data for
          their own marketing.
        </p>
        <h4>b) Text messaging opt-in data</h4>
        <p>
          <strong>
            We will not share or sell your text messaging opt-in data, consent, or related personal information with any third
            parties,
          </strong>{" "}
          unless required by law.
        </p>

        <h3>4. Data security</h3>
        <p>
          We take reasonable measures to protect the security of your personal information and employ industry-standard security
          technologies where appropriate. However, no method of transmission over the internet or electronic storage is 100%
          secure, and we cannot guarantee absolute security.
        </p>

        <h3>5. Third-party services</h3>
        <p>
          Our website may contain links to third-party websites or services, including community platforms, merchandise
          storefronts, donation processors, news feeds, and video hosts. We are not responsible for the privacy practices or
          content of such third parties. We encourage you to review the privacy policies of those third parties when you leave
          our site.
        </p>

        <h3>6. Children&apos;s privacy</h3>
        <p>
          Our website is not intended for use by individuals under the age of 13. We do not knowingly collect personal
          information from children under 13. If we become aware that we have collected personal information from a child under
          13 without appropriate consent, we will take steps to remove such information.
        </p>

        <h3>7. Updates to this privacy policy</h3>
        <p>
          We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational,
          legal, or regulatory reasons. Changes will be effective upon posting of the revised Privacy Policy on our website. We
          encourage you to review this page periodically.
        </p>

        <h3>8. Contact us</h3>
        <p>
          If you have any questions or concerns regarding this Privacy Policy or our privacy practices, please contact us at{" "}
          <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>, by phone at {site.contact.phone}, or through the{" "}
          <Link to="/contact">Contact</Link> page on this website.
        </p>
      </section>
    </Shell>
  );
}

function NotFound() {
  usePageTitle("Not Found");

  return (
    <Shell route="static">
      <PageHero eyebrow="404" title="Page not found" subtitle="We could not find that Patriots in Action page." />
      <Link className="button primary" to="/counties">Find a County</Link>
    </Shell>
  );
}

function formatDate(event: CalendarEvent) {
  return event.start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(event: CalendarEvent) {
  if (event.isAllDay) return "";
  const start = event.start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const end = event.end?.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return end ? `${start} - ${end}` : start;
}

function formatFeedDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default App;
