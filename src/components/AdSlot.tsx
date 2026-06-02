import { useEffect, useMemo, useRef } from "react";
import type { AdCreative, AdPlacement, AdSlotId } from "../data/ads";
import { adSlotPricingKey, type AdPricingKey } from "../data/ad-pricing";
import type { CountyPageKey, CountySite } from "../data/counties";
import { ADVERTISER_PREVIEW_ENABLED } from "../config/advertiser-preview";
import { resolveAdsForSlot, type AdRouteType } from "../lib/ads";
import { trackAdClick, trackAdImpression, type AdTrackingPayload } from "../lib/analytics";
import { AdPreviewPlaceholder } from "./AdPreviewPlaceholder";

type AdSlotProps = {
  slot: AdSlotId;
  route: AdRouteType;
  county?: CountySite;
  page?: CountyPageKey;
  limit?: number;
  placement?: AdPlacement;
};

export function AdSlot({ slot, route, county, page, limit = 1, placement }: AdSlotProps) {
  const resolveLimit = slot === "county-page-footer" || slot === "site-footer" ? Math.max(limit, 20) : limit;
  const resolvedAds = useMemo(
    () => resolveAdsForSlot({ slot, route, county, page, limit: resolveLimit }),
    [county, page, resolveLimit, route, slot],
  );

  if (ADVERTISER_PREVIEW_ENABLED) {
    return <AdPreviewSlot slot={slot} limit={limit} placement={placement} county={county} />;
  }

  if (!resolvedAds.length) return null;

  if (slot === "county-home-inline") {
    return <CountySponsorCarousel ads={resolvedAds} county={county} page={page} placement={placement} slot={slot} />;
  }

  if (slot === "county-page-footer" || slot === "site-footer") {
    const bannerAds = resolvedAds.filter((ad) => ad.placement === "leaderboard" && ad.display === "image-only").slice(0, limit);
    if (!bannerAds.length) return null;
    return <BannerAdCarousel ads={bannerAds} county={county} page={page} placement={placement} slot={slot} />;
  }

  return (
    <aside className={`sponsor-slot sponsor-slot-${slot}`} aria-label="Sponsored message">
      {resolvedAds.map((ad) => (
        <AdCard ad={ad} county={county} key={ad.id} page={page} placement={placement || ad.placement} slot={slot} />
      ))}
    </aside>
  );
}

function AdPreviewSlot({
  slot,
  limit = 1,
  placement,
  county,
}: {
  slot: AdSlotId;
  limit?: number;
  placement?: AdPlacement;
  county?: CountySite;
}) {
  const pricingKey: AdPricingKey =
    slot === "county-home-inline" && !county ? "homepage-sponsor-carousel" : adSlotPricingKey(slot);
  const previewCount = slot === "county-page-footer" || slot === "site-footer" ? Math.max(limit, 1) : limit;
  const isBanner = slot === "county-page-footer" || slot === "site-footer";
  const isCarousel = slot === "county-home-inline";
  const isNewsRow = slot === "county-news-inline";

  if (isCarousel) {
    const heading = county ? `${county.displayName} Patriots is sponsored by:` : "Patriots In Action is Sponsored By:";
    return (
      <aside className={`sponsor-slot sponsor-slot-${slot} sponsor-carousel ad-preview-carousel`} aria-label="Advertiser preview carousel">
        <div className="sponsor-carousel-heading">
          <p className="eyebrow">{heading}</p>
        </div>
        <div className="ad-preview-carousel-track">
          {Array.from({ length: previewCount }, (_, index) => (
            <div className="sponsor-carousel-item ad-preview-carousel-item" key={`${slot}-${index}`}>
              <AdPreviewPlaceholder pricingKey={pricingKey} />
            </div>
          ))}
        </div>
      </aside>
    );
  }

  if (isBanner) {
    return (
      <aside className={`sponsor-slot sponsor-slot-${slot} sponsor-banner-carousel ad-preview-banner`} aria-label="Advertiser preview banners">
        <div className="ad-preview-banner-track">
          {Array.from({ length: previewCount }, (_, index) => (
            <div className="sponsor-banner-carousel-item ad-preview-banner-item" key={`${slot}-${index}`}>
              <AdPreviewPlaceholder pricingKey={pricingKey} className={placement === "leaderboard" ? "ad-preview-leaderboard" : ""} />
            </div>
          ))}
        </div>
      </aside>
    );
  }

  if (isNewsRow) {
    return (
      <aside className={`sponsor-slot sponsor-slot-${slot} ad-preview-news-row`} aria-label="Advertiser preview news row">
        {Array.from({ length: previewCount }, (_, index) => (
          <AdPreviewPlaceholder pricingKey={pricingKey} key={`${slot}-${index}`} />
        ))}
      </aside>
    );
  }

  return (
    <aside className={`sponsor-slot sponsor-slot-${slot} ad-preview-slot`} aria-label="Advertiser preview placement">
      {Array.from({ length: previewCount }, (_, index) => (
        <AdPreviewPlaceholder pricingKey={pricingKey} key={`${slot}-${index}`} />
      ))}
    </aside>
  );
}

