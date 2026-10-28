# PIA candidate support pages

Published pages: `/greg-abbott`, `/ken-paxton` and the `/paxton` excerpt page.
Campaign payer statements are attributed separately and link directly to the
campaigns' disclosure text. These are support landing pages, not candidate-submitted
or PIA interview profiles.

## Supporter and payer

On October 28, 2026 the owner replaced the earlier "Patriots in Action supports"
and "Unpaid support message created by Patriots in Action" wording. Each candidate
now names its own supporter and payer (`supporter` and `payer` in
`src/data/campaigns.ts`), and every placement adds the same not-authorized line:

| Candidate | Supporter line | Payer line |
| --- | --- | --- |
| Greg Abbott | Patriots for Action supports | Paid for by PatriotsForAction.org. |
| Ken Paxton | GOP Connect supports | Paid for by GOP Connect LLC. |

Both: "Not authorized by any candidate or candidate’s campaign or committees."

The wording appears in the four ad creatives and their alt text, the landing-page
hero, disclosure section and footer, the `/paxton` page, the page titles, and the
pinned `/candidates` cards. The County Post runs byte-identical copies of the four
WebP files in its `ad-assets/`; refresh them whenever the artwork is rebuilt here.

## Placement and attribution

- Both candidates are pinned, Abbott first, above the national `/candidates`
  directory. The cards honor its search, state and office filters. Counts refer
  to directory profiles; no public API records or private submissions are changed.
- Square ads appear on the PIA homepage. The candidate banners are appended to
  the existing sponsor banner carousels, including the homepage, after the original
  banners without reducing their limit or changing their order. Both formats link
  to the landing pages. The attribution appears within the creative, without an
  extra attribution sentence above the ads.
- Both pages use the shared PIA header and desktop/mobile navigation. No candidate
  links were added to that menu. Campaign-page external header links also carry UTMs.
- Placements are public and uniform; no visitor demographic or geographic ad targeting.
- Internal ad URLs use `pia_ad=<candidate>-<format>` so attribution does not reset
  the visitor's analytics acquisition. Existing `ad_click` and `ad_impression`
  events identify each creative and the placement.
- Every external content link on each standalone landing page uses
  `utm_source=patriotsinaction`, `utm_medium=referral`,
  `utm_campaign=vote_<candidate>_2026`, and a placement-specific `utm_content`.
  Existing destination query parameters and fragment anchors are preserved.
  `campaign_outbound_click` events also reach the existing dataLayer.

## Official sources reviewed October 26, 2026

Greg Abbott:
- https://www.gregabbott.com/about-texas-governor-greg-abbott/ — official portrait,
  short biography quotation, background and embedded biography video.
- https://www.gregabbott.com/policy/ — slogan and summarized priorities.
- https://www.gregabbott.com/ — campaign event video links.
- https://www.gregabbott.com/new-ad-protect-texans-vote-greg-abbott/ — current
  campaign ad and visible payer statement (`#footer-info`).
- https://www.gregabbott.com/privacy-policy/ — campaign privacy and terms.

Ken Paxton:
- https://www.kenpaxton.com/ — campaign photo, slogan, Senate office,
  disclosure (`#1688150339`), and official YouTube channel link.
- https://www.kenpaxton.com/about — short biography quotation and background.
- https://www.kenpaxton.com/issues — summarized platform.
- https://www.kenpaxton.com/privacy — campaign privacy and terms.
- https://www.youtube.com/user/KenPaxtonTX — campaign-linked channel, titled
  “Ken Paxton for Senate”; selected current interviews and rally remarks.

Photo originals:
- Abbott: https://www.gregabbott.com/wp-content/uploads/2026/10/1-824x1024.jpg
- Paxton: https://irp.cdn-website.com/de07f618/dms3rep/multi/opt/SRG+Smartsite_1920x1080+%28Web+Hero%29-849ca996-1920w.jpg

Portraits are optimized WebP conversions of official campaign photos. CSS/SVG
framing preserves the actual photo. No synthetic likenesses or retouching.
Campaign biographies are linked with short attributed excerpts; priorities are
summaries rather than full reproductions. Source links are visible beside photos,
biographies, platform summaries, videos and disclosures.

## Videos

The four selected videos on each page load YouTube's privacy-enhanced player only
after a visitor presses Play. Local optimized thumbnails avoid loading the player
on initial page view. Each card also has a tracked YouTube watch link and source.
The campaign media/archive link provides access to additional material.

Verified YouTube player responses reported `OK` and `playableInEmbed=true` for:
- Abbott: CTrxQ9A6KjE, 8-QicBM2Sgo, G227zi40DOg, 9szd5w0eXgc.
- Paxton: U5M2JTK5Jys, rvyc5K1Kbv4, bjz7cYuBWho, 9RUJdj83quk.

The removed Hutto stream NI7ZMFH0_5M was excluded in favor of the working
G227zi40DOg upload, which is also linked from the campaign's homepage. Video
availability remains controlled by YouTube and the uploader.

## Creative files and maintenance

Each `public/campaigns/<candidate>/` directory contains a 600×600 square and
980×250 banner in WebP plus editable SVG originals. Mobile banner placements
use the square version for legibility. All four include the supporter and payer above.

```sh
node --import tsx scripts/campaigns/build-ads.ts
node scripts/campaigns/render-ads.mjs
```

The second command requires Playwright/Chromium and ImageMagick. Metadata, links,
source URLs, media selections and pin order live in `src/data/campaigns.ts`;
ad catalog records are in `src/data/campaign-ads.ts`. Review campaign status,
media availability, and the active support placements after the 2026 election.

Browser tests cover disclosure/UTM preservation, outbound analytics, user-initiated
video loading, local images at four viewport widths, filtering/pin order, ad
destinations, and absence of navigation links. Player availability is a separate
live check; browser tests mock the third-party player for determinism.

## Release validation

October 26: production build, lint, and all 38 unit tests passed. All seven campaign
browser tests passed, including shared desktop/mobile navigation and the original
banner inventory alongside both candidate banners. The full regression run passed 55 of 56 existing
browser tests; the previously observed County Post promotion-logo visibility
assertion in `integration.spec.ts:159` still fails. Existing sponsor carousel
controls, candidate intake/review, directory filters, and opinion polls passed.
Both live campaign disclosure anchors returned HTTP 200 and the expected text.
