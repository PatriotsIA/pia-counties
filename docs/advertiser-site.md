# PIA advertising site

The `advertiser-preview` branch is the standalone React advertising application at **https://advertise.patriotsinaction.com/**. The `main` branch continues to serve the civic site. Do not merge this branch's standalone `App.tsx` into main.

The page includes monthly/annual plan cards, a county/national campaign inquiry form, founding packages, adjacent-county information, interactive placement examples, optional local artwork previews, creative specifications, and FAQs. Rates and existing Stripe Payment Links remain sourced from `src/data/ad-pricing.ts`. Standard county rates are $95, $295, $495, and $995 monthly, or ten monthly payments annually. Founding availability and all extra counties are confirmed by the advertising team. No County Post pricing or backend checkout contract is reused.

The form sends contact details, coverage including county FIPS, selected plan, billing preference, referral, and campaign notes through EmailJS service `service_o3lsjkm` and dedicated template `template_pia_advertise`. The dashboard fixes **To Email** to `erik@patriotsinaction.com` and **Cc** to `dan@patriotsinaction.com`; **Reply-To** is `{{reply_to}}`. The legacy `to_email` parameter remains Erik, but the fixed dashboard recipients control delivery. The service, template, and public key must belong to the same consolidated account. Consent and a honeypot are included. Delivery failure preserves the form and displays a retry/email fallback. A success message appears only after EmailJS acknowledges the request. Public contact and artwork links show `dan@patriotsinaction.com`, independently of the submission recipients. Standard Preferred, Gold, Platinum, and founding Gold automatically navigate in the same tab to their matching monthly/annual Stripe Payment Link after EmailJS accepts the request, with the contact email prefilled. A fallback link uses the captured submitted checkout URL. Sending failure prevents checkout and preserves the entered details. The submit button displays the selected base price; national requests hide the billing and county fields. Quote-only plans never offer unrelated checkout links. Add-ons are not included in those base subscriptions. This application does not create a server-side campaign record or confirm payment.

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

## September 21 contact and checkout update

All eight public Stripe links were opened read-only and their product names, amounts, and recurrence matched the configured Preferred, Gold, Platinum, and Founding Gold plans. No payment was made. The 19-test browser suite exercises automatic navigation for all eight combinations, fixed Erik recipient versus visible Dan links, retry after failed email, quote-only flows, disabled in-flight editing, full screenshot dimensions, level preview, and responsive layouts. Local lint and production build pass.

Automated tests intercept EmailJS. A real verification email requires explicit authorization, and provider acceptance must not be described as confirmed inbox receipt without mailbox evidence.