function BannerAdCarousel({
  ads,
  county,
  page,
  placement,
  slot,
}: {
  ads: AdCreative[];
  county?: CountySite;
  page?: CountyPageKey;
  placement?: AdPlacement;
  slot: AdSlotId;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || ads.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = window.setInterval(() => {
      scrollCarousel(track, 1);
    }, 10000);

    return () => window.clearInterval(interval);
  }, [ads.length]);

  function handleCarouselClick(direction: -1 | 1) {
    if (trackRef.current) scrollCarousel(trackRef.current, direction);
  }

  return (
    <aside className={`sponsor-slot sponsor-slot-${slot} sponsor-banner-carousel`} aria-label="Sponsored banner messages">
      <div className="sponsor-banner-carousel-shell">
        {ads.length > 1 ? (
          <button className="sponsor-carousel-arrow sponsor-carousel-arrow-prev" type="button" onClick={() => handleCarouselClick(-1)} aria-label="Previous sponsor banner">
            <span aria-hidden="true">&lt;</span>
          </button>
        ) : null}
        <div className="sponsor-banner-carousel-track" ref={trackRef}>
          {ads.map((ad) => (
            <div className="sponsor-banner-carousel-item" key={ad.id}>
              <AdCard ad={ad} county={county} page={page} placement={placement || ad.placement} slot={slot} />
            </div>
          ))}
        </div>
        {ads.length > 1 ? (
          <button className="sponsor-carousel-arrow sponsor-carousel-arrow-next" type="button" onClick={() => handleCarouselClick(1)} aria-label="Next sponsor banner">
            <span aria-hidden="true">&gt;</span>
          </button>
        ) : null}
      </div>
    </aside>
  );
}

