# Patriots in Action — Ad System, Pricing, and Placement Plan

This document is the canonical reference for how sponsorship inventory, pricing, creative specs, preview mode, and payments work in the `pia-counties` codebase. It aligns with the published sales brochure and the internal sponsorship strategy PDF.

## Goals

- Sell **community sponsorship**, not generic banner ads.
- Map brochure tiers to **real website placements** so sales reps can explain deliverables.
- Keep **county-specific** sponsors on their counties and **national** sponsors on homepage/network surfaces.
- Support **advertiser preview mode** for demos and the `/payments` sales page.
- Route subscriptions through **Stripe Payment Links** (placeholder URLs until configured).

---

## Pricing tiers (published)

| Tier | Monthly | Annual | Primary deliverable |
| --- | ---: | ---: | --- |
| Patriot Preferred Business Program | $95 | $950 | Directory listing + Patriot Rewards |
| Gold Business Partner | $295 | $2,950 | County content sponsorship + carousel |
| Platinum Business Partner | $495 | $4,950 | Priority placements + county bottom banners |
| County Sponsor — Presented By | $995 | $9,950 | County Hero Presented by |
| National Level — Presented By | Quote | Quote | Homepage hero, carousel, bottom banners |

### County founding packages (bundled discount)

| Package | Monthly | Annual | Notes |
| --- | ---: | ---: | --- |
| County Patriot Preferred | $95 | $950 | Same as brochure Preferred |
| County Gold Partner | $95 | $950 | Founding county rate |
| County Platinum Partner | $495 | $4,950 | Founding county rate with banners + hero eligibility |

Annual prepay uses brochure annual rates (roughly two months free vs paying monthly).

---

## Creative specifications

| Format | Size | Use |
| --- | --- | --- |
| Square | **250×250 px** | Homepage carousel, county carousel, newsroom strip, calendar inline |
| Wide banner | **980×300 px** | Bottom banner carousel (homepage + county + top-level pages) |

**Delivery:** Email finished PNG files to **erik@patriotsinaction.com** with a **white or transparent** background.

**Behavior:** All live sponsor units are **clickable ads that open in a new tab** (`target="_blank"`).

---

## Ad slot inventory (code)

Slots are defined in `src/data/ads.ts` as `AdSlotId`:

| Slot ID | Page / route | Format | Default pricing family |
| --- | --- | --- | --- |
| `county-home-inline` | County home (and homepage carousel when `route=home`) | 250×250 carousel | Gold ($295) / homepage uses National quote |
| `county-news-inline` | County news | 250×250 row (up to 5) | Gold |
| `county-calendar-inline` | County events / calendar areas | 250×250 | Gold |
| `county-page-footer` | County pages (footer) | 980×300 carousel | Platinum |
| `site-footer` | Top-level pages (not county route) | 980×300 carousel | National (quote) |

### Presented-by labels (not carousel slots)

These use `AdPricingKey` values in `src/data/ad-pricing.ts` and preview via `PresentedByPreview`:

| Key | Location | Tier |
| --- | --- | --- |
| `weather-sponsor` | Top weather bar | Gold+ |
| `county-hero-sponsor` | County hero | County Sponsor ($995) |
| `national-hero-sponsor` | Homepage hero | National (quote) |
| `feed-articles` | Local Articles widget | Gold |
| `feed-obituaries` | Obituaries widget | Gold |
| `feed-video` | County News Videos | Gold |
| `feed-sports` | Local Sports | Gold |
| `feed-pia-video` | PIA Video Feed | Gold |
| `calendar-presented-by` | Community Calendar | Gold |
| `partner-directory` | Partner cards | Patriot Preferred |

---

## Placement map by page type

### National / homepage (`/`)

| Element | Format | Tier | Preview |
| --- | --- | --- | --- |
| Homepage hero Presented by | Logo + link | National — quote | `national-hero-sponsor` |
| Sponsor carousel below “From Awareness to Action” | 250×250 | National — quote | `homepage-sponsor-carousel` via `county-home-inline` |
| Bottom banner carousel | 980×300 | National — quote | `site-footer` |

### County pages (`/:state/:county/...`)

| Element | Format | Tier |
| --- | --- | --- |
| County hero Presented by | Logo + link | County Sponsor or assigned partner |
| County sponsor carousel | 250×250 | Gold / Platinum |
| Feed Presented by labels | Text + link | Gold / Platinum |
| Newsroom ad strip | 250×250 × 5 | Gold / Platinum |
| Calendar inline sponsors | 250×250 | Gold |
| Footer banner carousel | 980×300 | Platinum |

