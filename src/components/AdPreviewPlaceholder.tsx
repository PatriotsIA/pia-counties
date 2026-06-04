import { ADVERTISER_PREVIEW_ENABLED } from "../config/advertiser-preview";
import { formatAdPrice, formatPlacementPricing, getAdPricing, nationwidePricingLabel, type AdPricingKey } from "../data/ad-pricing";
import { adClickHint } from "../data/ads";

type AdPreviewPlaceholderProps = {
  pricingKey: AdPricingKey;
  label?: string;
  compact?: boolean;
  banner?: boolean;
  className?: string;
};

export function AdPreviewPlaceholder({
  pricingKey,
  label,
  compact = false,
  banner = false,
  className = "",
}: AdPreviewPlaceholderProps) {
  const pricing = getAdPricing(pricingKey);
  const displayLabel = label || pricing.label;
  const priceSummary = formatPlacementPricing(pricing);

  return (
    <div
      className={`ad-preview-placeholder${compact ? " ad-preview-placeholder-compact" : ""}${banner ? " ad-preview-placeholder-banner" : ""}${pricing.quoteOnly ? " ad-preview-placeholder-quote" : ""}${className ? ` ${className}` : ""}`}
      aria-label={`${displayLabel}: ${priceSummary}. ${adClickHint}`}
    >
      <span className="ad-preview-spot">{displayLabel}</span>
      <span className="ad-click-hint">{adClickHint}</span>
      <span className="ad-preview-tier">{pricing.tier}</span>
      {pricing.quoteOnly ? (
        <span className="ad-preview-quote">{pricing.quoteLabel || nationwidePricingLabel}</span>
      ) : (
        <>
          <span className="ad-preview-monthly">{formatAdPrice(pricing.monthly)}/mo</span>
          <span className="ad-preview-yearly">{formatAdPrice(pricing.yearly)}/yr</span>
        </>
      )}
    </div>
  );
}

export function PresentedByPreview({ pricingKey, className = "" }: { pricingKey: AdPricingKey; className?: string }) {
  return (
    <div className={`presented-by-preview${className ? ` ${className}` : ""}`}>
      <span className="presented-by-preview-label">Presented by</span>
      <AdPreviewPlaceholder pricingKey={pricingKey} compact />
    </div>
  );
}

export function isAdvertiserPreviewMode() {
  return ADVERTISER_PREVIEW_ENABLED;
}
