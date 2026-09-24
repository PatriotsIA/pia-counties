import { useEffect, useState } from "react";
import { adAssetSpecs } from "./data/ad-pricing";
import { PlacementExamples } from "./components/PlacementExamples";
import { CampaignBuilder } from "./components/CampaignBuilder";
import { advertiserContactEmail } from "./data/advertiser-contact";
const mainSite = "https://patriotsinaction.com";

export default function App() {
  const [businessName, setBusinessName] = useState("");
  const [countyName, setCountyName] = useState("Your County");
  const [creativeUrl, setCreativeUrl] = useState("");
  const [creativeError, setCreativeError] = useState("");

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
              <span>Choose counties, states, or the full PIA network.</span>
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

        <CampaignBuilder businessName={businessName} setBusinessName={setBusinessName} onLocationChange={setCountyName} />

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
                <a href={`mailto:${advertiserContactEmail}`}>
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
          <figure className="county-site-example">
            <figcaption>
              <div>
                <p className="eyebrow">A REAL COUNTY SITE</p>
                <h3>Explore the Potter County experience</h3>
                <p>
                  See how sponsor recognition, square ads, and wide banners fit
                  into a complete county page. Select the screenshot to view it
                  at full size.
                </p>
              </div>
              <a
                className="text-link"
                href="https://patriotsinaction.com/texas/potter"
                target="_blank"
                rel="noreferrer"
              >
                Visit Potter County ↗
              </a>
            </figcaption>
            <a
              href="/examples/potter-county-site.png"
              target="_blank"
              rel="noreferrer"
              aria-label="View the full-size Potter County site screenshot"
            >
              <img
                src="/examples/potter-county-site.png"
                alt="Full Potter County Patriots page showing the county hero sponsor, community content, square sponsor carousel, and wide footer banner"
                width="2024"
                height="6767"
                loading="lazy"
                decoding="async"
              />
            </a>
          </figure>
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
                confirm availability, and coordinate your creative. For plans
                with online checkout, we send your campaign details and then
                automatically open the Stripe payment form for your selected
                plan and billing period. Quote-only plans stay here for
                confirmation and follow-up.
              </p>
            </details>
            <details>
              <summary>Can I advertise in more than one county?</summary>
              <p>
                Yes. Select up to 25 counties in the form. The highest-priced county
                is full rate; every additional county is half its own population-tier
                rate. Your total includes every selected county in one checkout.
                For broader reach, select entire states.
              </p>
            </details>
            <details>
              <summary>How does annual pricing work?</summary>
              <p>
                Annual subscriptions provide 12 months for the price of 10. For
                example, a $250 monthly campaign is $2,500 billed annually.
              </p>
            </details>
            <details>
              <summary>What artwork should I send?</summary>
              <p>
                Email finished PNG files to{" "}
                <a href={`mailto:${advertiserContactEmail}`}>
                  {advertiserContactEmail}
                </a>
                : 250 × 250 pixels for square placements and 980 × 300 pixels
                for banners, with a white or transparent background. The preview
                tool does not upload or submit your artwork. If you need design
                help, ask us about creative production pricing.
              </p>
            </details>
            <details>
              <summary>
                Are national partnerships available?
              </summary>
              <p>
                National partnerships use custom
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
          <a href={`mailto:${advertiserContactEmail}`}>
            {advertiserContactEmail}
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
