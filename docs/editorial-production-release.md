# Editorial production release — October 30, 2026

The owner authorized the staging top-bar update and the full five-step release
sequence: reconcile production, verify ads/content, test, publish staging, then
promote the reviewed source through production `main`.

## Source and preservation

- Production baseline: `cfe994b64ccffa01c72fbefda4367d528a5dcb81`, Amplify main job 85.
- Redesign baseline: `32c6460cdc4eeea7a4b8f705e68fc6a0b9956d04`, editorial-staging job 12.
- Integration branch: `release/editorial-production-20261030`.
- Rollback tag: `production-before-editorial-20261030` at the production baseline.

The integration merges both histories. Conflicts in App, AdSlot, CampaignSupport,
and the generated image registry retain the reviewed staging versions: production
content was already synchronized, with differences confined to the redesign,
Recover America placements/tracking, and the PIA Events replacement artwork.

Route declarations match production. Of 96 baseline files across data, API
libraries, components, campaign media and forms, 90 are byte-identical. The six
reviewed differences are AdSlot, CampaignSupport, CountyPostNewsSection, ads,
the generated image registry, and Recover America outbound-link tracking.
Candidate/county records, candidate workflows, polls, Paxton video links/QRs,
publisher disclosures, and the neutral voter notice are retained.

All 26 unaffected literal ad IDs remain; five former Trailer Store placements
use their existing staging PIA Events replacements. Campaign and County Post
ad collections remain, with Recover America appended. Mattress advertising
remains removed. The report PDF SHA-256 remains
`bb997c05c5995107df495d381fb1c5519cfeb6c1da8ce96fa671467932dd8f29`.

The three top-bar actions now use red buttons with 14px white text, 44px minimum
height, and a visible keyboard-focus outline. Meet Your Neighbors uses the same
community URL as Join Our Community; campaign pages retain their UTM parameters
and new-tab behavior. Phone and email retain their tel/mailto destinations.

## Validation before staging

- Node 22 production build, lint, and 38 unit tests passed.
- Full browser suite: 67 passed, with two candidate tests initially finding a
  missing new-tab target on the newly linked community action. The target and
  rel attributes were corrected; both failed tests then passed on a focused
  rerun. All 69 regression scenarios passed across these runs.
- Local Chromium checks and screenshot review at 1440, 390 and 320px confirm
  the button styling, links, click targets, absence of horizontal overflow,
  and retained voter-report download on home and county pages. The existing
  responsive suite additionally covers 2560 and 1024px layouts.
- Read-only candidate catalog, Mighty health and all three issue polls returned
  HTTP 200 with valid CORS for production and staging origins. No live forms,
  candidate records or poll votes were submitted.
- The production build retains indexable robots settings. The existing large
  JavaScript bundle advisory remains; this is not a new release regression.

## Deployment and rollback

Publish this source first to `editorial-staging` in Amplify app `d1c230b674qax4`
(us-west-1), then verify its HTTPS pages, mobile/desktop buttons, PDF, deep links,
and noindex behavior while main remains on its baseline. Refetch main before
promotion; integrate and retest if it moved. Fast-forward `main` to the reviewed
source and follow its own Amplify build to success. Verify indexable public
pages, private operational-route noindex, assets, and unchanged environment
fingerprints, rewrites and domain mappings.

Keep `VITE_DEPLOYMENT_ENV=staging` only on editorial-staging. Do not copy its
generated dist to production or switch domain associations. APIs, storage,
analytics settings and credentials remain unchanged; no database migration is
required. PIA retains Vimeo and Mighty feeds and outbound County Post links.

If rollback is needed, restore the recorded production tree in a new reviewed
commit on main (preserving any subsequent unrelated changes) and use the normal
Amplify deployment. Main job 85 and the rollback tag identify the prior release.
Do not force-push shared branches or modify backend data to roll back this UI.
