import { useEffect, useMemo, useRef } from "react";
import type { AdCreative, AdPlacement, AdSlotId } from "../data/ads";
import type { CountyPageKey, CountySite } from "../data/counties";
import { resolveAdsForSlot, type AdRouteType } from "../lib/ads";
import { trackAdClick, trackAdImpression, type AdTrackingPayload } from "../lib/analytics";

type AdSlotProps = {
  slot: AdSlotId;
  route: AdRouteType;
  county?: CountySite;
  page?: CountyPageKey;
  limit?: number;
  placement?: AdPlacement;
};

export function AdSlot({ slot, route, county, page, limit = 1, placement }: AdSlotProps) {
  const resolvedAds = useMemo(
    () => resolveAdsForSlot({ slot, route, county, page, limit }),
    [county, limit, page, route, slot],
  );

  if (!resolvedAds.length) return null;

  return (
    <aside className={`sponsor-slot sponsor-slot-${slot}`} aria-label="Sponsored message">
      {resolvedAds.map((ad) => (
        <AdCard ad={ad} county={county} key={ad.id} page={page} placement={placement || ad.placement} slot={slot} />
      ))}
    </aside>
  );
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
