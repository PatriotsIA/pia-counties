import { useEffect, useState, type FormEvent, type ReactNode, type UIEvent } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { AdSlot } from "./components/AdSlot";
import { TopTicker } from "./components/TopTicker";
import { getCandidateById, getCandidatesForCounty, getCandidatesForState, type Candidate } from "./data/candidates";
import { counties, getCountiesForState, getCounty, getStateBySlug, states, type CountyPageKey, type CountySite } from "./data/counties";
import { site } from "./data/site";
import type { AdRouteType } from "./lib/ads";
import { initGoogleTagManager, trackPageView } from "./lib/analytics";
import { fetchCalendarFeed, parseIcsEvents, type CalendarEvent } from "./lib/calendar";
import { sendCountyFormEmail, sendSiteContactEmail } from "./lib/email";
import { fetchRssFeedItems } from "./lib/rss-client";
import type { NewsFeedItem } from "./lib/rss-feed";

const countyPages: { key: CountyPageKey; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "about", label: "About" },
  { key: "elections", label: "Elections & More" },
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
const heroKicker = "A Nationwide & Local Civic Hub";
const heroDescription =
  "A nationwide county-by-county civic hub for ultra-local county and statewide Candidates, events, trusted resources, community updates, and practical action. Patriots In Action helps Patriots get informed, get involved, and restore our Republic one county at a time.";
