# County Mighty feed and calendar audit — November 6, 2026

All 254 Texas county mappings match distinct county spaces in the complete 290-space Mighty catalog. All 254 public community feeds and all 254 calendar endpoints returned HTTP 200, with the expected My Local GOP and PIA origin CORS headers. All feeds contain posts. Nine calendars contain event records; 245 currently contain none. No additional general county spaces were found outside Texas. Topical and subgroup spaces are not substitutes for general county feeds.

Hale uses space `22287629`. Its six source event records include four recurring series. Five future occurrences remain as of November 6 at 22:00 UTC: November 9 commissioners court; November 10 and 24 and December 8 and 22 Plainview City Council. The fourth-Monday commissioners series ended in October according to its COUNT limit. Future dates must not be invented after a series expires.

| County | Source event records | Upcoming occurrences |
| --- | ---: | ---: |
| Carson | 3 | 2 |
| Ector | 6 | 9 |
| Gray | 10 | 3 |
| Hale | 6 | 5 |
| Hardeman | 4 | 3 |
| Midland | 6 | 6 |
| Parker | 8 | 9 |
| Potter | 81 | 13 |
| Randall | 5 | 7 |

The detailed CSV contains counts and public space IDs only, with no calendar tokens or post/member content. Counts are a point-in-time source audit, not a promise of future activity. Potter required two source pages. The first audit pass stopped on HTTP 429; a later single-worker pass with request spacing completed successfully.

## Corrections and validation

My Local GOP now expands Mighty recurring events using PIA's existing recurrence implementation, preserves time-zone changes, honors recurrence limits, and reads every event page. Successful empty calendars stay empty; actual failures can use the configured ICS fallback. A static production build no longer calls the development-only relative calendar proxy. Empty connected feeds/calendar views and transient failures are distinguished from missing county setup on both sites, with retry controls for failures.

The shared API limits event-detail requests to three concurrent calls per calendar page. An incomplete upstream page returns an error instead of undated event stubs that clients would silently discard. This reduces per-request bursts; it is not a global rate limiter.

Validation: My Local GOP's 8 unit tests, lint and production build; browser checks of Hale's five dates, second-page retrieval, Central winter time, empty responses, failure/retry, community links, mobile overflow and page errors. PIA's 38 unit tests, lint, production build and complete browser suite pass, including connected-empty, retry and Alabama/Texas Hale isolation. Mighty API's 169 tests, typecheck, production build and SAM template lint pass. Existing unrelated npm advisories remain; the new Vitest release has no independent advisory beyond the existing Vite dependency.

Release through each repository's main-branch pipeline. Preserve deployed API URLs, environment variables, stack parameters and candidate resources. The live Mighty CodeBuild specification still omits npm tests (tracked separately as PIA-008); the full suite was run locally for this change.
