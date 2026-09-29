import type { BillingCadence, CountyPlacement, StatePlacement, SponsorableFeed } from "../data/campaign-pricing";

export type CountyPopulation = { population: number; estimateVintage: number; fips: string; countySlug: string; stateSlug: string };
type Contact = { customerEmail: string; businessName: string; billing: BillingCadence; referredBy?: string; creativeAssetKey?: string; bannerCreativeAssetKey?: string };
export type CampaignCheckout = Contact & (
  | { scope: "county"; placement: CountyPlacement; counties: { stateSlug: string; countySlug: string }[] }
  | { scope: "state"; placement: StatePlacement; states: string[]; feeds?: SponsorableFeed[] }
);
export type CheckoutSession = { url: string; sessionId: string; amountCents: number; billing: BillingCadence; currency: string };

export async function fetchCountyPopulation(stateSlug: string, countySlug: string) {
  const result = await request<CountyPopulation>(`v1/counties/${stateSlug}/${countySlug}/population`);
  if (!Number.isSafeInteger(result.population) || result.population < 0 || !result.estimateVintage) {
    throw new Error("Population pricing is unavailable for this county. Please try again.");
  }
  return result;
}

/** Sends artwork straight to the private creative bucket through a short-lived presigned POST. */
export async function uploadArtwork(file: File) {
  const { assetKey, upload } = await request<{ assetKey: string; upload: { url: string; fields: Record<string, string> } }>("v1/advertising/creatives/upload", {
    method: "POST", body: JSON.stringify({ fileName: file.name, contentType: file.type, size: file.size }),
  });
  const form = new FormData();
  Object.entries(upload.fields).forEach(([name, value]) => form.append(name, value));
  form.append("file", file);
  const response = await fetch(upload.url, { method: "POST", body: form, signal: AbortSignal.timeout(60000) }).catch(() => undefined);
  if (!response?.ok) throw new Error("Your artwork could not be uploaded. Please try again, or remove it and send it to us later.");
  return assetKey;
}

export async function startCampaignCheckout(input: CampaignCheckout) {
  const result = await request<CheckoutSession>("v1/checkout/sessions", {
    method: "POST", body: JSON.stringify({ ...input, brand: "patriots-in-action" }),
  });
  const url = new URL(result.url);
  if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error("Secure checkout returned an invalid destination.");
  return result;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = import.meta.env.VITE_ADVERTISING_API_URL;
  if (!base) throw new Error("Online checkout is temporarily unavailable. Please contact our advertising team.");
  const response = await fetch(new URL(path, `${base.replace(/\/+$/, "")}/`), {
    ...init, signal: AbortSignal.timeout(30000),
    headers: { accept: "application/json", ...(init?.body ? { "content-type": "application/json" } : {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Unable to prepare your campaign. Please try again.");
  return body as T;
}