const preferredPartners = [
  {
    name: "CBT Real Estate Services",
    description: "Connect with CBT Real Estate Services on Facebook.",
    href: site.links.cbtRealEstate,
    presentsCountyPages: true,
  },
  {
    name: "Patriot Dispatch",
    description: "Get Patriots in Action updates and messaging resources.",
    href: site.links.patriotDispatch,
  },
  {
    name: "LEMC Realty",
    description: "Find Amarillo and Canyon area rental homes, apartments, and property management services.",
    href: site.links.lemcRealty,
  },
  {
    name: "Patriot Rewards",
    description: "Discover community connections, preferred partners, and member benefits.",
    href: site.links.community,
  },
  {
    name: "Patriots in Action TV",
    description: "Watch candidate interviews, updates, and community stories.",
    href: "/tv",
  },
  {
    name: "piaevents.com",
    description: "Find upcoming Patriots in Action events and places to show up.",
    href: site.links.piaEvents,
  },
  {
    name: "The Patriots in Action Trailer Store",
    description: "Shop and connect with Patriots in Action at live events.",
    href: site.links.piaEvents,
  },
  {
    name: "The Patriot Merch Store",
    description: "Shop patriotic merchandise and gear from the Patriots in Action merch store.",
    href: site.links.merch,
  },
];
function preferredPartner(name: string) {
  return preferredPartners.find((partner) => partner.name === name);
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
      description: "Search nationwide by state, county, city, or FIPS to find local Patriots in Action county pages with voter resources, candidate profiles, events, news, and civic information.",
      canonicalPath: "/counties",
    };
  }

  if (pathname === "/tv") return { title: "PIA TV", description: "Watch Patriots in Action TV videos, candidate interviews, civic updates, and community stories.", canonicalPath: "/tv" };
  if (pathname === "/rewards") return { title: "Patriot Rewards", description: "Learn how Patriots Rewards connects local Patriots with community updates, partner resources, events, media, and county action.", canonicalPath: "/rewards" };
  if (pathname === "/partners") return { title: "Preferred Partners", description: "Discover Patriots in Action preferred partners, sponsorship opportunities, community resources, events, rewards, media, and merchandise.", canonicalPath: "/partners" };
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
    elections: `${county.displayName} Elections & Voter Resources`,
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
    <Shell route="home">
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
  usePageTitle("Preferred Partners");

  return (
    <Shell route="partners">
      <PageHero
        eyebrow="Partners"
        title="Preferred Partners"
        subtitle="Connect with Patriots in Action preferred partners, founding sponsors, events, rewards, media, and merchandise."
      />
      <section className="section split top-align">
        <div className="panel">
          <p className="eyebrow">Sitewide Partners</p>
          <h2>Partners supporting Patriots in Action</h2>
          <p>
            These are current Patriots in Action preferred partners. State and county pages can also feature their own local founding
            sponsors as those relationships are added.
          </p>
          <PartnerList />
        </div>
        <div className="panel">
          <p className="eyebrow">Sponsorships</p>
          <h2>Become a founding sponsor</h2>
          <p>
            We are selecting founding businesses in counties and states to help support local civic information, events, election resources,
            weather, news, and community engagement.
          </p>
          <div className="actions">
            <Link className="button primary" to="/contact">Sponsor a County</Link>
            <Link className="button" to="/counties">Find Your County</Link>
          </div>
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
      <PageHero eyebrow="Counties" title="Find your county Patriot Network" subtitle="Search nationwide by state, county, city, or FIPS to open local county pages for civic information, calendars, news, TV, partners, and forms." />
      <CountyDirectoryNotice />
      <section className="directory-search directory-search-wide" aria-label="Search states and counties">
        <label className="field">
          <span>Search states and counties</span>
          <input
            value={directorySearch}
            onChange={(event) => setDirectorySearch(event.target.value)}
            placeholder="Search Texas, TX, Potter, Amarillo, FIPS..."
            type="search"
          />
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
  const stateCandidates = getCandidatesForState(stateSlug);
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
      <section className="section split top-align">
        <div className="panel">
          <h2>{state.name} candidates</h2>
          <p>{stateCandidates.length ? `${stateCandidates.length} candidate profiles are available for ${state.name}.` : "Candidate profiles for this state will be added soon."}</p>
          <Link className="button primary" to={`${statePath(state)}/candidates`}>View State Candidates</Link>
        </div>
        <div className="panel">
          <h2>County candidate pages</h2>
          <p>Each county site can list candidates running locally, including county, city, court, and precinct races.</p>
        </div>
      </section>
      <CountyDirectoryNotice stateName={state.name} />
      <section className="directory-search" aria-label={`Search ${state.name} counties`}>
        <label className="field">
          <span>Search {state.name} counties</span>
          <input
            value={countySearch}
            onChange={(event) => setCountySearch(event.target.value)}
            placeholder="Search by county, city, or FIPS..."
            type="search"
          />
        </label>
        <p>{visibleCounties.length} of {stateCounties.length} counties shown</p>
      </section>
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
  const runOffCandidates = filteredCandidates.filter((candidate) => candidateProjectCandidateIds.has(candidate.id));
  const remainingStatewideCandidates = statewideCandidates.filter((candidate) => !candidateProjectCandidateIds.has(candidate.id));
  const remainingLocalCandidates = localCandidates.filter((candidate) => !candidateProjectCandidateIds.has(candidate.id));
  const hasJurisdictionFilter = jurisdictionFilter !== "all";

  usePageTitle(state ? `${state.name} Candidates` : "Not Found");
  if (!state) return <NotFound />;
  if (stateSlug?.toLowerCase() !== state.abbr.toLowerCase()) return <Navigate to={`${statePath(state)}/candidates`} replace />;

  return (
    <Shell route="state">
      <PageHero eyebrow="Candidate Directory" title={`${state.name} candidates running for office`} subtitle="Browse statewide, district, county, city, and precinct candidates connected to Patriots in Action." />
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
      {runOffCandidates.length && !hasJurisdictionFilter ? <RunoffInterviewsSection candidates={runOffCandidates} /> : null}
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
      {page === "tv" ? <CountyTv /> : null}
      {page === "partners" ? <CountyPartners county={county} /> : null}
      {page === "contact" ? <CountyContact county={county} /> : null}
      {page === "submit-event" ? <CountySubmitEvent county={county} /> : null}
    </CountyShell>
  );
}

