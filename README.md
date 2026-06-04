# Patriots in Action Counties (`pia-counties`)

Nationwide React + Vite application that powers **Patriots in Action** county civic hubs: local weather, news feeds, elections, events, partners, PIA TV, and a sponsorship/ad system with a partner payments page.

Production site: [patriotsinaction.com](https://patriotsinaction.com)

---

## Quick start

Requires **Node 22** (see `.nvmrc`).

```bash
npm install
npm run dev
```

Open the dev server URL (typically `http://localhost:5173`).

```bash
npm run lint
npm run build
npm run preview
```

---

## Routes

| Path | Description |
| --- | --- |
| `/` | National homepage |
| `/counties` | State directory |
| `/payments` | Partner tiers, Stripe subscription table, pricing reference |
| `/partners` | Nationwide and county partners |
| `/tv` | PIA TV (Vimeo proxy) |
| `/contact` | Site contact |
| `/rewards` | Patriot Rewards entry |
| `/:state/:county` | County home |
| `/:state/:county/about` | County about |
| `/:state/:county/elections` | Elections |
| `/:state/:county/news` | Newsroom + feeds |
| `/:state/:county/events` | Community calendar |
| `/:state/:county/tv` | County TV |
| `/:state/:county/partners` | County partners |
| `/:state/:county/contact` | County contact |
| `/:state/:county/submit-event` | Event submission |

State and county slugs use lowercase paths (for example `/tx/potter`).

---

## Project structure

```
src/
  App.tsx                 # Routes, pages, shell layout
  data/
    ads.ts                # Ad creatives and slot targeting
    ad-pricing.ts         # Tiers, placement prices, Stripe subscription tiers
    counties.ts           # County sites from @nickgraffis/us-counties + overrides
    site.ts               # Global links and brand
  components/
    AdSlot.tsx            # Sponsor carousels, banners, inline ads
    AdPreviewPlaceholder.tsx
    PaymentsSubscriptionTable.tsx
    PaymentsPricingContent.tsx
  config/
    advertiser-preview.ts # Toggle pricing preview on live pages
  lib/                    # ads resolver, analytics, RSS, calendar, email
api/                      # Vercel-style serverless proxies (calendar, Vimeo, RSS)
scripts/generate-seo.ts   # Sitemap/SEO generation at build time
NewAds/                   # Sponsor image assets
AD_SYSTEM_PLAN.md         # Canonical ad/pricing/placement documentation
```

---

## County data

County pages are generated from `@nickgraffis/us-counties` in `src/data/counties.ts`. Customize a county via `countyOverrides` using keys like `texas/potter` (state slug + county slug).

Overrides can set feeds, calendar ICS URLs, hero copy, partner lists, weather sponsor names, and more.

---

## Sponsorship and ads

See **[AD_SYSTEM_PLAN.md](./AD_SYSTEM_PLAN.md)** for the full placement inventory, pricing tiers, creative sizes, preview mode, and sales rules.

### Summary

| Creative | Size |
| --- | --- |
| Square carousel / news strip | 250×250 PNG |
| Bottom banner carousel | 980×300 PNG |

Send artwork to **erik@patriotsinaction.com** (white or transparent background).

### Advertiser preview mode

`src/config/advertiser-preview.ts`:

```ts
export const ADVERTISER_PREVIEW_ENABLED = true; // set false for production
```

When enabled, live ad slots show pricing placeholders instead of paid creatives.

### Payments / Stripe

`/payments` includes a **subscription table** with monthly and yearly buttons per tier. URLs are configured in `partnerSubscriptionTiers` inside `src/data/ad-pricing.ts`. Until live Payment Links exist, buttons open `https://stripe.com` in a new tab.

Replace `stripeMonthlyUrl` and `stripeYearlyUrl` on each tier when Stripe checkout is ready.

---

## Environment variables

### EmailJS (contact / event forms)

| Variable | Purpose |
| --- | --- |
| `VITE_EMAILJS_SERVICE_ID` | EmailJS service |
| `VITE_EMAILJS_TEMPLATE_ID` | EmailJS template |
| `VITE_EMAILJS_PUBLIC_KEY` | EmailJS public key |

Template fields include `title`, `name`, `email`, `county_name`, `county_slug`, `state_name`, `message`, `page_url`, `submitted_at`, and others.

### Analytics

Google Tag Manager container `GTM-KDNSLKZ7` in production. SPA page views and sponsor click/impression events push to `dataLayer`.

| Variable | Purpose |
| --- | --- |
| `VITE_GTM_ID` | Override GTM container |
| `VITE_GTM_ENABLE_LOCAL` | Enable GTM in local dev (`true`) |

### RSS (county news widgets)

Feeds load in the browser via RSS2JSON with AllOrigins fallback.

| Variable | Purpose |
| --- | --- |
| `VITE_RSS_PROVIDER_URL` | RSS2JSON-compatible endpoint |
| `VITE_RSS2JSON_API_KEY` | RSS2JSON API key |
| `VITE_RSS_RAW_PROXY_URL` | Raw RSS proxy fallback |
| `VITE_RSS_CACHE_TTL_MINUTES` | Browser cache TTL (default 60) |

### API proxies

`api/calendar.ts` and `api/vimeo-showcase.ts` are Vercel-style functions. Plain static hosting (e.g. Amplify without API routes) returns 404 for `/api/*` unless you point the app at a backend:

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | External API origin for calendar/Vimeo |
| `PIA_VIMEO_ACCESS_TOKEN` or `VIMEO_ACCESS_TOKEN` | Vimeo proxy token on the server |

When `VITE_API_BASE_URL` is empty, the app uses same-origin `/api/...` (local dev / Vercel).

---

## Deployment

Build runs SEO generation then TypeScript + Vite:

```bash
npm run build
```

Output is in `dist/`. Ensure API routes or `VITE_API_BASE_URL` match your host.

Before production:

1. Set `ADVERTISER_PREVIEW_ENABLED` to `false`.
2. Configure Stripe Payment Links in `ad-pricing.ts`.
3. Register live ad creatives in `ads.ts` with correct `countyKeys` / `slots`.

---

## Documentation

| Document | Contents |
| --- | --- |
| [AD_SYSTEM_PLAN.md](./AD_SYSTEM_PLAN.md) | Ad spots, pricing, placements, preview mode, Stripe wiring |
| [AD_PRICING_AND_SPONSORSHIP_PLAN.md](./AD_PRICING_AND_SPONSORSHIP_PLAN.md) | Older strategy notes (PDF-aligned); prefer AD_SYSTEM_PLAN.md |

---

## License

Private project — Patriots in Action.
