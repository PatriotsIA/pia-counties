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
2239.767 seconds (37:20 rounded); its streams were copied without re-encoding.
The opening clip is re-encoded at CRF 18 to end both streams at exactly 453
seconds. Both MP4s have their metadata moved to the beginning for streaming.
The poster is an unaltered frame at 00:30. Do not describe the opening excerpt
as Paxton's speech: the recording includes introductory remarks.

`ops/media/paxton-manifest.json` records published durations, codecs, sizes, and
SHA-256 hashes separately from local preparation files. The slow workstation
upload was replaced by temporary CodeBuild jobs that fetched the public source
and prepared the media directly in AWS. No persistent build service is required.
Local prepared files live in ignored `coverage/paxton-media/` in the
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

## Timestamp links and QR code

`https://patriotsinaction.com/paxton?t=115#paxton-video` opens the excerpt at
1:55 and scrolls to the player. `t` is a positive number of seconds. The full
recording supports the same parameter at `/ken-paxton?t=115#campaign-videos`.
The player loads metadata and seeks once it knows the duration; it stays paused
until the visitor presses Play. Missing or invalid timestamps retain normal
on-demand loading. Timestamps past the end are clamped just before the end.

The production link is encoded in the PNG and SVG QR files at
`public/campaigns/ken-paxton/paxton-1m55s.{png,svg}`. They use black modules on
white with a four-module quiet zone and medium error correction. Generate with
`qrencode -t PNG -l M -s 20 -m 4` (or `-t SVG`) and verify the decoded PNG with
`zbarimg --quiet --raw`. Preserve the entire URL, including the fragment.

The browser test uses a small, synthetic two-minute MP4 to check actual media
seeking, paused state, scroll position, invalid values, and bounds on desktop and
mobile. Its fixture is generated with:

```sh
ffmpeg -f lavfi -i color=c=black:s=16x16:r=1:d=120 -an -c:v libx264 -pix_fmt yuv420p -movflags +faststart tests/fixtures/timestamp-video.mp4
```
