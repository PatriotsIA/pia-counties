import { useEffect, useMemo, useRef, useState } from "react";
import type { AdCreative, AdPlacement, AdSlotId } from "../data/ads";
import type { CountyPageKey, CountySite } from "../data/counties";
import { resolveAdsByIds, resolveAdsForSlot, type AdRouteType } from "../lib/ads";
import { trackAdClick, trackAdImpression, type AdTrackingPayload } from "../lib/analytics";
import { imageAssets } from "../data/image-assets.generated";
import { COUNTY_POST_CAMPAIGN } from "../data/county-post-ads";

type AdSlotProps = {
  slot: AdSlotId;
  route: AdRouteType;
  county?: CountySite;
  page?: CountyPageKey;
  limit?: number;
  placement?: AdPlacement;
  adIds?: readonly string[];
};

export function AdSlot({ slot, route, county, page, limit = 1, placement, adIds }: AdSlotProps) {
  const resolveLimit = slot === "county-page-footer" || slot === "site-footer" ? Math.max(limit, 20) : limit;
  const resolvedAds = useMemo(
    () => (adIds?.length ? resolveAdsByIds([...adIds]) : resolveAdsForSlot({ slot, route, county, page, limit: resolveLimit })),
    [adIds, county, page, resolveLimit, route, slot],
  );

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
      {slot === "site-inline" ? <p className="sponsor-label">Sponsored by {[...new Set(resolvedAds.map((ad) => ad.sponsor))].join(", ")}</p> : null}
      {resolvedAds.map((ad) => (
        <AdCard ad={ad} county={county} key={ad.id} page={page} placement={placement || ad.placement} slot={slot} />
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
  const firstCard = track.querySelector<HTMLElement>(".sponsor-banner-carousel-item, .sponsor-carousel-item");
  const step = firstCard ? firstCard.offsetWidth : track.clientWidth;
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
      className={`sponsor-card sponsor-card-${placement} sponsor-card-${ad.display}${ad.campaignId === COUNTY_POST_CAMPAIGN ? " sponsor-card-county-post" : ""}`}
      data-ad-id={ad.id}
      href={ad.href}
      onClick={() => trackAdClick(trackingPayload)}
      ref={cardRef}
      rel={opensNewWindow ? "noreferrer" : undefined}
      target={opensNewWindow ? "_blank" : undefined}
    >
      <AdImage ad={ad} slot={slot} />
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

function AdImage({ ad, slot }: { ad: AdCreative; slot: AdSlotId }) {
  const ref = useRef<HTMLPictureElement>(null);
  const [ready, setReady] = useState(false);
  const desktop = imageAssets[ad.image.desktop];
  const mobile = ad.image.mobile ? imageAssets[ad.image.mobile] : undefined;
  const sizes = slot === "site-inline" && ad.campaignId === COUNTY_POST_CAMPAIGN
    ? "(max-width: 780px) calc(100vw - 40px), 720px"
    : ad.placement === "leaderboard" ? "(max-width: 780px) calc(100vw - 116px), 876px" : "300px";

  useEffect(() => {
    const picture = ref.current;
    if (!picture) return;
    if (typeof IntersectionObserver === "undefined") {
      // Legacy browsers still get the artwork.
      picture.querySelectorAll<HTMLImageElement | HTMLSourceElement>("[data-src]").forEach((image) => {
        image.setAttribute("src", image.dataset.src!);
      });
      return;
    }
    const track = picture.closest(".sponsor-carousel-track, .sponsor-banner-carousel-track");
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setReady(true);
      observer.disconnect();
    }, { root: track, rootMargin: track ? "0px 100%" : "400px" });
    observer.observe(picture);
    return () => observer.disconnect();
  }, []);

  return <picture ref={ref}>
    {ad.image.mobile ? <source media="(max-width: 780px)" srcSet={ready ? mobile?.srcSet || ad.image.mobile : undefined} width={mobile?.width} height={mobile?.height} sizes={sizes} /> : null}
    <img src={ready ? desktop?.src || ad.image.desktop : undefined} data-src={desktop?.src || ad.image.desktop}
      srcSet={ready ? desktop?.srcSet : undefined} sizes={sizes} width={desktop?.width} height={desktop?.height}
      loading="lazy" decoding="async" alt={ad.image.alt} />
  </picture>;
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
