# Issues landing page and opinion polls

Route: https://patriotsinaction.com/issues

The main navigation and footer link to the page. Each of three issues has an
introduction, initiative links, and a neutral Yes / No / Not sure poll. The user
confirmed Recover America (rather than Restore America) and authorized drafting
neutral questions. The issue labels and destination pages are:

- Paper Voting — Patriots for Paper: https://www.patriotsforpaper.com/
- Stop the Sexualization of Children — Recover America: `/recover-america`,
  with a direct link to https://recoveramerica.com/protectchildren
- Sharia Watch — https://preview.d24saaaq598sfl.amplifyapp.com/

The descriptions summarize the existing initiative pages; poll participation
does not sign those organizations' pledges or subscribe anyone to messages.
The PFP shield and Sharia Watch WebP were copied from their existing project
assets. Recover America's previously optimized logo is reused.

## Data and behavior

`src/data/issue-polls.json` is the shared frontend/backend question catalog. IDs
and versions are immutable once responses exist. Editing a question requires a
new version, which uses separate counts and browser receipts. The backend is
packaged with this same JSON at deployment; it rejects stale versions. Keep
issue-to-poll associations by ID, not array position.

The page reads real aggregate results from `GET /polls`. Each vote goes to
`POST /polls/{pollId}/votes` with only `voterId`, `option`, and `version`. Polls
do not collect names, emails, phone numbers, free text, or geography. Public
responses contain only questions, choices, totals, and counts.

A different random UUID is saved in browser localStorage for each question
version. The database stores a SHA-256 digest scoped to that question, the
chosen option, and aggregate counters. A DynamoDB transaction atomically saves
the response, increments the count, and applies the rate limit. Same-option
retries return the existing receipt without incrementing; a changed answer from
the same ID returns 409 with the original response. The UI confirms saved state
only after the server responds and preserves the ID across failed requests.

IP addresses are converted to an HMAC digest with an hourly rotation before
rate-limit storage. The private salt is an AWS NoEcho parameter passed directly
through boto3, never command arguments or committed configuration. Each network
can submit up to 60 new responses per question per hour. Rate records have a
24-hour TTL; raw IPs and browser IDs are not written to application logs or the
database. Aggregate counts and response digests persist. No access-body logging,
mail notifications, or third-party form integrations are added.

These are informal self-selected visitor polls. Browser receipts and throttles
are abuse friction, not identity verification: clearing storage or using another
browser can permit another response. The page explains this limitation and that
results are not representative of the public. Results can be viewed without
voting, have a refresh control, and are never replaced with fabricated zeroes
during failures. There is no automatic closure date or administrator UI.

## Infrastructure and delivery

`backend/issues-polls/infrastructure.py` defines the isolated `pia-issues-polls`
CloudFormation stack in **us-west-2**, profile **pia**. It includes an HTTP API,
Python 3.13 Lambda, encrypted retained DynamoDB table with point-in-time recovery,
30-day logs, least-privilege role, request throttles, and error/throttle alarms.
The existing confirmed operations SNS subscription delivers to
**erik@patriotsinaction.com**; no test messages were sent. The API allows the PIA
apex, www, and main Amplify origins. No localhost origin is allowed in production.
An encrypted private artifact bucket holds versioned-by-hash Lambda ZIPs.

Public identifiers are in `docs/issues-polls-deployment.json`. The browser gets
only the API URL in `src/data/issues-poll-api.json`. Existing candidate, Mighty,
pledge, email, and hosting settings are unchanged.

Create a Python environment using `backend/issues-polls/requirements-dev.txt`.
Then, from this repository:

```sh
python -m pytest backend/issues-polls/test_app.py -q
python backend/issues-polls/deploy.py             # template only
python backend/issues-polls/deploy.py --deploy    # pia profile, isolated stack
python backend/issues-polls/verify_live.py        # read-only API/CORS checks
python backend/issues-polls/verify_live.py --exercise # temporary votes + exact cleanup
npm run lint
npm test
npm run build
npm run test:e2e
```

Deploy the backend before publishing its frontend config via the existing main
branch → Amplify pipeline (`d1c230b674qax4`, us-west-1). To roll back the frontend,
revert its page/navigation changes; retain the poll table and stack so saved
responses are preserved. Do not reinitialize or reset counters during a release.

## Verification, October 26, 2026

- 13 backend tests: three independent polls; atomic counts; same-ID replay;
  conflicting choices; origin/version/payload rejection; rate-limit rollback;
  no public voter identifiers; no raw identifiers in storage; outage behavior.
- Seven browser tests: desktop/mobile voting, all choices, reload persistence,
  network failure after a saved vote, receipts saved by another tab, unavailable
  results, and blocked storage.
- Live API: three temporary votes, duplicate and conflict checks, validation,
  origin restrictions, CORS preflight, private-record cleanup. Counts returned
  from zero to zero after exact transactional cleanup.
- Visual/browser review at 1440, 768, 390, and 320 pixels: real aggregate reads,
  loaded artwork, one poll per issue, title/canonical, no horizontal overflow,
  and no page application errors. Evidence is under ignored `coverage/issues/`.
- 38 existing unit tests, lint, TypeScript and production build pass. The full
  browser run passed 54/55 tests before the additional cross-tab receipt test;
  the same existing County Post promotional-image visibility test documented
  on October 23 remains failing. No county feed or promotional component was
  changed. Final focused poll checks cover the later receipt improvement.
