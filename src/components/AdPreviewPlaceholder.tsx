import { ADVERTISER_PREVIEW_ENABLED } from "../config/advertiser-preview";
import { formatAdPrice, getAdPricing, type AdPricingKey } from "../data/ad-pricing";

type AdPreviewPlaceholderProps = {
  pricingKey: AdPricingKey;
  label?: string;
  compact?: boolean;
  className?: string;
};

export function AdPreviewPlaceholder({ pricingKey, label, compact = false, className = "" }: AdPreviewPlaceholderProps) {
  const pricing = getAdPricing(pricingKey);
  const displayLabel = label || pricing.label;

  return (
    <div
      className={`ad-preview-placeholder${compact ? " ad-preview-placeholder-compact" : ""}${className ? ` ${className}` : ""}`}
      aria-label={`${displayLabel}: ${formatAdPrice(pricing.monthly)} per month, ${formatAdPrice(pricing.yearly)} per year`}
    >
      <span className="ad-preview-spot">{displayLabel}</span>
      <span className="ad-preview-tier">{pricing.tier}</span>
      <span className="ad-preview-monthly">{formatAdPrice(pricing.monthly)}/mo</span>
      <span className="ad-preview-yearly">{formatAdPrice(pricing.yearly)}/yr</span>
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
