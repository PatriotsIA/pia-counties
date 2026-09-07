# Candidate and shared-news deployment

The frontend uses three independent public API settings. `VITE_NEWS_API_URL` is the **county-post-news-api** base. `VITE_CANDIDATE_API_BASE` is the candidate API Gateway base **including its stage, e.g. `/prod`**. `VITE_API_BASE_URL` is the calendar/Vimeo API origin. Do not interchange them. Amplify static hosting does not execute `api/` functions.

Use Node 22 (`.nvmrc`) and `npm ci`. The code is prepared in three repositories:

| Repository | Change |
| --- | --- |
| pia-counties | Candidate intake/review integration, shared county/state feeds, deployment checks and browser tests |
| pia-candidate-api | Geography validation, retry receipts, bounded notifications, real-handler integration tests |
| county-post-news-api | One bounded image-enrichment pass, partial image results, reliable county/state cache warming, Louisiana parish retrieval |

## Verified PIA environment (September 7, 2026)

Use `aws --profile pia` and `sam ... --profile pia` for every local AWS operation. `aws --profile pia sts get-caller-identity` returned account **426771918029**, user **pia-cli**. Local SDK and seed commands use `AWS_PROFILE=pia`; CodeBuild retains its AWS service role.

- Frontend: Amplify **d1c230b674qax4**, **us-west-1**, production branch **main**. Its news URL already points at County Post; its SPA rewrite is present. `amplify.yml` pins Node 22 for the new build.
- News: CloudFormation **county-news-api**, **us-east-2**. Apex/www PIA CORS is configured. The five-minute warmer is enabled and covers all counties, but observed passes failed 141–142 of 150 requests. The regional Lambda quota is ten; ten warm workers plus the warmer itself exceeded that capacity. The prepared update uses three workers, fifty feeds per pass, bounded transient-error retries, and status counts in logs.
- Candidate: no candidate stack or HTTP API was found in **us-east-2**, and Amplify has none of the three candidate variables. Deploy `pia-candidate-api-prod`, seed it, create the reviewer, then set the returned public identifiers before frontend cutover.
- Notifications: SES **us-east-2** is in the sandbox with **no verified identities**. Verify the sender and fixed staff recipient before enabling notifications; request production access if required for the chosen recipients. No email verification or test email was sent during preparation.

The code checks pass locally; the missing candidate infrastructure and SES verification are release prerequisites. These changes have not been deployed.

## Candidate backend

The repository is `git@github.com:ErikBurdett/pia-candidate-api.git`. Follow its `docs/deployment.md` for SAM/CodePipeline deployment. Validate with `npm run typecheck`, `npm test`, `npm run validate:templates`, and `npm run build`; run `sam validate --lint` and `sam build` in the deployment toolchain.

Deploy the candidate API before switching the frontend. Configure the SES sender in the same AWS region and add the exact production and preview frontend origins to `AllowedOrigins`. Use the stack outputs for the API URL, region and Cognito client ID. Set up a reviewer in the Cognito `admins` group as described in the backend deployment guide.

Validate the checked-in seed with `npm run seed -- --dry-run`, then seed the deployed DynamoDB table through the backend's idempotent seed command or `buildspec.seed.yml`. The API's approved catalog is authoritative, including an empty catalog; skipping the seed hides the existing profiles after cutover.

Public intake is `/candidate-form`; private moderation is `/candidate-review`. These operational routes are intentionally absent from navigation/sitemaps and marked noindex. Submission success requires a receipt. An unchanged retry reuses its candidate ID; the backend returns the existing receipt rather than inserting another record. Editing/approving uses optimistic revisions. Submitter details never enter the public projection. The local tests use fixture storage and suppress notifications; they do not prove deployed DynamoDB, Cognito or SES permissions.

## Shared news backend

Set in Amplify's build environment:

```text
VITE_NEWS_API_URL=https://ntqzmx2vo55fnwkqfwggcmdkny0jzlco.lambda-url.us-east-2.on.aws
VITE_CANDIDATE_API_BASE=https://<api-id>.execute-api.<region>.amazonaws.com/prod
VITE_CANDIDATE_COGNITO_REGION=<region>
VITE_CANDIDATE_COGNITO_CLIENT_ID=<public-spa-client-id>
```

The news API already permits `https://patriotsinaction.com` and its `www` origin in its template; the apex CORS response has been checked live. Add any Amplify preview origin to that API's `CorsOrigins` parameter. A backend stack update that does not change an existing parameter will not adopt a new default automatically.

