# Paxton event and accomplishments

`/paxton` is a separate support landing page from `/ken-paxton`. It contains the
first **453 seconds (7:33)** of the supplied Facebook recording, the existing
Vote Ken Paxton square ad, and six dated accomplishments linked to primary OAG
sources. The original ad destination and analytics remain intact. The full
recording appears before all existing YouTube videos on `/ken-paxton`.

Both pages use the shared header, PIA support attribution, distinct canonical
URLs, native accessible video controls, inline mobile playback, and no autoplay.
`preload="none"` prevents video downloads until requested. The clip is a real
trimmed file, so it cannot continue into the rest of the event. Cross-links join
the two pages; this does not create a second candidate directory entry.

## Media

Source: https://www.facebook.com/watch/?v=1137628245392101

The publicly available source is 1280×720, H.264 with AAC audio. The full file is
2239.766 seconds (37:20 rounded); its streams were copied without re-encoding.
The opening clip is re-encoded at CRF 18 to end both streams at exactly 453
seconds. Both MP4s have their metadata moved to the beginning for streaming.
The poster is an unaltered frame at 00:30. Do not describe the opening excerpt
as Paxton's speech: the recording includes introductory remarks.

`ops/media/paxton-manifest.json` records durations, codecs, sizes, and SHA-256
hashes. Local prepared files live in ignored `coverage/paxton-media/` in the
release worktree; large video files do not belong in Git.

CloudFormation: `ops/media/template.json`, stack `pia-site-media`, `us-west-1`,
AWS profile `pia`. The private, encrypted, versioned bucket is retained on stack
deletion. Only this CloudFront distribution can read its objects; bucket public
access remains blocked. No existing site hosting or API resource is replaced.

- Bucket: `pia-site-media-mediabucket-mw98vftibki3`
- Distribution: `E12LKLKTHAUG8Q`
- Base URL: `https://d2mwhhov0un9j4.cloudfront.net`
- Objects: `paxton/big-texan-opening-7m33s-v1.mp4`, `paxton/big-texan-full-v1.mp4`
- MIME: `video/mp4`; cache: `public,max-age=31536000,immutable`

Use a new versioned object name for replacements; don't overwrite immutable
URLs. The source URLs in `src/data/paxton.ts` are shared by production and staging.

## Accomplishment review — October 27, 2026

The six source links and announcement dates live alongside the prose in
`src/data/paxton.ts`. They cover the Meta and Google privacy settlements, the
2022 opioid distributor agreement, establishment of the human trafficking unit,
the Marriott data-security settlement, and the resolution of the IRS child
support contractor dispute. Texas amounts are distinguished from nationwide
totals. Agreements are not described as funds already paid out, and the IRS
matter is correctly described as a voluntary dismissal following a no-action
letter and technology mitigation plan, not a court judgment.

## Release checks

Production and redesign receive the same content commit separately. Production
uses `main`; the redesign deploys from `editorial-staging` and retains its
staging noindex configuration. Do not merge the whole redesign into production.

Node 22 build, lint, 38 unit tests, and the eight focused campaign/Paxton browser
tests pass on both designs. The full production browser suite also passed all
64 tests; the final section-link check passed again on both designs. Desktop
and mobile screenshots were visually reviewed. The new browser check covers distinct routes/canonicals, the correct
excerpt source, no autoplay, the existing ad, six primary-source links, four
responsive widths, full-video ordering, and preservation of all four older
Paxton videos. Live media playback and seeking require a separate hosted check.
