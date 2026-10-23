# Recover America partner landing page

Public route: https://patriotsinaction.com/recover-america

The page introduces Recover America, describes the PIA partnership, summarizes
the Protect Children pledge, explains the official sign-up form, and links to
Recover America's donation, event, and contact pages. The partner directory
links to the landing page. The route has its own title, description, canonical
URL, sitemap entry, and llms.txt entry.

The user confirmed the partnership and requested this exact PIA URL. Partnership
copy describes connecting PIA's civic network to Recover America's resources;
it does not assert financial arrangements, joint programs, dates, or outcomes.

## Sources checked October 23, 2026

- Mission and goals: https://recoveramerica.com/about
- Founder and organization: https://recoveramerica.com/ and https://recoveramerica.com/leadership
- Pledge and actual sign-up fields: https://recoveramerica.com/protectchildren
- Giving options: https://recoveramerica.com/donate
- Other participation: https://recoveramerica.com/events and https://recoveramerica.com/contact

The pledge page was verified in Chromium after its browser challenge completed.
The form labels require Texas county, first name, and last name; title and email
fields are also available. Readers are directed to review the full official text
before signing. No pledge records or donations are collected on this page.
Outbound Recover America links open a new tab with noopener/noreferrer.

## Official image provenance

The logo and founder portrait come from Recover America's own homepage:

- Logo: https://horizons-cdn.hostinger.com/ca260def-965c-4888-8531-016fd17f065b/0a5185da17701b2fc99379bd6b4139cf.png
- Portrait: https://horizons-cdn.hostinger.com/ca260def-965c-4888-8531-016fd17f065b/high-resolution-image-with-no-words-dr.-rs-scarborough-ztOoZ.png

Self-hosted WebP assets total 41,230 bytes: lossless 916×100 logo and an 800×1064
portrait. Explicit image dimensions reserve space; the hero portrait has high
fetch priority. No remote image hotlinks or new dependencies are needed.

## Validation

- Node 22: 38 unit tests pass; ESLint, TypeScript, and production build pass.
- Browser review at 1440, 768, 390, and 320 pixels: images render, no horizontal
  overflow, one H1, correct title/canonical, section anchors, new-tab pledge
  navigation, partner directory link, and sitemap entry verified.
- Browser evidence is under ignored `coverage/recover-america/`. No sign-up or
  donation was submitted. External popup navigation was intercepted in checks.
- Full existing browser suite initially passed 47 of 49 tests. The County Post
  promotional-image visibility test also fails on unmodified main `953ef86`.
  The desktop Parallel partners carousel check passed on both the baseline
  and an isolated rerun of this change. Neither county component is changed
  by this page.
- Development Chromium occasionally reports an existing TradingView embed
  exception from `s3.tradingview.com`; page checks record that separately from
  application errors. No landing-page application errors were found.

## Delivery

Use the existing main-branch GitHub → Amplify pipeline: app `d1c230b674qax4`,
branch `main`, region `us-west-1`, AWS profile `pia`. No backend, environment,
DNS, payment processing, or email-routing changes are required.
