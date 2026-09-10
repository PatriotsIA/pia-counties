import countyPostLogo from "../../county-post-final-logo.png";

const countyPostUrl = "https://thecountypost.com";

export function CountyPostNewsSection({ locationName }: { locationName: string }) {
  return (
    <section className="section county-post-news-section">
      <a
        className="county-post-news-logo-link"
        href={countyPostUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Visit The County Post"
      >
        <img src={countyPostLogo} alt="The County Post" />
      </a>
      <div className="county-post-news-copy">
        <p className="eyebrow">Every County. Every Community. One Nation.</p>
        <h2>The County Post</h2>
        <p className="county-post-news-tagline">
          A nationwide, ultra-local news source for every county in America.
        </p>
        <p>
          Follow reporting for {locationName} and discover the local stories,
          public decisions, elections, and community updates shaping counties
          across the country.
        </p>
        <a className="button primary" href={countyPostUrl} target="_blank" rel="noreferrer">
          Visit The County Post
        </a>
      </div>
    </section>
  );
}