function CountyHome({ county }: { county: CountySite }) {
  return (
    <>
      <section className="county-hero">
        <div>
          <div className="county-hero-flag">
            <StateFlag state={county.state} size="md" />
            <p className="eyebrow">Presented by {county.displayName} Patriots</p>
          </div>
          <h1>{heroHeadline}</h1>
          <p className="eyebrow hero-subtitle-eyebrow">{heroKicker}</p>
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
      <CountyAboutCompact county={county} />
      <AdSlot county={county} page="home" route="county" slot="county-home-inline" />
      <section className="section split">
        <div>
          <p className="eyebrow">Know Your Leaders. Become Empowered.</p>
          <h2>{county.intro}</h2>
          <p>Your Vote. Your Voice. Your Power. Every election matters, from your local school board to the White House.</p>
        </div>
        <EventCalendar county={county} compact />
      </section>
      <CountyNewsSection county={county} page="home" />
      <ActionGrid county={county} />
      <CustomBlocks county={county} page="home" />
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
      <PageHero eyebrow="Elections & More" title="Important civic information" subtitle="Voting resources and leader lookups for your county, state, and federal districts." />
      <ActionGrid county={county} />
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
  const countyCandidates = getCandidatesForCounty(county);
  const runoffCandidates = getCandidatesForState(county.state.slug).filter((candidate) => candidateProjectCandidateIds.has(candidate.id));

  return (
    <>
      <PageHero eyebrow="Candidate Directory" title={`${county.displayName} candidates`} subtitle={`Candidates running for local offices connected to ${county.displayName}, ${county.state.name}.`} />
      {runoffCandidates.length ? <RunoffInterviewsSection candidates={runoffCandidates} /> : null}
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

function RunoffInterviewsSection({ candidates }: { candidates: Candidate[] }) {
  return (
    <section className="section">
      <div className="section-heading">
        <p className="eyebrow">Runoff Interviews</p>
        <h2>Texas Statewide runoff interviews</h2>
        <p>We reached out to all and these are the ones who showed up and spoke to Patriots In Action.</p>
      </div>
      <CandidateGrid candidates={candidates} emptyText="No statewide runoff interviews are available yet." />
    </section>
  );
}

function CountyNews({ county }: { county: CountySite }) {
  return (
    <>
      <PageHero eyebrow="News & Events" title="Stay informed" subtitle="Local news, national news, obituaries, interviews, and community updates." />
      <CountyNewsSection county={county} page="news" />
    </>
  );
}

function CountyEvents({ county }: { county: CountySite }) {
  return (
    <>
      <PageHero eyebrow="Community Calendar" title={`${county.displayName} events`} subtitle="Find upcoming local events or submit one for review." />
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

function CountyTv() {
  return (
    <>
      <PageHero eyebrow="Patriots in Action TV" title="Interviews & updates" subtitle="Videos from the Patriots in Action Vimeo channel." />
      <VimeoFeed />
    </>
  );
}

function CountyPartners({ county }: { county: CountySite }) {
  return (
    <>
      <PageHero eyebrow="Partners" title="Partner with Patriots in Action" subtitle="Preferred partners, sponsorships, merchandise, and Patriot Rewards." />
      <section className="section">
        <div className="panel">
          <p className="eyebrow">Preferred Partners</p>
          <h2>Preferred Partners</h2>
          <p>Connect with Patriots in Action partners, events, and stores that help keep local action moving.</p>
          <PartnerList county={county} />
        </div>
      </section>
    </>
  );
}

function PartnerList({ county }: { county?: CountySite }) {
  return (
    <ul className="partner-list">
      {preferredPartners.map((partner) => (
        <li key={partner.name}>
                <a href={county && partner.name === "The Patriot Merch Store" ? county.links.merch : partner.href} target="_blank" rel="noreferrer">
            <strong>{partner.name}</strong>
            <span>{partner.description}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function CountyContact({ county }: { county: CountySite }) {
  return (
    <>
      <PageHero eyebrow={county.displayName} title="Connect with us" subtitle="Reach your county Patriot Network." />
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
      <section className="section narrow">
        <CountyForm county={county} kind="event" />
      </section>
    </>
  );
}

type RssFeedWidgetProps = {
  title: string;
  eyebrow: string;
  description: string;
  feedUrl: string;
  emptyText: string;
  presentedBy?: (typeof preferredPartners)[number];
  topic?: "general" | "obituaries" | "sports";
};

function CountyNewsSection({ county, page }: { county: CountySite; page: CountyPageKey }) {
  return (
    <section className="section news-section">
      <div className="section-heading">
        <p className="eyebrow">County Newsroom</p>
        <h2>Ultra-local feeds for {county.displayName}</h2>
        <p>Follow local articles, sports, video coverage, obituaries, and Patriots in Action TV from one county news section.</p>
      </div>
      <div className="feed-grid">
        <div className="feed-column">
          <RssFeedWidget
            eyebrow="Local Articles"
            title="County & City News"
            description={`Online news articles focused on ${county.displayName} and nearby city coverage.`}
            feedUrl={county.feeds.localNewsUrl}
            emptyText="No local article results are available yet."
            presentedBy={preferredPartner("CBT Real Estate Services")}
          />
          <RssFeedWidget
            eyebrow="Obituaries"
            title="Local Obituaries"
            description={`Recent obituary notices and memorial news for ${county.displayName}.`}
            feedUrl={county.feeds.obituariesUrl}
            emptyText="No local obituary results are available yet."
            presentedBy={preferredPartner("Patriot Rewards")}
            topic="obituaries"
          />
        </div>
        <div className="feed-column">
          <RssFeedWidget
            eyebrow="Local Video"
            title="County News Videos"
            description={`Video news coverage mentioning ${county.displayName}, local communities, and civic updates.`}
            feedUrl={county.feeds.localVideoUrl}
            emptyText="No local video results are available yet."
            presentedBy={preferredPartner("Patriots in Action TV")}
          />
          <VimeoFeed compact />
        </div>
      </div>
      <div className="feed-feature-row">
        <RssFeedWidget
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
        <AdSlot county={county} page={page} route="county" slot="county-news-inline" limit={3} />
        <a className="button primary" href={site.links.piaEvents}>Find Patriots in Action Events</a>
      </div>
    </section>
  );
}

function RssFeedWidget({ title, eyebrow, description, feedUrl, emptyText, presentedBy, topic = "general" }: RssFeedWidgetProps) {
  const [items, setItems] = useState<NewsFeedItem[]>([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [status, setStatus] = useState("Loading feed...");

  useEffect(() => {
    let active = true;

    fetchRssFeedItems(feedUrl)
      .then((parsed) => {
        if (!active) return;
        const topicItems = filterFeedItemsByTopic(parsed, topic);
        setItems(topicItems);
        setVisibleCount(5);
        setStatus(topicItems.length ? "" : emptyText);
      })
      .catch(() => {
        if (!active) return;
        setItems([]);
        setVisibleCount(5);
        setStatus("This feed could not be loaded right now.");
      });

    return () => {
      active = false;
    };
  }, [emptyText, feedUrl, topic]);

  const orderedItems = [...items].sort((first, second) => feedItemTimestamp(second) - feedItemTimestamp(first));
  const visibleItems = orderedItems.slice(0, visibleCount);
  const hasMore = visibleCount < orderedItems.length;
  const feedSource = readableFeedSource(feedUrl);

  return (
    <article className="feed-widget">
      <div className="panel-heading">
        <p className="eyebrow">{eyebrow}</p>
        <h3>{title}</h3>
        <p>{description}</p>
        {presentedBy ? (
          <a className="feed-presented-by" href={presentedBy.href} target="_blank" rel="noreferrer">
            <span>Presented by</span>
            <strong>{presentedBy.name}</strong>
          </a>
        ) : null}
      </div>
      {status ? <p className="status">{status}</p> : null}
      <div className="feed-list scroll-feed" onScroll={(event) => handleScrollLoadMore(event, hasMore, () => setVisibleCount((count) => count + 5))}>
        {visibleItems.map((item) => (
          <a className={item.imageUrl ? "feed-item" : "feed-item no-image"} href={item.link} key={item.id}>
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

function filterFeedItemsByTopic(items: NewsFeedItem[], topic: RssFeedWidgetProps["topic"]) {
  if (topic === "obituaries") return items.filter(isObituaryFeedItem);
  if (topic === "sports") return items.filter(isSportsFeedItem);
  return items;
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
    "funeral",
    "memorial service",
    "celebration of life",
    "passed away",
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

function EventCalendar({ county, compact = false }: { county: CountySite; compact?: boolean }) {
  const feedUrl = county.calendar.icsUrl;
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [status, setStatus] = useState("Loading community events...");

  useEffect(() => {
    let active = true;

    if (!feedUrl) return;

    fetchCalendarFeed(feedUrl)
      .then((text) => {
        if (!active) return;
        const parsed = parseIcsEvents(text);
        setEvents(parsed);
        setStatus(parsed.length ? "" : "No upcoming events are listed yet.");
      })
      .catch(() => {
        if (active) setStatus("The calendar feed could not be loaded right now.");
      });

    return () => {
      active = false;
    };
  }, [feedUrl]);

  const visible = compact ? events.slice(0, 3) : events.slice(0, 12);
  const displayedStatus = feedUrl ? status : "No calendar feed has been added for this county yet.";

  return (
    <div className="panel">
      <div className="panel-heading">
        <p className="eyebrow">Community Calendar</p>
        <h2>Upcoming Events</h2>
      </div>
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
    </div>
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

  return (
    <section className={compact ? "feed-widget" : "section"}>
      {compact ? (
        <div className="panel-heading">
          <p className="eyebrow">Patriots in Action TV</p>
          <h3>PIA Video Feed</h3>
          <p>Latest videos from <Link to="/tv">Patriots in Action TV</Link>.</p>
          {preferredPartner("Patriots in Action TV") ? (
            <Link className="feed-presented-by" to="/tv">
              <span>Presented by</span>
              <strong>{preferredPartner("Patriots in Action TV")?.name}</strong>
            </Link>
          ) : null}
        </div>
      ) : null}
      {status ? <p className="status">{status}</p> : null}
      <div className="feed-list video-feed scroll-feed" onScroll={(event) => handleScrollLoadMore(event, hasMore, () => setVisibleCount((count) => count + (compact ? 8 : 12)))}>
        {visibleVideos.map((video) => {
          return (
            <a className={video.imageUrl ? "feed-item video-feed-item" : "feed-item video-feed-item no-image"} href={video.link || "/tv"} key={video.id}>
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
          <ConsentCheckbox extraText="I understand this submission will be reviewed before being added to the calendar." />
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

function ConsentCheckbox({ extraText }: { extraText?: string }) {
  return (
    <label className="checkbox consent-checkbox">
      <input name="consent" type="checkbox" required />
      <span>
        {extraText ? `${extraText} ` : ""}
        By checking this box and providing my mobile number, I consent to receive recurring SMS/MMS messages from Patriots Connect, LLC,
        DBA Patriots in Action, including voter education, event, volunteer, donation, and outreach messages.
        Message frequency varies. Message and data rates may apply. Reply STOP to opt out and HELP for help. Consent is not required to make
        a purchase or contribution. I agree to the <Link to="/privacy">Privacy Policy</Link> and{" "}
        <Link to="/terms">Terms & Conditions</Link>.
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
      <AdSlot county={county} page={page} route="county" slot="county-page-footer" />
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
      <TopTicker county={county} />
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
        <div className={showAdRails ? "container shell-main-content" : undefined}>{children}</div>
        {showAdRails ? <AdSlot county={county} page={page} route={route} slot="site-right-rail" /> : null}
      </main>
      {route !== "county" && !suppressAdRails ? (
        <div className="container">
          <AdSlot county={county} page={page} route={route} slot="site-footer" />
        </div>
      ) : null}
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
          <Link to="/partners">Preferred Partners</Link>
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

function PageHero({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <section className="page-hero">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </section>
  );
}

function ActionGrid({ county }: { county: CountySite }) {
  return (
    <section className="section">
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
    </section>
  );
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
      <PageHero eyebrow={site.name} title="Terms & Conditions" subtitle="Last revised 01/01/2026" />
      <section className="section narrow legal-content">
        <h2>Terms & Conditions</h2>
        <p>Last revised 01/01/2026</p>
        <p>These Terms and Conditions (“Terms”) apply to your access to and use of the websites and other online services (collectively, the “Services”) provided by PatriotsInActionTX.com (“client”, “we” or “us”). By accessing and using the Services, you agree to these Terms. If you do not agree to these Terms, do not use the Services.</p>
        <p>We may provide additional or different terms and conditions with respect to some of the Services (“Additional Terms”). If you use any Services with</p>
        <p>Additional Terms: The Additional Terms will apply to your use of such Services. If there is any conflict between these Terms and any Additional Terms, the Additional Terms will control to the extent of such conflict.</p>
        <p>We may update these Terms from time to time. If we make any changes to these Terms, we will notify you by revising the “Last Revised” date at the top of these Terms, and, in some cases, we may provide you with additional notice (such as by adding a statement to our website homepage or by sending you a notification).</p>
        <p>Unless otherwise indicated in our notice to you, any changes to these Terms will be effective immediately, and your continued use of the Services following our provision of such notice will confirm your acceptance of such changes. If you do not agree to any changes to these Terms, you must stop using the Services.</p>
        <p>If you have any questions regarding these Terms or the Services, please contact us at: <strong>[email protected]</strong></p>
        <h3>Entity Notice</h3>
        <p>Patriots Connect, LLC, DBA Patriots in Action provides technology, community, merchandise, and platform services. Third-party political, donation, community, and merchandise services may have their own terms and policies.</p>
        <h3>Privacy Policy</h3>
        <p>For information about how we collect, use, and share information about you, please see our Privacy Policy.</p>
        <h3>Mobile Communications</h3>
        <p>If you subscribe to receive messages or calls, you consent to receive automated messages from us via your mobile device. Subscribers may receive multiple messages a week from client.</p>
        <p>We do not charge for these services. However, your carrier’s normal messaging, data, and other rates and fees will still apply. You should check with your carrier to find out what plans are available and how much they cost. At any time, you may text STOP to cancel or HELP for customer support</p>
        <p>information. For all questions about the services provided, you can send an email to <strong>[email protected]</strong></p>
        <p>Carriers are not liable for delayed or undelivered messages.</p>
        <p>By entering your phone number and selecting to opt in, you consent to join a recurring SMS/MMS text messaging program that will provide alerts, donation requests, updates, and other important information. By participating, you agree to the terms & privacy policy for auto-dialed messages from client to the phone number you provide. No consent is required to buy. Msg & data rates may apply. Reply HELP for help or STOP to opt-out at any time. SMS information is not rented, sold, or shared. Privacy Policy and Terms and Conditions.</p>
        <h3>Donations and Payment Processing</h3>
        <p>Donations may be processed by third-party providers, including Anedot or another payment processor we designate. We do not collect raw payment-card details on this site. Refunds, chargebacks, recurring contributions, and payment-processing rules are governed by the processor and applicable law.</p>
        <p>Donation links may direct users to a third-party donation page or payment processor. Donations and payment-processing rules are governed by the processor, the receiving organization, and applicable law.</p>
        <h3>Membership Benefits and Renewals</h3>
        <p>Any paid membership renewal is separate from any donation or third-party payment transaction and requires separate billing authorization.</p>
        <h3>Ownership and Limited License</h3>
        <p>The Services, including the text, graphics, images, photographs, videos, illustrations, and other content contained therein, are owned by client or our licensors and are protected under both United States and foreign laws. Except as explicitly stated in these Terms, all rights in and to the Services are reserved by us or our licensors. Subject to your compliance with these Terms, you are hereby granted a limited, nonexclusive, non-transferable, non-sublicensable, revocable license to access and use our Services for your own personal, informational, and non-commercial use. Any use of the Services other than as specifically authorized herein, without our prior written permission, is strictly prohibited and will terminate the license granted herein and violate our intellectual property rights.</p>
        <h3>Trademarks</h3>
        <p>“client”, “client” and our logos, our slogans, our product or service names, and the look and feel of the Services are trademarks of client and may not be copied, imitated or used, in whole or in part, without our prior written permission. All other trademarks, registered trademarks, product or service names, and company names or logos mentioned on or included in the Services are the property of their respective owners. Reference to any products, services, processes, or other information by trade name, trademark, manufacturer, supplier, or otherwise does not constitute or imply endorsement, sponsorship, or recommendation thereof by us.</p>
        <h3>Feedback</h3>
        <p>You may voluntarily submit or otherwise communicate to us any questions, comments, suggestions, ideas, original or creative materials, or other</p>
        <p>information about client or the Services (collectively, “Feedback”). You understand that we may use Feedback for any purpose, without acknowledgment or compensation to you, including to develop, copy, publish, or improve the Feedback in our sole discretion. You understand that client may treat Feedback as nonconfidential.</p>
        <h3>Third-Party Content</h3>
        <p>We may provide information about third-party products, services, activities, or events, or we may allow third parties to make their content and information available on or through the Services (collectively, “Third-Party Content”). We provide Third-Party Content as a service to those interested in such content. Your dealings or correspondence with third parties and your use of or interaction with any Third-Party Content are solely between you and the applicable third party. The client does not control or endorse, and makes no representations or warranties regarding, any Third-Party Content. Your access to and use of Third-Party Content is at your own risk.</p>
        <h3>Prohibited Content and Conduct</h3>
        <p>You will not violate any applicable law, contract, intellectual property right, or other third-party right or commit a tort, and you are solely responsible for your conduct while using the Services. You will not: engage in any harassing, threatening, intimidating, predatory, or stalking conduct; impersonate, submit, or post on behalf of any person or entity, or otherwise misrepresent your affiliation with a person or entity; sell, resell, or commercially use the Services; copy, reproduce, distribute, publicly perform, or publicly display all or portions of the Services, except as expressly permitted by us or our licensors; modify the Services, remove any proprietary rights notices or markings, or otherwise make any derivative works based upon the Services without our prior written consent; use the Services other than for their intended purpose or in any manner that could interfere with, disrupt, negatively affect, or inhibit other users from fully enjoying the Services or that could damage, disable, overburden, or impair the functioning of the Services in any manner; reverse engineer any aspect of the Services or do anything that might discover source code or that might bypass or circumvent measures employed to prevent or limit access to any part ofthe Services; use any data mining, robots, or similar data gathering or extraction methods designed to scrape or extract data from the Services; develop or use any applications that interact with the Services without our prior written consent; send, distribute, or post spam, unsolicited or bulk commercial electronic communications, chain letters, or pyramid schemes; bypass or ignore instructions contained in our robots.txt file; or use the Services for any illegal or unauthorized purpose, or engagein, encourage, or promote any activity that violates these Terms. This Section 7 does not create any private right of action on the part of any third party or any reasonable expectation that the Services will not contain any content that is prohibited by such rules.</p>
        <h3>Indemnification</h3>
        <p>To the fullest extent permitted by applicable law, you will defend, indemnify, and hold harmless client and its officers, directors, employees, volunteers and agents (individually and collectively, the “client Parties”), from and against any claims, damages, costs, liabilities, and expenses (including reasonable attorneys’ fees) (“Claims”) arising out of or related to (a) your access to and use of the Services; (b) your Feedback; (c) your violation of these Terms; (d) your conduct in connection with the Services; or (e) your violation, misappropriation, or infringement of any rights of any third party (including intellectual property or privacy rights).</p>
        <h3>Disclaimer</h3>
        <p>Your use of the services is at your sole risk. Except as expressly provided otherwise in a writing by client, the services and any content therein are provided on an “as is” and “as available” basis without warranties of any kind, either express or implied, including, without limitation, implied warranties of merchantability, fitness for a particular purpose, title and non-infringement. In addition, client does not represent or warrant that the services or any content therein are accurate, complete, reliable, current, or error-free.</p>
        <p>While client attempts to make your use of the services and any content therein safe, client cannot and does not represent or warrant that the services or any content therein or our server(s) are free of viruses or other harmful components. You assume the entire risk as to the quality and performance of the services.</p>
        <h3>Limitation of Liability</h3>
        <p>To the fullest extent permitted by applicable law, in no event will client or any other client parties be liable to you under any theory of liability (whether based in contract, tort, negligence, warranty, or otherwise) for any indirect, consequential, incidental, exemplary, punitive or special damages, or any other damages of any kind, including, without limitation, loss of use, loss of profits or loss of data, even if client or any other client parties have been advised of the possibility of such damages.</p>
        <p>In no event will the aggregate liability of client and the other client parties for any claims arising out of or relating to these terms or the services, regardless of the form of the action, exceed any compensation you pay, if any, to client for access to or use of the services.</p>
        <p>The limitations set forth in this section will not limit or exclude liability for the gross negligence, fraud, or intentional misconduct of client or any other client parties or for any other matters for which liability cannot be excluded or limited under applicable law. In addition, please note that some jurisdictions do not allow limitations on implied warranties or the exclusion or limitation of certain damages. Therefore, some or all of the above exclusions or limitations may not apply to you.</p>
        <h3>Transfer and Processing of Data</h3>
        <p>In order for us to provide the Services, you agree that we may process, transfer, and store information about you in the United States and other countries, where you may not have the same rights and protections as you do under local law.</p>
        <h3>Applicable Law and Venue</h3>
        <p>Any dispute arising out of or related to these Terms or your use of the Services will be governed by and construed and enforced in accordance with the laws of the State of Texas applicable to agreements made and to be entirely performed within the State of Texas, without regard to its conflict of law provisions. Each party irrevocably consents to the exclusive jurisdiction and venue of the state and federal courts located in the State of Texas.</p>
        <p>for all disputes arising out of or related to these Terms or your use of the Services.</p>
        <h3>Modification or Termination of the Services</h3>
        <p>We reserve the right to modify the Services or to suspend or stop providing all or portions of the Services at any time and without prior notice to you. We are not responsible for any loss or harm related to your inability to access or use the Services.</p>
        <h3>Severability</h3>
        <p>If any provision or portion of a provision of these Terms is deemed to be unlawful, void or unenforceable, that provision or portion thereof is deemed severable from these Terms and will not affect the validity and enforceability of any remaining provisions.</p>
        <h3>Miscellaneous</h3>
        <p>Any failure by client to enforce any provision of these Terms will not be deemed a waiver of future enforcement of that or any other provision of these Terms, unless expressly waived in writing by client. The section titles in these Terms are for convenience only and have no legal or contractual effect. Except as otherwise provided in these Terms, these Terms are intended solely for the benefit of the parties and are not intended to confer third-party beneficiary rights upon any other person or entity. You agree that communications and transactions between us may be conducted electronically.</p>
      </section>
    </Shell>
  );
}

function PrivacyPage() {
  usePageTitle("Privacy Policy");

  return (
    <Shell route="static">
      <PageHero eyebrow={site.name} title="Privacy Policy" subtitle="Effective Date: 01-01-2026" />
      <section className="section narrow legal-content">
        <h2>Privacy Policy</h2>
        <p>Privacy Policy for <strong>PatriotsConnect.com</strong> Website</p>
        <p>Effective Date: <strong>01-01-2026</strong></p>
        <p><strong>PatriotsConnect.com</strong> (“we,” “us,” or “our”) is committed to protecting the privacy of</p>
        <p>visitors and users (“you” or “your”) of our political campaign website. This Privacy Policy outlines our practices regarding the collection, use, and disclosure of personal information through our website. By accessing and using our website, you consent to the terms of this Privacy Policy.</p>
        <h3>Entity Identity:</h3>
        <p>Patriots Connect, LLC, DBA Patriots in Action operates this website and provides technology, community, merchandise, and platform services. Third-party political, donation, community, and merchandise services may have their own privacy policies and terms.</p>
        <h3>1. Information We Collect:</h3>
        <ol>
          <li>Personal Information: We may collect personal information you voluntarily provide to us, such as your name, email address, postal address, phone number, and any other information you submit through our website’s forms.</li>
          <li>Text Messaging Opt-In Data: If you choose to opt-in to receive text messages from us, we may collect your phone number and related data required for text messaging services.</li>
          <li>County, event, candidate, or activity data you submit through county pages, event forms, contact forms, candidate profile requests, or community-action forms.</li>
          <li>SMS consent records, including phone number, consent status, opt-in source, and related form submission details.</li>
          <li>Automatically Collected Information: When you visit our website, we may automatically collect certain information about your device, browser, and usage patterns. This information may include IP addresses, cookies, analytics data, and other tracking technologies.</li>
        </ol>
        <h3>2. Use of Information:</h3>
        <ol>
          <li>We may use the personal information you provide to us for the following purposes:</li>
          <li>To communicate with you, respond to your inquiries, and provide information about our</li>
          <li>To send you updates, newsletters, and other campaign-related</li>
          <li>To analyze and improve our website’s performance, content, and user</li>
          <li>To comply with legal obligations and enforce our rights and</li>
          <li>Text Messaging Opt-In Data: Your phone number and related data collected for text messaging services will only be used to send you campaign-related text messages and updates.</li>
        </ol>
        <h3>3. Sharing of Information:</h3>
        <ol>
          <li>We will not share, sell, rent, or disclose your personal information to any third parties, except as described in this Privacy Policy or when required by law.</li>
          <li>Text Messaging Opt-In Data: We will not share or sell your text messaging opt-in data, consent, or related personal information with any third parties, unless required by law.</li>
          <li>We may use vendors and service providers as processors to operate forms, analytics, email delivery, hosting, community, merchandise, payment, or other platform services, subject to applicable agreements and law.</li>
        </ol>
        <h3>Donations, Community, and Merchandise:</h3>
        <p>Donations may be completed on third-party donation pages and processed by Anedot or another designated payment processor. We do not collect raw payment-card details on this site. Separate Patriot Community features may link to the Patriots in Action community platform, and merchandise links may direct you to Patriot Merch or other third-party storefronts. Those third-party services may have their own privacy policies and terms.</p>
        <h3>4. Data Security:</h3>
        <p>We take reasonable measures to protect the security of your personal information and employ industry-standard security technologies to safeguard it. However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.</p>
        <h3>5. Third-Party Services:</h3>
        <p>Our website may contain links to third-party websites or services. We are not responsible for the privacy practices or content of such third parties. We encourage you to review the privacy policies of those third parties when accessing their websites or services.</p>
        <h3>6. Children’s Privacy:</h3>
        <p>Our website is not intended for use by individuals under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13 without parental consent, we will take steps to remove such information from our records.</p>
        <h3>7. Updates to this Privacy Policy:</h3>
        <p>We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. Any changes will be effective immediately upon posting of the revised Privacy Policy on our website. We encourage you to review this page periodically for the latest information on our privacy practices.</p>
        <h3>8. Contact Us:</h3>
        <p>If you have any questions or concerns regarding this Privacy Policy or our privacy practices, please contact us at:</p>
        <p><strong>[email protected]</strong></p>
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
