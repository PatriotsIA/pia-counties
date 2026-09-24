# County Post ads and image delivery — September 24, 2026

Both supplied County Post creatives link to https://thecountypost.com/ and run on
national and state homepages, and all 3,143 county homepages. National/state
placements put GOPConnect between them. County carousels retain every previous
sponsor in the same relative order and separate the new creatives, including
across the rotation boundary. Existing footer campaigns and geographic targeting
are unchanged. Mobile carousel columns now fit the visible track so artwork is
not clipped at the right edge. The artwork itself is uncropped and unmodified.

`assets/source/` retains the two supplied PNG originals. The asset generator
`scripts/optimize-images.py` uses ImageMagick with WebP support. Run it explicitly
after adding/replacing referenced artwork, then review and commit the outputs;
normal builds use the checked-in generated files and need no image toolchain.

`docs/image-optimization.json` inventories 101 referenced local raster images.
There are 24 smaller, original-dimension lossless WebP encodings, checked against
decoded pixels, and 60 images with smaller responsive variants. The browser picks
300/600/900-pixel or original-size artwork according to the placement and screen
density. Original-dimension alternatives remain available for larger/high-density
screens. Full-size JPEG/GIF originals remain in use where conversion is larger or
cannot preserve decoded frames/timing. SVG flags stay vector. Original files and
URLs remain available. Remote feed/candidate photos and uploaded previews retain
their original URLs; below-page media is deferred without changing its content.

Carousel images load when visible/nearby, with the adjacent track region prepared
for navigation. This avoids fetching every offscreen creative immediately. Image
boxes reserve the existing ad proportions, while other images keep their existing
CSS dimensions. Rotation, reduced-motion handling, links and analytics are retained.

## Validation

- 38 unit tests passed, including all-county eligibility, old sponsor retention,
  and separation of the new creatives through carousel wrap.
- 48 browser regression tests passed, including candidate intake/review against
  local fixtures, county search, feeds/calendars, GOPConnect and Parallel partners.
- The 3 ad/layout browser tests passed again after final visual sizing correction.
- ESLint and the Node 22 production build passed.
- Desktop/mobile visual review at 1280px/390px; existing hero, sponsor logo and
  footer image dimensions compared against the unchanged source. Full artwork,
  responsive WebP selection, lazy slides and banner navigation were checked.

Local cold-browser measurements, with identical external-feed fixtures, count
first-party image response bodies only. Initial image bytes fell 88–95% on the
national, Texas, Potter County and Los Angeles County pages. Scrolling the complete
page (including the new ads) produced these desktop totals:

| Page | Before | After |
| --- | ---: | ---: |
| National | 2,590,920 B | 1,617,241 B |
| Texas | 4,036,316 B | 1,611,796 B |
| Potter County | 5,678,649 B | 1,022,611 B |
| Los Angeles County | 5,217,404 B | 1,223,265 B |

These are bounded browser measurements, not field performance or billing estimates.
Local review evidence is in ignored `coverage/ad-assets/`. This addresses the PIA
portion of PIA-012; The County Post's own site is a separate remaining scope.
