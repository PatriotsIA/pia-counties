import {
  tierHasStripeCheckout,
  type PartnerSubscriptionTier,
} from "../data/ad-pricing";

export function advertiserCheckoutUrl(
  tier: PartnerSubscriptionTier,
  billing: string,
  email: string,
) {
  if (!tierHasStripeCheckout(tier)) return undefined;
  const link =
    billing === "annual" ? tier.stripeYearlyUrl : tier.stripeMonthlyUrl;
  if (!link) return undefined;
  const url = new URL(link);
  url.searchParams.set("prefilled_email", email.trim());
  return url.toString();
}
