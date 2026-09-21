import { useState } from "react";

type Props = { businessName: string; creativeUrl: string; countyName: string };

function Creative({
  businessName,
  creativeUrl,
  wide = false,
}: Omit<Props, "countyName"> & { wide?: boolean }) {
  return (
    <div className={`example-creative ${wide ? "wide" : ""}`}>
      {creativeUrl ? (
        <img src={creativeUrl} alt={`${businessName} artwork preview`} />
      ) : (
        <>
          <span aria-hidden="true">★</span>
          <strong>{businessName}</strong>
          <small>YOUR LOCAL COMMUNITY PARTNER</small>
          <span className="creative-cta">Get to know us ↗</span>
        </>
      )}
    </div>
  );
}

export function PlacementExamples({
  businessName,
  creativeUrl,
  countyName,
}: Props) {
  const [slide, setSlide] = useState(0);
  return (
    <div className="examples-grid">
      <article className="example-card">
        <div className="example-stage">
          <div className="example-browser">
            <span>LOCAL BUSINESS DIRECTORY</span>
            <div className="directory-demo">
              <Creative businessName={businessName} creativeUrl={creativeUrl} />
              <div>
                <h4>{businessName}</h4>
                <p>
                  Local service.
                  <br />
                  Community connection.
                </p>
                <span className="example-link">Visit our website ↗</span>
              </div>
            </div>
          </div>
        </div>
        <div className="example-description">
          <span className="eyebrow">01 / PATRIOT PREFERRED</span>
          <h3>A place in the directory</h3>
          <p>
            Your logo, business introduction, and a link to your website help
            readers find you.
          </p>
        </div>
      </article>
      <article className="example-card">
        <div className="example-stage">
          <div className="example-browser">
            <span>NEWS FROM YOUR COMMUNITY</span>
            <h4>Local News</h4>
            <div className="feed-credit">
              Presented by <strong>{businessName}</strong>
            </div>
            <div className="feed-demo">
              <div>
                <div className="sample-news-art" aria-hidden="true" />
                <strong>
                  What’s happening
                  <br />
                  around the county
                </strong>
                <div className="sample-lines" aria-hidden="true">
                  <i />
                  <i />
                </div>
              </div>
              <Creative businessName={businessName} creativeUrl={creativeUrl} />
            </div>
          </div>
        </div>
        <div className="example-description">
          <span className="eyebrow">02 / GOLD & PLATINUM</span>
          <h3>Part of the daily conversation</h3>
          <p>
            A Presented by credit alongside county content, with rotating 250 ×
            250 square placements.
          </p>
        </div>
      </article>
      <article className="example-card">
        <div className="example-stage">
          <div className="banner-demo">
            <span className="eyebrow">COUNTY COMMUNITY PARTNERS</span>
            <div className="banner-preview">
              <Creative
                businessName={slide === 0 ? businessName : "Community Partner"}
                creativeUrl={slide === 0 ? creativeUrl : ""}
                wide
              />
            </div>
            <div className="carousel-controls">
              <button
                aria-label="Previous banner example"
                onClick={() => setSlide((slide + 1) % 2)}
              >
                ←
              </button>
              <span aria-live="polite">Example {slide + 1} of 2</span>
              <button
                aria-label="Next banner example"
                onClick={() => setSlide((slide + 1) % 2)}
              >
                →
              </button>
            </div>
          </div>
        </div>
        <div className="example-description">
          <span className="eyebrow">03 / PLATINUM</span>
          <h3>Room to make an impression</h3>
          <p>
            A 980 × 300 banner in the county footer carousel gives your message
            a wider canvas.
          </p>
        </div>
      </article>
      <article className="example-card">
        <div className="example-stage">
          <div className="county-hero-demo">
            <span className="eyebrow">PATRIOTS IN ACTION</span>
            <h4>{countyName}</h4>
            <p>Your local civic connection.</p>
            <div className="presented">
              PRESENTED BY <strong>{businessName} ↗</strong>
            </div>
          </div>
        </div>
        <div className="example-description">
          <span className="eyebrow">04 / COUNTY SPONSOR</span>
          <h3>A first impression that stays</h3>
          <p>
            A prominent Presented by logo and link in the county hero. National
            hero sponsorship is available by quote.
          </p>
        </div>
      </article>
    </div>
  );
}
