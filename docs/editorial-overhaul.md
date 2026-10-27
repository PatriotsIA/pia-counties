# PIA editorial design review

Local review branch: `design/pia-editorial-overhaul`. Production remains on its existing main release until the local design is reviewed.

The shared presentation now follows the Abbott and Paxton landing pages: navy, warm cream, red actions, gold rules, Georgia headings and restrained cards. The viewport defines the page width, with 20–80px responsive gutters; reading measures remain limited inside broad sections. The shared header, county tabs, footer, directories, forms, partner pages, issue polls and video sections use the same system. Navigation switches to a compact menu at 1200px, and smaller layouts stack without horizontal overflow. Existing routes, forms, API contracts, consent text, disclosures and candidate records are preserved.

`src/editorial.css` is intentionally loaded after the existing component styles. It centralizes this presentation change without replacing interactive layout code. The legacy stylesheet remains the structural fallback. No production infrastructure or API changes are required.

## Recover America artwork and placement

Editable originals and web images are in `public/partners/recover-america/`: `banner.svg` / `banner.webp` (980×250) and `square.svg` / `square.webp` (600×600). Regenerate with Node 22:

```
node scripts/campaigns/build-recover-america-ads.mjs
```

The artwork uses the existing official Recover America logo and Rick Scarborough photograph already sourced for the partner landing page. The photograph is cropped proportionally, not altered or generated. WebP sizes are about 24KB and 36KB. Text follows the existing PIA partner page's description of its mission and Protect Children pledge.

The square appears alongside the two existing candidate squares on the home page. The banner is appended after the original sponsor inventory and candidate banners in shared footer carousels. Existing inventory order, limits, lazy loading, impressions, click tracking, and carousel controls remain. Both formats link to `/recover-america?pia_ad=recover-america-{format}`; official partner links carry `utm_source=patriotsinaction`, `utm_medium=referral`, `utm_campaign=recover_america`, and destination-specific `utm_content` values.

## Local review

```
npm run dev -- --host 127.0.0.1 --port 4181 --strictPort
```

Open `http://127.0.0.1:4181/`. Review home, Counties, a county page, Candidates, Partners, Issues, Recover America, Contact, and both campaign pages. Review screenshots are in the ignored `coverage/editorial-overhaul/` directory. Automated browser checks use the existing local API fixture; no production submissions or votes are made.

The new browser checks cover desktop widths up to 2560px and mobile down to 320px, navigation, full-width layouts, Recover America artwork aspect ratios and tracked destinations. The existing regression suite covers original ads, searches, candidate intake/review/publication, private change requests, calendars, and disclosure links.

The County Post promotion now declares its image's intrinsic dimensions, preserving its layout before lazy loading. This also addresses the existing collapsed-logo browser assertion; it does not add news fetching.

## Local review refinement

Removed the decorative patriot figure from both home and county heroes at the user's request. County search now uses a red panel and red input with white text. Navy community/video headers, blue/rose/gold card surfaces, red county tabs and blue/gold county sections add restrained color throughout the shared interface. Search results retain high-contrast white surfaces.

## Verification — October 27, 2026

- Unit suite: 38 passed.
- Full browser regression suite: 65 passed after the overhaul and collapsed-image fix.
- After the requested color refinement and hero-figure removal: all 12 focused responsive layout, search, ad tracking/artwork and partner-carousel checks passed.
- Final production build and lint passed. The existing large-JavaScript-chunk advisory remains.
- Local Chromium review covered home, county, directory, candidates, contact, Recover America, Issues, privacy, candidate intake, calendar and TV layouts. Home/county screenshots at 1440px and 390px are in `coverage/editorial-overhaul/color-*.png`. Automated layout checks cover 2560, 1440, 1024, 390 and 320px.
- The existing TradingView ticker emits a development-mode third-party embed error during React StrictMode replay; its data still rendered during local review. Ticker integration code is unchanged.

No application API, infrastructure, production submission, or deployment was changed during this review.
