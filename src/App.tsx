import { useEffect, useRef, useState, type FormEvent } from "react";
import { getCountyByState } from "@nickgraffis/us-counties";
import { states } from "./data/states";
import { countyDisplayName } from "./data/county-geography";
import {
  adAssetSpecs,
  formatAdPrice,
  partnerSubscriptionTiers,
  tierHasStripeCheckout,
} from "./data/ad-pricing";
import { sendSiteContactEmail } from "./lib/email";
import { PlacementExamples } from "./components/PlacementExamples";

const mainSite = "https://patriotsinaction.com";
const mainTiers = partnerSubscriptionTiers.filter((tier) =>
  [
    "patriot-preferred",
    "gold-business",
    "platinum-business",
    "county-sponsor",
  ].includes(tier.id),
);

export default function App() {
  const [tierId, setTierId] = useState("gold-business");
  const [billing, setBilling] = useState("monthly");
  const [businessName, setBusinessName] = useState("");
  const [stateAbbr, setStateAbbr] = useState("");
  const [countyFips, setCountyFips] = useState("");
  const [creativeUrl, setCreativeUrl] = useState("");
  const [creativeError, setCreativeError] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const submitting = useRef(false);
  const tier = partnerSubscriptionTiers.find((item) => item.id === tierId)!;
  const national = tierId === "national-level";
  const selectedState = states.find((state) => state.abbr === stateAbbr);
  const counties = selectedState
    ? getCountyByState(selectedState.name)
        .map((county) => ({
          ...county,
          name: ["AK", "DC"].includes(selectedState.abbr)
            ? county.name
            : countyDisplayName(county.name, selectedState.slug, county.FIPS),
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const countyName = counties.find(
    (county) => county.FIPS === countyFips,
  )?.name;
  const stateName = states.find((state) => state.abbr === stateAbbr)?.name;
  const price = billing === "monthly" ? tier.monthly : tier.yearly;
  const stripeUrl =
    billing === "monthly" ? tier.stripeMonthlyUrl : tier.stripeYearlyUrl;

  useEffect(() => {
    // Old preview links continue into this single-page sales experience.
    const legacy = ["/payments", "/advertise", "/contact"];
    if (
      window.location.pathname === "/privacy" ||
      window.location.pathname === "/terms"
    ) {
      window.location.replace(`${mainSite}${window.location.pathname}`);
      return;
    }
    if (window.location.pathname !== "/") {
      window.history.replaceState(
        null,
        "",
        `/${window.location.search}${legacy.includes(window.location.pathname) ? "#campaign" : ""}`,
      );
    }
    const id = window.location.hash.slice(1);
    if (id)
      requestAnimationFrame(() =>
        document.getElementById(id)?.scrollIntoView(),
      );
  }, []);

  useEffect(
    () => () => {
      if (creativeUrl) URL.revokeObjectURL(creativeUrl);
    },
    [creativeUrl],
  );

  function selectTier(id: string) {
    if (submitting.current) return;
    setTierId(id);
    setStatus("idle");
    window.history.pushState(null, "", "#campaign");
    document.getElementById("campaign")?.scrollIntoView({ behavior: "smooth" });
    requestAnimationFrame(() =>
      document.getElementById("tier")?.focus({ preventScroll: true }),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const data = new FormData(event.currentTarget);
    if (String(data.get("companyFax") || "")) return;
    submitting.current = true;
    setStatus("sending");
    try {
      await sendSiteContactEmail({
        title: "PIA advertising campaign request",
        replyTo: String(data.get("email") || "").trim(),
        values: {
          name: String(data.get("name") || "").trim(),
          email: String(data.get("email") || "").trim(),
          businessName: businessName.trim(),
          phone: String(data.get("phone") || "").trim(),
          businessUrl: String(data.get("businessUrl") || "").trim(),
          tier: tier.name,
          billing,
          advertisedRate: national
            ? "Custom quote"
            : `${formatAdPrice(price)}/${billing === "monthly" ? "month" : "year"}`,
          coverage: national
            ? "Nationwide"
            : `${countyName}, ${stateName} (FIPS ${countyFips})`,
          additionalCounties: String(
            data.get("additionalCounties") || "",
          ).trim(),
          referredBy: String(data.get("referredBy") || "").trim(),
          message: String(data.get("message") || "").trim(),
          contactConsent: data.get("consent") === "on",
        },
      });
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      submitting.current = false;
    }
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="topline">LOCAL CONNECTIONS. LASTING IMPACT.</div>
      <header className="site-header">
        <a
          className="brand"
          href="/"
          aria-label="Patriots in Action advertising home"
        >
          <img src="/brand/SocialIcon.png" alt="" width="54" height="54" />
          <span>
            Patriots in Action<small>ADVERTISING & PARTNERSHIPS</small>
          </span>
        </a>
        <nav aria-label="Advertising navigation">
          <a href="#pricing">Pricing</a>
          <a href="#examples">Examples</a>
          <a href="#faq">FAQs</a>
          <a className="button button-small" href="#campaign">
            Start a campaign <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>
      <main id="main">
        <section className="hero section-wrap">
          <div className="hero-copy">
            <p className="eyebrow">
              <span /> A PARTNER IN YOUR COMMUNITY
            </p>
            <h1>
              Show up where
              <br />
              your community
              <br />
              <em>comes together.</em>
            </h1>
            <p className="lead">
              Put your business alongside the local news, events, and civic
              resources that bring people to Patriots in Action.
            </p>
            <div className="actions">
              <a className="button" href="#campaign">
                Build your campaign <span aria-hidden="true">→</span>
              </a>
              <a className="text-link" href="#examples">
                Explore the placements <span aria-hidden="true">↗</span>
              </a>
            </div>
            <div className="hero-detail">
              <strong>Local roots. National reach.</strong>
              <span>Choose your county or ask about the full PIA network.</span>
            </div>
          </div>
          <div
            className="hero-preview"
            aria-label="Illustrative county sponsorship placement"
          >
            <div className="preview-top">
              <span className="preview-dot" /> PATRIOTS IN ACTION{" "}
              <span>COUNTY EDITION</span>
            </div>
            <div className="preview-cover">
              <span>YOUR COMMUNITY. YOUR CONNECTION.</span>
              <h2>
                Your county.
                <br />
                In action.
              </h2>
              <p>Local news · Community events · Civic resources</p>
              <div className="presented">
                PRESENTED BY{" "}
                <strong>
                  {businessName.trim() || "Your Business"}{" "}
                  <span aria-hidden="true">↗</span>
                </strong>
              </div>
            </div>
            <div className="preview-content">
              <div>
                <span className="eyebrow">AROUND THE COUNTY</span>
                <h3>
                  Good things happen
                  <br />
                  close to home.
                </h3>
                <div className="sample-lines" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
              <div className="sample-square">
                <span aria-hidden="true">★</span>
                <strong>{businessName.trim() || "Your Business"}</strong>
                <small>PROUD COMMUNITY PARTNER</small>
              </div>
            </div>
            <div className="preview-caption">
              <span className="status-dot" /> Your brand, part of the local
              picture.<small>Illustrative placement</small>
            </div>
          </div>
        </section>
        <div className="benefit-strip">
          <div className="section-wrap">
            <span>
              <b>01</b> Choose your community
            </span>
            <span>
              <b>02</b> Find your placement
            </span>
            <span>
              <b>03</b> Connect with local readers
            </span>
          </div>
        </div>

        <section id="pricing" className="section-wrap section-space">
          <div className="section-heading">
            <div>
              <p className="eyebrow">A PLACE FOR YOUR BUSINESS</p>
              <h2>
                Local partnerships.
                <br />
                Straightforward pricing.
              </h2>
            </div>
            <div>
              <p>Start with one county. Grow your presence from there.</p>
              <div
                className="billing-switch"
                aria-label="Pricing billing period"
              >
                <button
                  type="button"
                  disabled={status === "sending"}
                  aria-pressed={billing === "monthly"}
                  onClick={() => {
                    setBilling("monthly");
                    setStatus("idle");
                  }}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  disabled={status === "sending"}
                  aria-pressed={billing === "annual"}
                  onClick={() => {
                    setBilling("annual");
                    setStatus("idle");
                  }}
                >
                  Annual <span>Save 2 months</span>
                </button>
              </div>
            </div>
          </div>
          <div className="pricing-grid">
            {mainTiers.map((item) => (
              <article
                key={item.id}
                className={`price-card ${item.id === "gold-business" ? "featured" : ""}`}
              >
                <p className="eyebrow">
                  {item.id === "gold-business"
                    ? "CONTENT & COMMUNITY"
                    : item.id === "county-sponsor"
                      ? "PREMIER COUNTY PRESENCE"
                      : item.id === "platinum-business"
                        ? "PRIORITY VISIBILITY"
                        : "YOUR LOCAL INTRODUCTION"}
                </p>
                <h3>
                  {item.name
                    .replace(" Business Program", "")
                    .replace(" Business Partner", " Partner")
                    .replace(" — Presented By", "")}
                </h3>
                <p className="price">
                  <strong>
                    {formatAdPrice(
                      billing === "monthly" ? item.monthly : item.yearly,
                    )}
                  </strong>
                  <span>/{billing === "monthly" ? "month" : "year"}</span>
                </p>
                <p className="price-note">
                  {billing === "monthly"
                    ? `${formatAdPrice(item.yearly)} with annual billing`
                    : "12 months for the price of 10"}
                </p>
                <ul>
                  {item.perks.slice(0, 4).map((perk) => (
                    <li key={perk}>{perk}</li>
                  ))}
                </ul>
                <button
                  className={`button ${item.id === "gold-business" ? "" : "button-outline"}`}
                  type="button"
                  disabled={status === "sending"}
                  onClick={() => selectTier(item.id)}
                >
                  Choose{" "}
                  {item.id === "patriot-preferred"
                    ? "Preferred"
                    : item.id === "county-sponsor"
                      ? "County Sponsor"
                      : item.id === "gold-business"
                        ? "Gold"
                        : "Platinum"}{" "}
                  <span aria-hidden="true">→</span>
                </button>
              </article>
            ))}
          </div>
          <div className="pricing-extras">
            <p>
              <strong>Expanding next door?</strong> Each additional contiguous
              county is 50% of your base tier rate. Your primary county stays at
              full price; we’ll confirm coverage and arrange add-ons.
            </p>
            <p>
              <strong>Become a founding partner.</strong> County Gold founding
              partnerships start at $95/month or $950/year, subject to
              availability.{" "}
              <button
                className="inline-button"
                disabled={status === "sending"}
                onClick={() => selectTier("county-gold")}
              >
                Ask about founding availability →
              </button>
            </p>
          </div>
          <aside className="national-callout">
            <div>
              <p className="eyebrow">THINKING BIGGER?</p>
              <h3>Take your brand across the PIA network.</h3>
              <p>
                National homepage, sponsor carousel, and banner opportunities.
                Custom pricing for your reach.
              </p>
            </div>
            <button
              className="button button-light"
              disabled={status === "sending"}
              onClick={() => selectTier("national-level")}
            >
              Plan a national campaign ↗
            </button>
          </aside>
        </section>

        <section className="campaign-section">
          <div className="section-wrap campaign-layout">
            <aside className="campaign-copy">
              <p className="eyebrow">LET’S MAKE IT LOCAL</p>
              <h2>
                Build your
                <br />
                next connection.
              </h2>
              <p>
                Tell us about your business and where you want to be seen. Our
                team will help confirm your placements and get your artwork
                ready.
              </p>
              <div className="campaign-summary" aria-live="polite">
                <span>YOUR SELECTED PARTNERSHIP</span>
                <h3>{tier.name}</h3>
                <p className="price">
                  <strong>
                    {national ? "Let’s talk" : formatAdPrice(price)}
                  </strong>
                  {!national && (
                    <span>/{billing === "monthly" ? "month" : "year"}</span>
                  )}
                </p>
                <p>
                  {national
                    ? "Custom national proposal"
                    : "Base rate for one county. Add-ons quoted separately."}
                </p>
              </div>
              <p className="contact-note">
                Prefer a conversation?
                <br />
                <a href="mailto:erik@patriotsinaction.com">
                  erik@patriotsinaction.com
                </a>
                <br />
                <a href="tel:+18667561776">(866) 756-1776</a>
              </p>
            </aside>
            <form
              id="campaign"
              className="campaign-form"
              onSubmit={submit}
              onChange={() => {
                if (status !== "sending") setStatus("idle");
              }}
            >
              <fieldset disabled={status === "sending"}>
                <legend>Plan your campaign</legend>
                <p className="form-intro">Fields marked * are required.</p>
                <div className="form-grid">
                  <label>
                    Partnership *
                    <select
                      aria-label="Partnership"
                      id="tier"
                      name="tier"
                      value={tierId}
                      onChange={(event) => setTierId(event.target.value)}
                    >
                      {partnerSubscriptionTiers.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Billing preference *
                    <select
                      aria-label="Billing preference"
                      name="billing"
                      value={billing}
                      onChange={(event) => setBilling(event.target.value)}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual — save 2 months</option>
                    </select>
                  </label>
                </div>
                <div className="form-grid">
                  <label>
                    Business or organization *
                    <input
                      name="businessName"
                      autoComplete="organization"
                      value={businessName}
                      onChange={(event) => setBusinessName(event.target.value)}
                      required
                      maxLength={120}
                      pattern=".*\S.*"
                    />
                  </label>
                  <label>
                    Your name *
                    <input
                      name="name"
                      autoComplete="name"
                      required
                      maxLength={120}
                      pattern=".*\S.*"
                    />
                  </label>
                  <label>
                    Email address *
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                    />
                  </label>
                  <label>
                    Phone <span>(optional)</span>
                    <input
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      maxLength={40}
                    />
                  </label>
                  <label>
                    Business website <span>(optional)</span>
                    <input
                      name="businessUrl"
                      type="url"
                      placeholder="https://"
                      maxLength={500}
                    />
                  </label>
                  <label>
                    Referred by <span>(optional)</span>
                    <input
                      name="referredBy"
                      maxLength={120}
                      placeholder="Salesperson or referrer"
                    />
                  </label>
                </div>
                {!national && (
                  <>
                    <div className="form-grid">
                      <label>
                        State *
                        <select
                          aria-label="State"
                          name="state"
                          required
                          value={stateAbbr}
                          onChange={(event) => {
                            setStateAbbr(event.target.value);
                            setCountyFips("");
                          }}
                        >
                          <option value="">Select a state</option>
                          {states.map((state) => (
                            <option key={state.abbr} value={state.abbr}>
                              {state.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Primary county or equivalent *
                        <select
                          aria-label="Primary county or equivalent"
                          name="county"
                          required
                          disabled={!stateAbbr}
                          value={countyFips}
                          onChange={(event) =>
                            setCountyFips(event.target.value)
                          }
                        >
                          <option value="">
                            {stateAbbr
                              ? "Select a county"
                              : "Choose a state first"}
                          </option>
                          {counties.map((county) => (
                            <option key={county.FIPS} value={county.FIPS}>
                              {county.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label>
                      Additional neighboring counties <span>(optional)</span>
                      <input
                        name="additionalCounties"
                        maxLength={500}
                        placeholder="Tell us where else you’d like to advertise"
                      />
                    </label>
                  </>
                )}
                <label>
                  What would you like to promote? <span>(optional)</span>
                  <textarea
                    name="message"
                    rows={3}
                    maxLength={3000}
                    placeholder="Your goals, preferred placements, timing, or questions…"
                  />
                </label>
                <label className="consent">
                  <input name="consent" type="checkbox" required />
                  <span>
                    I agree to be contacted about this advertising request. *{" "}
                    <a
                      href={`${mainSite}/privacy`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Privacy policy
                    </a>
                  </span>
                </label>
                <label className="honeypot" aria-hidden="true">
                  Company fax
                  <input name="companyFax" tabIndex={-1} autoComplete="off" />
                </label>
                <button
                  type="submit"
                  className="button submit-button"
                  disabled={status === "sending" || status === "success"}
                >
                  {status === "sending"
                    ? "Sending your request…"
                    : status === "success"
                      ? "Request sent ✓"
                      : "Send campaign request →"}
                </button>
                <p className="form-note">
                  Sending a request does not charge your card or reserve a
                  placement.
                </p>
              </fieldset>
              {status === "success" && (
                <div className="form-success" role="status">
                  <strong>Your campaign request has been sent.</strong>
                  <p>
                    Our team will follow up about coverage, availability, and
                    artwork.
                  </p>
                  {tierHasStripeCheckout(tier) && (
                    <a
                      className="button"
                      href={stripeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Continue to Stripe — {formatAdPrice(price)}/
                      {billing === "monthly" ? "month" : "year"} ↗
                    </a>
                  )}
                </div>
              )}
              {status === "error" && (
                <p className="form-error" role="alert">
                  We couldn’t send your request. Your details are still
                  here—please try again, or email{" "}
                  <a href="mailto:erik@patriotsinaction.com">
                    erik@patriotsinaction.com
                  </a>
                  .
                </p>
              )}
            </form>
          </div>
        </section>

        <section id="examples" className="section-wrap section-space">
          <div className="section-heading">
            <div>
              <p className="eyebrow">PICTURE YOUR BUSINESS HERE</p>
              <h2>
                A local presence.
                <br />
                In all the right places.
              </h2>
            </div>
            <p>
              Explore illustrative placements in the PIA experience. Your
              business name and optional artwork appear in the examples below.
            </p>
          </div>
          <div className="artwork-preview">
            <div>
              <strong>Try your artwork</strong>
              <p>
                PNG, JPG, or WebP · up to 5 MB. Preview stays in your browser.
                Email final artwork to{" "}
                <a href="mailto:erik@patriotsinaction.com">
                  {adAssetSpecs.email}
                </a>
                .
              </p>
            </div>
            <label className="upload-label">
              Choose artwork
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={async (event) => {
                  const input = event.currentTarget;
                  const file = input.files?.[0];
                  if (!file) return;
                  if (
                    !["image/png", "image/jpeg", "image/webp"].includes(
                      file.type,
                    ) ||
                    file.size > 5 * 1024 * 1024
                  ) {
                    setCreativeError(
                      "Choose a PNG, JPG, or WebP image up to 5 MB.",
                    );
                    input.value = "";
                    return;
                  }
                  const url = URL.createObjectURL(file);
                  const image = new Image();
                  image.src = url;
                  try {
                    await image.decode();
                    setCreativeUrl(url);
                    setCreativeError("");
                  } catch {
                    URL.revokeObjectURL(url);
                    setCreativeError(
                      "This image could not be opened. Please choose another file.",
                    );
                    input.value = "";
                  }
                }}
              />
            </label>
            {creativeUrl && (
              <button
                className="inline-button"
                onClick={() => {
                  setCreativeUrl("");
                  const input =
                    document.querySelector<HTMLInputElement>(
                      'input[type="file"]',
                    );
                  if (input) input.value = "";
                }}
              >
                Remove artwork
              </button>
            )}
          </div>
          {creativeError && (
            <p className="form-error" role="alert">
              {creativeError}
            </p>
          )}
          <PlacementExamples
            businessName={businessName.trim() || "Your Business"}
            creativeUrl={creativeUrl}
            countyName={countyName || "Your County"}
          />
          <div className="asset-note">
            <strong>Ready-to-run creative</strong>
            <span>
              Square: <b>250 × 250 px</b>
            </span>
            <span>
              Banner: <b>980 × 300 px</b>
            </span>
            <span>Final files: PNG, white or transparent background.</span>
          </div>
          <a
            className="text-link"
            href={mainSite}
            target="_blank"
            rel="noreferrer"
          >
            Explore the live Patriots in Action site ↗
          </a>
        </section>
        <section id="faq" className="section-wrap faq-section">
          <div>
            <p className="eyebrow">THE DETAILS</p>
            <h2>
              A few things
              <br />
              to know.
            </h2>
          </div>
          <div className="faq-list">
            <details>
              <summary>What happens after I submit the form?</summary>
              <p>
                We’ll review your selected partnership and requested coverage,
                confirm availability, and coordinate your creative. For eligible
                plans, the confirmation also offers the existing secure Stripe
                subscription link. Payment is separate from your request.
              </p>
            </details>
            <details>
              <summary>Can I advertise in more than one county?</summary>
              <p>
                Yes. List your additional contiguous counties in the form. Your
                primary county is full price, and each eligible neighboring
                county is half the base tier rate. Add-ons are arranged
                separately; the displayed base price covers one county.
              </p>
            </details>
            <details>
              <summary>How does annual pricing work?</summary>
              <p>
                Annual subscriptions provide 12 months for the price of 10. For
                example, Gold is $295 per month or $2,950 billed annually.
              </p>
            </details>
            <details>
              <summary>What artwork should I send?</summary>
              <p>
                Email finished PNG files to{" "}
                <a href="mailto:erik@patriotsinaction.com">
                  erik@patriotsinaction.com
                </a>
                : 250 × 250 pixels for square placements and 980 × 300 pixels
                for banners, with a white or transparent background. The preview
                tool does not upload or submit your artwork. If you need design
                help, ask us about creative production pricing.
              </p>
            </details>
            <details>
              <summary>
                Are founding and national partnerships available?
              </summary>
              <p>
                Founding packages depend on county availability. Select a
                founding tier to ask our team. National partnerships use custom
                quotes for homepage, carousel, and banner placements across the
                PIA network.
              </p>
            </details>
          </div>
        </section>
      </main>
      <footer className="site-footer section-wrap">
        <div className="brand">
          <img src="/brand/SocialIcon.png" alt="" width="44" height="44" />
          <span>
            Patriots in Action<small>LOCAL CONNECTIONS. LASTING IMPACT.</small>
          </span>
        </div>
        <div>
          <a href="mailto:erik@patriotsinaction.com">
            erik@patriotsinaction.com
          </a>
          <small>Patriots Connect, LLC, DBA Patriots in Action</small>
        </div>
        <nav aria-label="Footer">
          <a href={`${mainSite}/terms`}>Terms</a>
          <a href={`${mainSite}/privacy`}>Privacy</a>
          <a href={mainSite}>Visit PIA ↗</a>
        </nav>
      </footer>
    </>
  );
}