News widgets use `/v1/feeds/counties/:stateSlug/:countySlug/:topic` or `/v1/feeds/states/:stateSlug/:topic`, independently, with 40 initial stories. The full state slug is required even when the SPA URL is abbreviated. The widget can reveal more stories and request up to 200. Browser caches retain feeds for up to five minutes, retry empty feeds after 30 seconds, and retain a bounded saved copy for at most 24 hours. API locality and topic filtering remain authoritative. Nearby-county expansion is labelled. Video selects actual video items from the shared general response, so it creates no duplicate general request. Empty specialty topics remain honestly empty.

| Widget | API topic |
| --- | --- |
| County/City News, video source | general |
| Elections & Politics | politics |
| Sports | sports |
| Obituaries | obituaries |
| Bond Issues | municipal-bonds |
| Budgets & Spending | budgets-levies |
| Taxes, Rates & Appraisals | property-taxes |

The news API performance changes require their own deployment. They remove repeated image deadlines, retain images completed inside a single 750 ms budget, and add state general/politics feeds to the scheduled warmer's bounded rotation. At fifty targets per five-minute pass, all 3,245 feeds cycle in about 5 hours 25 minutes, within the 24-hour shared-cache window. They preserve the county/provider coverage tiers. Cold provider calls can still be slower than cache hits; do not promise all pages meet a cold latency target based on cached smoke checks.

The nationwide audit found an empty West Carroll Parish feed. Retrieval and filtering incorrectly required "County" in Louisiana. A local run of the corrected backend against live sources returned 21 stories (3 primary, expanded with nearby coverage) in 11.3 seconds; the deployed API still needs this fix.

Six independent cities previously collided with a same-named county: Baltimore, St. Louis, Fairfax, Franklin, Richmond and Roanoke. The frontend, candidate validator and news API now use `-city` routes for those six FIPS codes, preserving existing county routes. Deploy the news backend before the frontend so these new city feed endpoints resolve. Tests assert that all 3,143 FIPS codes now have unique routes and resolve to the correct county/city record. The live audit of the old deployment covers 3,137 distinct county routes plus 102 state feeds; the six new city routes require the prepared backend update.

## Validation and release

Validation completed on Node 22: frontend lint/build, 9 unit tests and 4 browser tests; candidate typecheck/build and 19 tests; shared news typecheck/build and 112 tests. Both SAM templates pass lint, and the candidate Lambda has a successful SAM build. The browser suite covers submission → private review → edit/approval → public county/state/profile directories, plus feed loading, failures, retries and mobile navigation.

The [live baseline audit](news-audit-2026-09-07.json) completed September 7: **3,239 distinct endpoints**, **3,238 populated**, **one empty parish**, **zero HTTP/CORS/scope failures** after bounded retries. Median latency was **6.3 seconds**, p95 **16.8 seconds**, maximum **30.1 seconds** on the existing deployment, confirming that production warming needs the prepared fix. All fourteen sampled Potter County/Texas specialty feeds populated. This does not assert nationwide specialty-topic volume or prove the new warmer's production latency.

```bash
npm test
npm run lint
npm run build
npm run test:e2e
npm run check:deployment
npm run check:deployment -- --live
```

The browser suite expects `../pia-candidate-api` with dependencies installed and Chromium at `/usr/bin/chromium`. Override with `CANDIDATE_API_REPO` and `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. It starts loopback-only fixture servers and tests the real candidate handler through the browser. The AWS services are separate deployment checks.

`check:deployment --live` makes read-only health/catalog/CORS requests. It rejects placeholder settings and an unseeded public catalog. `FRONTEND_ORIGIN` selects the exact origin to check. Reviewer login, end-to-end persistence and SES notification delivery require the deployed environment; use an agreed test submission when those checks are authorized.

Run the resumable live news audit:

```bash
npm run audit:news -- --base-url=https://<news-api> --retry-failures --retry-empty
npm run audit:news -- --base-url=https://<news-api> --state=texas --county=potter --all-topics --output=coverage/news-topics-potter
```

The default audit checks every county general feed and every state/DC general and politics feed. It does not assert all specialty topics contain stories. It uses bounded concurrency, rate-limit backoff, JSONL checkpoints, and a final JSON report with counts, scope/CORS failures and latency percentiles. `coverage/` is ignored.

Redeploy Amplify after changing `VITE_` variables. For an Amplify SPA, keep the standard rewrite to `index.html` for extensionless routes; candidate profile, review and county deep links must work on a fresh browser load. Roll back frontend and backend versions independently; keep the candidate table and original IDs intact.