### Top-level pages (`/partners`, `/tv`, `/contact`, etc.)

| Element | Format | Tier |
| --- | --- | --- |
| Bottom banner carousel | 980×300 | National (quote) when preview enabled |

### Suppressed / disabled

| Element | Status |
| --- | --- |
| Desktop left/right rails | Removed from product |
| Candidate profile pages | Ads suppressed |
| State candidate listing | Ads suppressed |
| Top market ticker | Editorial only (not sold) |

---

## Ad serving architecture

```
src/data/ads.ts          → Ad creatives, targeting (slots, counties, routes, pages)
src/data/ad-pricing.ts   → Tier prices, placement labels, subscription tiers
src/lib/ads.ts           → resolveAdsForSlot() filtering + priority
src/components/AdSlot.tsx → Renders carousel, banners, or inline cards
src/config/advertiser-preview.ts → ADVERTISER_PREVIEW_ENABLED toggle
```

### Targeting rules

Each `AdCreative` includes `targeting`:

- `slots`: which `AdSlotId` values may show the ad
- `countyKeys`: optional `state/county` keys
- `stateSlugs`, `pages`, `routes`: further scope

County sponsors should only target their county keys. Nationwide house ads can target broad routes.

### Preview mode

When `ADVERTISER_PREVIEW_ENABLED` is `true` in `src/config/advertiser-preview.ts`:

- Live slots render **pricing placeholders** instead of real creatives.
- Square previews are **250×250**; banners use **980×300** carousel shell (one slide visible, arrows when multiple).
- `/payments` shows full pricing reference content.

**Turn off before production** unless intentionally demoing sales inventory.

---

## Payments page (`/payments`)

1. **Intro** — Asset delivery instructions + Stripe legal copy.
2. **Subscription table** (`PaymentsSubscriptionTable`) — One row per tier with perks, placements, monthly/yearly Stripe buttons (placeholder → `https://stripe.com`).
3. **Reference sections** (`PaymentsPricingContent`) — Asset specs, brochure tiers, national inventory, county packages, placement grid, guides, discounts.

### Wiring Stripe Payment Links

Edit `partnerSubscriptionTiers` in `src/data/ad-pricing.ts` and set `stripeMonthlyUrl` / `stripeYearlyUrl` per tier to live Stripe Payment Link URLs.

---

## Discounts and add-ons

| Rule | Detail |
| --- | --- |
| Annual prepay | Brochure annual rates |
| Adjacent counties | 50% of base tier per **additional** adjacent county only—billed as separate Stripe add-on products (see payments page table). Never discount the base county with a sitewide coupon. |
| Multi-placement bundle | 10% off 3+ elements in one county |
| Category exclusivity | +25% to +50% premium |
| Founding sponsor cap | 3–5 per county |
| Extra feed | +$50/mo Gold / +$100/mo Platinum |
| Reporting | +$25–$100/mo when available |
| Creative production | One-time fee if PIA designs art |

---

## Sales positioning

**Use:** founding county sponsor, Presented by, Patriot Partner, support your county civic hub.

**Avoid:** “buy a banner ad.”

**National buyers:** email for quote on homepage hero, carousel, and bottom banners.

**County buyers:** start with County Gold founding ($95/$950) or step up to Platinum / County Sponsor hero.

---

## Implementation checklist

- [ ] Set `ADVERTISER_PREVIEW_ENABLED = false` for production
- [ ] Replace `stripeCheckoutPlaceholderUrl` with real Payment Links per tier
- [ ] Upload sponsor PNGs to `NewAds/` and register in `src/data/ads.ts`
- [ ] Assign `countyKeys` on county-specific campaigns
- [ ] Confirm hero partner in county data (`presentsCountyPages`) for live county hero
- [ ] Review GTM sponsor click/impression events after launch

---

## Related files

| File | Purpose |
| --- | --- |
| `src/data/ad-pricing.ts` | Prices, tiers, subscriptions, helpers |
| `src/data/ads.ts` | Creatives and slot targeting |
| `src/components/PaymentsSubscriptionTable.tsx` | Checkout table |
| `src/components/PaymentsPricingContent.tsx` | Pricing reference |
| `src/components/AdSlot.tsx` | Slot rendering |
| `src/components/AdPreviewPlaceholder.tsx` | Preview UI |

Legacy reference: `AD_PRICING_AND_SPONSORSHIP_PLAN.md` (older duplicate sections may exist; prefer this document).
