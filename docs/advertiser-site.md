# PIA advertising site

The `advertiser-preview` branch is the standalone React advertising application at **https://advertise.patriotsinaction.com/**. The `main` branch continues to serve the civic site. Do not merge this branch's standalone `App.tsx` into main.

The page uses The County Post's pricing model, with PIA branding and placements:

- County color cards use nine Census population bands: $25, $75, $150, $250, $400, $550, $750, $1,000, or $1,250 monthly. County section sponsorship is twice that rate.
- Up to 25 counties share one checkout. The highest-priced county is full rate; each additional county costs half its own band rate, preserving cents.
- State ad coverage costs $10 per county per month. State section sponsorship costs $20 per county per selected section per month. Several states can be combined.
- Annual subscriptions charge ten times the monthly total for twelve months of coverage. National campaigns request a custom quote.

The active rate card lives in `src/data/campaign-pricing.ts`; the form is `src/components/CampaignBuilder.tsx`. The old `ad-pricing.ts` still supports inactive legacy components and creative specifications, but does not determine current prices or checkout. Do not reintroduce its fixed Payment Links.

`VITE_ADVERTISING_API_URL=https://d2vo13idhuovzg.cloudfront.net` is dedicated to population lookups and advertising checkout. It does not enable County Post news feeds. The shared backend computes the amount independently from trusted population data, validates coverage, creates a PIA-branded Stripe subscription checkout, and returns to this advertising domain. Release the backend's PIA brand/CORS support before the frontend. Existing County Post clients remain compatible.

The form sends contact details, all coverage and county FIPS/population, placement, billing, exact price, selected sections, referral, campaign notes and checkout session reference through EmailJS service `service_o3lsjkm`, template `template_pia_advertise`. Dashboard **To Email** is fixed to `erik@patriotsinaction.com`, **Cc** to `dan@patriotsinaction.com`, and **Reply-To** to `{{reply_to}}`. The legacy `to_email` parameter remains Erik. Preserve all existing EmailJS branch environment values. Public contact/artwork links remain Dan.

The form creates the unpaid checkout session, verifies its amount/currency/cadence, then sends the campaign email. It navigates to Stripe only after EmailJS acknowledges delivery acceptance. An email failure preserves details and reuses the same session on an unchanged retry; changing the checkout selections creates a new session. Invalid price responses stop the flow. National requests send only email. Consent and a honeypot remain. These checks do not confirm payment or inbox delivery. No server-side campaign record is created by this application.

Artwork previews accept decodable PNG, JPG, or WebP files up to 5 MiB, stay in browser memory, and are never included in the form request. Final PNG artwork goes to the advertising contact by email: 250×250 squares and 980×300 banners. The page tells users explicitly that previewing does not submit artwork. The hero preview is level. The original user-supplied full Potter County screenshot is stored unmodified at `public/examples/potter-county-site.png`, displayed uncropped with lazy loading and a full-size link.

`/payments`, `/advertise`, and `/contact` resolve to `/#campaign`; other old civic routes resolve to the landing page. Terms/privacy links use the main site's existing statements. Metadata, robots, sitemap, and llms.txt use the new advertising domain. The build no longer generates civic sitemaps or exposes unused API development middleware.

## Hosting

Use AWS profile `pia`, account `426771918029`, Amplify app `d1c230b674qax4`, region `us-west-1`, branch `advertiser-preview`. The new domain association is `advertise.patriotsinaction.com`, empty subdomain prefix, mapped to this branch. Amplify automatically creates its Route 53 A alias and ACM validation CNAME in hosted zone `Z003299699G0A1DAOB97`. Preserve all unrelated DNS, app environment, branch mappings, and SPA rules.

Retain the old `advertiser-preview.patriotsinaction.com` association and certificate for `www.advertiser-preview.patriotsinaction.com`. Add this domain-only 301 before existing Amplify rewrite rules:

```json
{"source":"https://www.advertiser-preview.patriotsinaction.com","target":"https://advertise.patriotsinaction.com","status":"301"}
```

[Amplify domain redirect rules](https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html) append paths automatically; source rules combining a domain and path are unsupported. Keep the main site and its routing intact. Read the current rules immediately before applying this addition; do not replace them with a stale snapshot.

Push a tested commit to `advertiser-preview` and follow its Amplify job through `SUCCEED`. The checked-in build pins Node 22 and runs lint and build. GitHub Actions separately runs browser checks against isolated local Vite with fake EmailJS values; it never sends email or starts payments. Verify the public new host, static assets, metadata, `/payments` behavior, legacy redirect, and main-site health after release. Roll back application source to the previous branch revision while retaining the new domain if necessary; do not remove mail or main-site DNS.

## Validation

Use Node 22. `npm ci`, `npm run lint`, `npm run build`, and `npm test`. Playwright uses strict port 4186 and Chromium at `PLAYWRIGHT_CHROMIUM_EXECUTABLE` (default `/usr/bin/chromium` locally). Tests intercept every EmailJS send; they cover real form payloads, failure/retry, consent, county selection, tier/cadence consistency, in-flight edits, quote-only national plans, artwork decoding, carousel controls, legacy paths, and widths 360, 390, 768, 1440. Screenshots go to ignored `coverage/`.

Live smoke verification is read-only or intercepts EmailJS in the browser. No test emails, Stripe purchases, or campaign records are created. Email provider acceptance and inbox receipt are separate from browser/mock checks.

## September 24 pricing validation

Browser checks cover all nine population boundaries; monthly/annual county and statewide plans; half-price extra counties; multiple sponsored sections; empty, duplicate and removed coverage; pricing and email failures; unchanged-session retry; consent and in-flight editing; retained examples/artwork; and mobile/desktop layouts. Stripe and EmailJS are intercepted. Backend checks retain County Post compatibility and verify exact PIA Stripe amounts, branding, metadata and return URLs.

Use the backend's read-only `POST /v1/checkout/quotes` route to compare live authoritative totals without creating Stripe sessions or sending email. Automated checks must not send real verification emails or make purchases. The prior consolidated routing verification was confirmed received by both Erik and Dan.
