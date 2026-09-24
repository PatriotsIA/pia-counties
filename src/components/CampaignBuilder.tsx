import { useEffect, useRef, useState, type FormEvent } from "react";
import { getCountyByState } from "@nickgraffis/us-counties";
import { states } from "../data/states";
import { countyDisplayName, countySlug } from "../data/county-geography";
import { advertiserContactEmail } from "../data/advertiser-contact";
import { countyRateTiers, monthlyCountyPlacementPrice, monthlyStatePlacementPrice, countyCampaignMonthly, checkoutPrice, formatAdPrice, sponsorableFeeds, type BillingCadence, type CountyPlacement, type StatePlacement, type SponsorableFeed } from "../data/campaign-pricing";
import { fetchCountyPopulation, startCampaignCheckout, type CampaignCheckout, type CheckoutSession } from "../lib/campaign-checkout";
import { sendSiteContactEmail } from "../lib/email";

type Scope = "county" | "state" | "national";
type SelectedCounty = { fips: string; name: string; stateSlug: string; countySlug: string; population: number; estimateVintage: number };
const packages = [
  { scope: "county", placement: "color-card", name: "County color card", rate: 25, unit: "from", detail: "Full-color local ad with a link to your business. Rates follow county population." },
  { scope: "county", placement: "section-sponsorship", name: "County section sponsorship", rate: 50, unit: "from", detail: "Sponsorship recognition plus your color card. Twice the county color-card rate." },
  { scope: "state", placement: "state-ad", name: "State ad network", rate: 10, unit: "per county", detail: "Reach a state page and every county in that state. Select one or several states." },
  { scope: "state", placement: "state-feed-sponsorship", name: "State section sponsorship", rate: 20, unit: "per county, per section", detail: "Sponsor your selected sections throughout each state and its counties." },
] as const;

