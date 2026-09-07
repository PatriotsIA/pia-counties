import { useEffect, useState } from "react";
import type { CountySite, StateSite } from "../data/counties";
import type { CountyFeedKind } from "../lib/county-feed-urls";
import { cachedNewsFeed, fetchNewsFeed, newsApiIsConfigured, newsTopics, type NewsResult, type NewsScope } from "../lib/news-api";

type FeedProps = {
  scope: NewsScope;
  feedKind: CountyFeedKind;
  title: string;
  eyebrow: string;
  description: string;
  emptyText: string;
  presentedBy?: { name: string; href: string; image?: string };
};

export function CountyNewsFeed({ county, ...props }: Omit<FeedProps, "scope"> & { county: CountySite }) {
  return <NewsFeed key={`${county.state.slug}/${county.slug}/${props.feedKind}`} {...props} scope={{ stateSlug: county.state.slug, countySlug: county.slug }} />;
}

export function StateNewsFeeds({ state }: { state: StateSite }) {
  return (
    <section className="section news-section" aria-label={`${state.name} news`}>
      <div className="section-heading"><p className="eyebrow">State Newsroom</p><h2>{state.name} News</h2></div>
      <div className="feed-pair">
        <NewsFeed scope={{ stateSlug: state.slug }} feedKind="localNews" title={`${state.name} Headlines`} eyebrow="State News" description={`Recent reporting from across ${state.name}.`} emptyText="No state news is currently available." />
        <NewsFeed scope={{ stateSlug: state.slug }} feedKind="elections" title="Elections & Politics" eyebrow="State Government" description={`Election, candidate, and political coverage from ${state.name}.`} emptyText="No state political coverage is currently available." />
      </div>
    </section>
  );
}

function NewsFeed({ scope, feedKind, title, eyebrow, description, emptyText, presentedBy }: FeedProps) {
  const topic = newsTopics[feedKind];
  const [limit, setLimit] = useState(40);
  const [visibleCount, setVisibleCount] = useState(5);
  const [result, setResult] = useState<NewsResult | undefined>(() => cachedNewsFeed(scope, topic));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const requestedScope = { stateSlug: scope.stateSlug, countySlug: scope.countySlug };
    void Promise.resolve().then(async () => {
      if (!active) return;
      setLoading(true);
      setError("");
      try {
        const next = await fetchNewsFeed(requestedScope, topic, limit, attempt > 0);
        if (active) setResult(next);
      } catch {
        if (active) setError("This feed could not be loaded right now. Please try again.");
      } finally { if (active) setLoading(false); }
    });
    return () => { active = false; };
  }, [scope.stateSlug, scope.countySlug, topic, limit, attempt]);

  // The API owns topic/locality filtering. Only the video widget narrows media.
  const items = (result?.feed.items || []).filter((item) => feedKind !== "localVideo" || item.mediaType === "video");
  const visibleItems = items.slice(0, visibleCount);
  const moreInMemory = visibleCount < items.length;
  const hasMore = moreInMemory || (result?.feed.meta.hasMore && limit < 200);
  const includesNearby = result?.feed.meta.sourcesUsed?.includes("county:fallback-nearby");
  function showMore() {
    setVisibleCount((count) => count + 5);
    if (!moreInMemory && !loading) setLimit((count) => Math.min(200, count + 40));
  }

  return (
    <article className="feed-widget" aria-label={title} aria-busy={loading}>
      <div className="feed-hero">
        <div className="feed-hero-title"><p className="eyebrow">{eyebrow}</p><h3>{title}</h3></div>
        {presentedBy ? (
          <a className="feed-presented-by" href={presentedBy.href} target="_blank" rel="noreferrer">
            {presentedBy.image ? <img src={presentedBy.image} alt="" loading="lazy" /> : null}
            <span>Presented by</span><strong>{presentedBy.name}</strong>
          </a>
        ) : null}
        <p className="feed-hero-description">{description}</p>
      </div>
      <div role="status" aria-live="polite">
        {loading && !items.length ? <p className="status">Loading news…</p> : null}
        {!loading && !error && !items.length ? <p className="status">{emptyText}</p> : null}
        {result?.stale ? <p className="status">Showing saved stories while the news service refreshes.</p> : null}
        {includesNearby ? <p className="status feed-fallback-notice">Includes coverage from nearby counties.</p> : null}
      </div>
      {error ? <p className="status" role="alert">{error}</p> : null}
      <div className="feed-list scroll-feed" onScroll={(event) => {
        const target = event.currentTarget;
        if (moreInMemory && target.scrollHeight - target.scrollTop - target.clientHeight < 80) showMore();
      }}>
        {visibleItems.map((item) => (
          <a className={item.imageUrl ? "feed-item" : "feed-item no-image"} href={item.link} key={item.link} target="_blank" rel="noreferrer">
            {item.imageUrl ? <img src={item.imageUrl} alt="" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} /> : null}
            <div><strong>{item.title}</strong><span>{[item.source, formatDate(item.publishedAt)].filter(Boolean).join(" | ")}</span>{item.description ? <p>{item.description}</p> : null}</div>
          </a>
        ))}
      </div>
      {hasMore ? <button className="button" type="button" onClick={showMore} disabled={loading}>Load more stories</button> : null}
      {(error || result?.stale) && newsApiIsConfigured() ? <button className="button" type="button" onClick={() => setAttempt((value) => value + 1)} disabled={loading}>Retry news feed</button> : null}
      <a className="feed-source" href={`https://thecountypost.com/${scope.stateSlug}${scope.countySlug ? `/${scope.countySlug}` : ""}`} target="_blank" rel="noreferrer">News from The County Post</a>
    </article>
  );
}

function formatDate(value?: string) {
  const date = value ? new Date(value) : undefined;
  return date && Number.isFinite(date.getTime()) ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
}