function CountySponsorCarousel({
  ads,
  county,
  page,
  placement,
  slot,
}: {
  ads: AdCreative[];
  county?: CountySite;
  page?: CountyPageKey;
  placement?: AdPlacement;
  slot: AdSlotId;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const heading = county ? `${county.displayName} Patriots is sponsored by:` : "Patriots In Action is Sponsored By:";

  useEffect(() => {
    const track = trackRef.current;
    if (!track || ads.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const interval = window.setInterval(() => {
      scrollCarousel(track, 1);
    }, 10000);

    return () => window.clearInterval(interval);
  }, [ads.length]);

  function handleCarouselClick(direction: -1 | 1) {
    if (trackRef.current) scrollCarousel(trackRef.current, direction);
  }

  return (
    <aside className={`sponsor-slot sponsor-slot-${slot} sponsor-carousel`} aria-label={county ? `${county.displayName} sponsors` : "Patriots in Action sponsors"}>
      <div className="sponsor-carousel-heading">
        <p className="eyebrow">{heading}</p>
      </div>
      <div className="sponsor-carousel-shell">
        <button className="sponsor-carousel-arrow sponsor-carousel-arrow-prev" type="button" onClick={() => handleCarouselClick(-1)} aria-label="Previous sponsor">
          <span aria-hidden="true">&lt;</span>
        </button>
        <div className="sponsor-carousel-track" ref={trackRef}>
          {ads.map((ad) => (
            <div className="sponsor-carousel-item" key={ad.id}>
              <AdCard ad={ad} county={county} page={page} placement={placement || ad.placement} slot={slot} />
            </div>
          ))}
        </div>
        <button className="sponsor-carousel-arrow sponsor-carousel-arrow-next" type="button" onClick={() => handleCarouselClick(1)} aria-label="Next sponsor">
          <span aria-hidden="true">&gt;</span>
        </button>
      </div>
    </aside>
  );
}

function scrollCarousel(track: HTMLDivElement, direction: -1 | 1) {
  const firstCard = track.querySelector<HTMLElement>(".sponsor-carousel-item");
  const step = firstCard ? firstCard.offsetWidth + 16 : track.clientWidth;
  const nearEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - step / 2;
  const nearStart = track.scrollLeft <= step / 2;
  const left = direction > 0
    ? nearEnd ? 0 : track.scrollLeft + step
    : nearStart ? track.scrollWidth : track.scrollLeft - step;

  track.scrollTo({ left, behavior: "smooth" });
}

function AdCard({ ad, county, page, placement, slot }: { ad: AdCreative; county?: CountySite; page?: CountyPageKey; placement: AdPlacement; slot: AdSlotId }) {
  const cardRef = useRef<HTMLAnchorElement | null>(null);
  const trackedRef = useRef(false);
  const trackingPayload = useMemo(() => adTrackingPayload(ad, slot, county, page), [ad, county, page, slot]);
  const opensNewWindow = /^https?:\/\//i.test(ad.href);

  useEffect(() => {
    const element = cardRef.current;
    if (!element || trackedRef.current || typeof IntersectionObserver === "undefined") return;

    let impressionTimer: number | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          impressionTimer = window.setTimeout(() => {
            if (trackedRef.current) return;
            trackedRef.current = true;
            trackAdImpression(trackingPayload);
            observer.disconnect();
          }, 600);
          return;
        }

        if (impressionTimer) window.clearTimeout(impressionTimer);
      },
      { threshold: [0, 0.5, 1] },
    );

    observer.observe(element);

    return () => {
      if (impressionTimer) window.clearTimeout(impressionTimer);
      observer.disconnect();
    };
  }, [trackingPayload]);

  return (
    <a
      className={`sponsor-card sponsor-card-${placement} sponsor-card-${ad.display}`}
      href={ad.href}
      onClick={() => trackAdClick(trackingPayload)}
      ref={cardRef}
      rel={opensNewWindow ? "noreferrer" : undefined}
      target={opensNewWindow ? "_blank" : undefined}
    >
      <picture>
        {ad.image.mobile ? <source media="(max-width: 780px)" srcSet={ad.image.mobile} /> : null}
        <img src={ad.image.desktop} alt={ad.image.alt} />
      </picture>
      {ad.display === "card" ? (
        <span className="sponsor-card-content">
          <span className="sponsor-label">Sponsored by {ad.sponsor}</span>
          <strong>{ad.title}</strong>
          <span>{ad.body}</span>
          <span className="sponsor-cta">{ad.cta}</span>
        </span>
      ) : null}
    </a>
  );
}

function adTrackingPayload(ad: AdCreative, slot: AdSlotId, county?: CountySite, page?: CountyPageKey): AdTrackingPayload {
  return {
    adId: ad.id,
    campaignId: ad.campaignId,
    slotId: slot,
    sponsor: ad.sponsor,
    page,
    county: county ? `${county.state.slug}/${county.slug}` : undefined,
    destinationUrl: ad.href,
  };
}