export function CampaignBuilder({ businessName, setBusinessName, onLocationChange }: { businessName: string; setBusinessName: (value: string) => void; onLocationChange: (value: string) => void }) {
  const [scope, setScope] = useState<Scope>("county");
  const [countyPlacement, setCountyPlacement] = useState<CountyPlacement>("color-card");
  const [statePlacement, setStatePlacement] = useState<StatePlacement>("state-ad");
  const [billing, setBilling] = useState<BillingCadence>("monthly");
  const [stateAbbr, setStateAbbr] = useState("");
  const [countyFips, setCountyFips] = useState("");
  const [selectedCounties, setSelectedCounties] = useState<SelectedCounty[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [feeds, setFeeds] = useState<SponsorableFeed[]>(["community-updates"]);
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [submittedUrl, setSubmittedUrl] = useState<string>();
  const submitting = useRef(false);
  const cachedSession = useRef<{ input: string; session: CheckoutSession } | null>(null);
  const busy = adding || status === "sending";
  const state = states.find((entry) => entry.abbr === stateAbbr);
  const counties = state ? getCountyByState(state.name).map((county) => ({
    fips: county.FIPS, slug: countySlug(county.name, county.FIPS),
    name: ["AK", "DC"].includes(state.abbr) ? county.name : countyDisplayName(county.name, state.slug, county.FIPS),
  })).sort((a, b) => a.name.localeCompare(b.name)) : [];
  const selectedStateObjects = states.filter((entry) => selectedStates.includes(entry.slug));
  const countyCount = selectedStateObjects.reduce((sum, entry) => sum + getCountyByState(entry.name).length, 0);
  const needsFeeds = scope === "state" && statePlacement === "state-feed-sponsorship";
  const monthly = scope === "county" ? countyCampaignMonthly(selectedCounties.map((entry) => entry.population), countyPlacement)
    : scope === "state" ? monthlyStatePlacementPrice(countyCount, statePlacement, feeds.length) : 0;
  const total = checkoutPrice(monthly, billing);
  const hasSelection = scope === "national" || (scope === "county" ? selectedCounties.length > 0 : selectedStates.length > 0 && (!needsFeeds || feeds.length > 0));
  const placement = scope === "county" ? countyPlacement : statePlacement;
  const planName = scope === "national" ? "National campaign" : packages.find((item) => item.placement === placement)!.name;
  const previewLabel = scope === "county" ? selectedCounties[0]?.name || "Your County" : scope === "state" ? selectedStateObjects[0]?.name || "Your State" : "Nationwide";
  useEffect(() => onLocationChange(previewLabel), [onLocationChange, previewLabel]);
  const reset = () => { setStatus("idle"); setError(""); setSubmittedUrl(undefined); };

  function choose(nextScope: Scope, nextPlacement?: CountyPlacement | StatePlacement) {
    if (busy) return;
    setScope(nextScope);
    if (nextScope === "county" && nextPlacement) setCountyPlacement(nextPlacement as CountyPlacement);
    if (nextScope === "state" && nextPlacement) setStatePlacement(nextPlacement as StatePlacement);
    reset();
    window.history.pushState(null, "", "#campaign");
    document.getElementById("campaign")?.scrollIntoView({ behavior: "smooth" });
  }

  async function addCounty() {
    const county = counties.find((entry) => entry.fips === countyFips);
    if (!state || !county || busy || selectedCounties.some((entry) => entry.fips === county.fips)) return;
    if (selectedCounties.length >= 25) { setError("You can select up to 25 counties. For broader reach, choose state coverage or contact us."); return; }
    reset(); setAdding(true);
    try {
      const population = await fetchCountyPopulation(state.slug, county.slug);
      if (population.fips !== county.fips || population.stateSlug !== state.slug || population.countySlug !== county.slug) throw new Error("County pricing could not be verified. Please try again.");
      setSelectedCounties((current) => current.some((entry) => entry.fips === county.fips) ? current : [...current, { ...population, name: `${county.name}, ${state.name}` }]);
      setCountyFips("");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to look up county pricing. Please try again."); }
    finally { setAdding(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || submitting.current || !hasSelection) return;
    const data = new FormData(event.currentTarget);
    if (String(data.get("companyFax") || "")) return;
    submitting.current = true; setStatus("sending"); setError(""); setSubmittedUrl(undefined);
    const email = String(data.get("email") || "").trim();
    const referredBy = String(data.get("referredBy") || "").trim();
    try {
      let checkoutUrl: string | undefined;
      let sessionId: string | undefined;
      if (scope !== "national") {
        const contact = { billing, customerEmail: email, businessName: businessName.trim(), ...(referredBy ? { referredBy } : {}) };
        const input: CampaignCheckout = scope === "county"
          ? { ...contact, scope, placement: countyPlacement, counties: selectedCounties.map(({ stateSlug, countySlug }) => ({ stateSlug, countySlug })) }
          : { ...contact, scope, placement: statePlacement, states: selectedStates, ...(needsFeeds ? { feeds } : {}) };
        const signature = JSON.stringify(input);
        const session = cachedSession.current?.input === signature ? cachedSession.current.session : await startCampaignCheckout(input);
        if (session.amountCents !== Math.round(total * 100) || session.currency !== "usd" || session.billing !== billing) throw new Error("The checkout price could not be matched to your selections. Please contact us before paying.");
        cachedSession.current = { input: signature, session };
        checkoutUrl = session.url; sessionId = session.sessionId;
      }
      await sendSiteContactEmail({ title: "PIA advertising campaign request", replyTo: email, values: {
        name: String(data.get("name") || "").trim(), email, businessName: businessName.trim(),
        phone: String(data.get("phone") || "").trim(), businessUrl: String(data.get("businessUrl") || "").trim(),
        campaignScope: scope, placement: planName, billing: scope === "national" ? "Custom quote" : billing,
        advertisedRate: scope === "national" ? "Custom quote" : `${formatAdPrice(total)}/${billing === "annual" ? "year" : "month"}`,
        coverage: scope === "county" ? selectedCounties.map((entry) => `${entry.name} (FIPS ${entry.fips}; population ${entry.population}; Census ${entry.estimateVintage})`).join("; ") : scope === "state" ? selectedStateObjects.map((entry) => `${entry.name} (${getCountyByState(entry.name).length} counties)`).join("; ") : "Nationwide",
        sections: needsFeeds ? sponsorableFeeds.filter((entry) => feeds.includes(entry.key)).map((entry) => entry.label).join(", ") : undefined,
        referredBy, message: String(data.get("message") || "").trim(), contactConsent: data.get("consent") === "on",
        checkoutSessionId: sessionId, paymentStatus: "Request received; payment has not been confirmed.",
      } });
      setSubmittedUrl(checkoutUrl); setStatus("success");
      if (checkoutUrl) window.location.assign(checkoutUrl);
    } catch (failure) {
      setStatus("error");
      setError(failure instanceof Error ? failure.message : "We couldn’t send your request. Please try again or email us.");
    } finally { submitting.current = false; }
  }

  return <>
    <section id="pricing" className="section-wrap section-space">
      <div className="section-heading"><div><p className="eyebrow">A PLACE FOR YOUR BUSINESS</p><h2>Local partnerships.<br />Straightforward pricing.</h2></div><div>
        <p>Choose your counties or states. See your total before checkout.</p>
        <div className="billing-switch" aria-label="Pricing billing period">
          <button disabled={busy} aria-pressed={billing === "monthly"} onClick={() => { setBilling("monthly"); reset(); }}>Monthly</button>
          <button disabled={busy} aria-pressed={billing === "annual"} onClick={() => { setBilling("annual"); reset(); }}>Annual <span>Save 2 months</span></button>
        </div>
      </div></div>
      <div className="pricing-grid">{packages.map((item) => <article className="price-card" key={item.placement}>
        <p className="eyebrow">{item.unit}</p><h3>{item.name}</h3>
        <p className="price"><strong>{formatAdPrice(checkoutPrice(item.rate, billing))}</strong><span>/{billing === "monthly" ? "month" : "year"}</span></p>
        <p className="price-note">{billing === "annual" ? "12 months for the price of 10" : item.scope === "county" ? "See population tiers below" : "Based on each state’s county count"}</p>
        <p>{item.detail}</p><button className="button button-outline" disabled={busy} onClick={() => choose(item.scope, item.placement)}>Choose {item.name} →</button>
      </article>)}</div>
      <div className="rate-table-wrap"><table className="rate-table"><caption>Monthly county pricing by population</caption><thead><tr><th scope="col">County population</th><th scope="col">Color card</th><th scope="col">Section sponsorship</th></tr></thead>
        <tbody>{countyRateTiers.map((tier) => <tr key={tier.population}><th scope="row">{tier.population}</th><td>{formatAdPrice(tier.colorCardMonthly)}</td><td>{formatAdPrice(tier.sectionSponsorMonthly)}</td></tr>)}</tbody></table></div>
      <div className="pricing-extras"><p><strong>More than one county?</strong> The highest-priced county is full rate. Every additional county is 50% of its own population-tier rate, included in one checkout.</p><p><strong>Statewide reach.</strong> Texas has 254 counties: $2,540/month for the ad network or $5,080/month per sponsored section. Annual plans deliver 12 months for the price of 10.</p></div>
      <aside className="national-callout"><div><p className="eyebrow">THINKING BIGGER?</p><h3>Take your brand across the PIA network.</h3><p>National homepage, sponsor carousel, and banner opportunities. Custom pricing for your reach.</p></div><button className="button button-light" disabled={busy} onClick={() => choose("national")}>Plan a national campaign ↗</button></aside>
    </section>

    <section className="campaign-section"><div className="section-wrap campaign-layout">
      <aside className="campaign-copy"><p className="eyebrow">LET’S MAKE IT LOCAL</p><h2>Build your<br /> next connection.</h2><p>Choose your reach and placement. We’ll confirm availability and coordinate your creative before launch.</p>
        <div className="campaign-summary" aria-live="polite"><span>YOUR SELECTED CAMPAIGN</span><h3>{planName}</h3><p className="price"><strong>{scope === "national" ? "Let’s talk" : formatAdPrice(total)}</strong>{scope !== "national" && <span>/{billing === "annual" ? "year" : "month"}</span>}</p>
          <p>{scope === "national" ? "Custom national proposal" : !hasSelection ? "Add your coverage to calculate the exact total." : scope === "county" ? `${selectedCounties.length} selected counties · highest rate in full, additional counties at half their own rate.` : `${countyCount} counties across ${selectedStates.length} selected states${needsFeeds ? ` · ${feeds.length} sponsored sections` : ""}.`}</p>
          {billing === "annual" && scope !== "national" && <p>12 months of coverage, paid annually at 10 times the monthly rate.</p>}
        </div><p className="contact-note">Need a hand planning your campaign?<br /><a href={`mailto:${advertiserContactEmail}`}>{advertiserContactEmail}</a></p>
      </aside>
      <form id="campaign" className="campaign-form" onSubmit={submit} onChange={() => { if (!busy) reset(); }}>
        {new URLSearchParams(window.location.search).get("checkout") === "success" && <p className="form-note" role="status">You’ve returned from Stripe. We’ll confirm payment and placement details before launch.</p>}
        {new URLSearchParams(window.location.search).get("checkout") === "cancelled" && <p className="form-note" role="status">Checkout was cancelled. You can build a new campaign below.</p>}
        <fieldset disabled={busy}><legend>Start your campaign</legend><p className="form-intro">All fields marked * are required.</p>
          <label>Business or organization *<input name="businessName" required maxLength={120} value={businessName} onChange={(event) => setBusinessName(event.target.value)} /></label>
          <div className="form-grid"><label>Your name *<input name="name" required maxLength={120} autoComplete="name" /></label><label>Email address *<input name="email" type="email" required maxLength={254} autoComplete="email" /></label><label>Phone <span>(optional)</span><input name="phone" type="tel" autoComplete="tel" /></label><label>Website <span>(optional)</span><input name="businessUrl" type="url" placeholder="https://" /></label></div>
          <label>Campaign reach<select aria-label="Campaign reach" value={scope} onChange={(event) => { setScope(event.target.value as Scope); setStateAbbr(""); setCountyFips(""); }}><option value="county">County reach</option><option value="state">State reach</option><option value="national">National — custom quote</option></select></label>
          {scope !== "national" && <>
            <div className="form-grid"><label>Placement<select aria-label="Placement" value={placement} onChange={(event) => scope === "county" ? setCountyPlacement(event.target.value as CountyPlacement) : setStatePlacement(event.target.value as StatePlacement)}>{packages.filter((item) => item.scope === scope).map((item) => <option key={item.placement} value={item.placement}>{item.name}</option>)}</select></label><label>Billing preference<select aria-label="Billing preference" value={billing} onChange={(event) => setBilling(event.target.value as BillingCadence)}><option value="monthly">Monthly</option><option value="annual">Annual — 12 months for 10</option></select></label></div>
            <label>State<select aria-label="State" value={stateAbbr} onChange={(event) => { setStateAbbr(event.target.value); setCountyFips(""); }}><option value="">Choose a state</option>{states.map((entry) => <option key={entry.abbr} value={entry.abbr}>{entry.name}</option>)}</select></label>
            {scope === "county" ? <><label>County<select aria-label="County" value={countyFips} disabled={!state} onChange={(event) => setCountyFips(event.target.value)}><option value="">Choose a county</option>{counties.map((entry) => <option key={entry.fips} value={entry.fips} disabled={selectedCounties.some((selected) => selected.fips === entry.fips)}>{entry.name}</option>)}</select></label><button className="button button-outline" type="button" disabled={!countyFips || selectedCounties.length >= 25} onClick={() => void addCounty()}>{adding ? "Looking up population…" : "Add county"}</button>
              <ul className="coverage-list" aria-label="Selected counties">{[...selectedCounties].sort((a, b) => b.population - a.population).map((entry, index) => <li key={entry.fips}><span><strong>{entry.name}</strong><small>Population {entry.population.toLocaleString("en-US")} · Census {entry.estimateVintage}</small><small>{formatAdPrice(monthlyCountyPlacementPrice(entry.population, countyPlacement) * (index === 0 ? 1 : 0.5))}/month{index ? " · 50% additional-county rate" : " · full rate"}</small></span><button type="button" className="inline-button" aria-label={`Remove ${entry.name}`} onClick={() => { setSelectedCounties((current) => current.filter((county) => county.fips !== entry.fips)); reset(); }}>Remove</button></li>)}</ul>
            </> : <><button className="button button-outline" type="button" disabled={!state || selectedStates.includes(state.slug)} onClick={() => { if (state) setSelectedStates((current) => [...current, state.slug]); setStateAbbr(""); reset(); }}>Add state</button><ul className="coverage-list" aria-label="Selected states">{selectedStateObjects.map((entry) => <li key={entry.slug}><span><strong>{entry.name}</strong><small>{getCountyByState(entry.name).length} counties</small></span><button type="button" className="inline-button" aria-label={`Remove ${entry.name}`} onClick={() => { setSelectedStates((current) => current.filter((slug) => slug !== entry.slug)); reset(); }}>Remove</button></li>)}</ul></>}
            {needsFeeds && <div className="section-picker" role="group" aria-label="Sections to sponsor"><strong>Sections to sponsor *</strong><p>Each section is $20 per county per month across every selected state.</p>{sponsorableFeeds.map((entry) => <label key={entry.key}><input type="checkbox" checked={feeds.includes(entry.key)} onChange={() => setFeeds((current) => current.includes(entry.key) ? current.filter((key) => key !== entry.key) : [...current, entry.key])} /> {entry.label}</label>)}</div>}
          </>}
          <label>Referred by <span>(optional)</span><input name="referredBy" maxLength={120} /></label><label>Campaign notes <span>(optional)</span><textarea name="message" rows={3} placeholder="Timing, audience, or placement preferences" maxLength={4000} /></label>
          <div className="honeypot" aria-hidden="true"><label>Company fax<input name="companyFax" tabIndex={-1} autoComplete="off" /></label></div>
          <label className="consent"><input name="consent" type="checkbox" required /><span>I agree to be contacted about this campaign and accept the <a href="https://patriotsinaction.com/terms">terms</a> and <a href="https://patriotsinaction.com/privacy">privacy statement</a>.</span></label>
          <button className="button submit-button" type="submit" disabled={!hasSelection || busy}>{status === "sending" ? "Preparing your request…" : scope === "national" ? "Request a quote →" : `Send request & open Stripe — ${formatAdPrice(total)}/${billing === "annual" ? "year" : "month"}`}</button>
          <p className="form-note">{scope === "national" ? "Our team will prepare a national proposal." : "Secure Stripe checkout opens after your campaign details are sent. Placement availability and creative are confirmed before launch."}</p>
        </fieldset>
        {error && <p className="form-error" role="alert">{error} <a href={`mailto:${advertiserContactEmail}`}>Email {advertiserContactEmail}</a></p>}
        {status === "success" && <div className="form-success" role="status"><p>Your campaign request has been sent.{submittedUrl ? " Continue to Stripe to complete payment." : " Our team will follow up with you."}</p>{submittedUrl && <a className="button" href={submittedUrl}>Continue to Stripe</a>}</div>}
      </form>
    </div></section>
  </>;
}
