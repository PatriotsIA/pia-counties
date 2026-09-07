# Candidate and shared-news deployment

PIA candidates run in the existing **mighty-api-production** AWS stack. County and state stories come from **county-post-news-api**, shared with **the-county-post**. The original Mighty community/weather proxy retains its Function URL, secrets and routes.

## Production environment

Use `aws --profile pia` and `sam ... --profile pia` for local AWS operations. Verify account **426771918029**, IAM user **pia-cli**. Local SDK/seed commands use `AWS_PROFILE=pia`; CodeBuild uses its assigned service role.

| Service | Resource | Region |
| --- | --- | --- |
| PIA frontend | Amplify d1c230b674qax4, main | us-west-1 |
| County Post frontend | Amplify d2z6lt4e5q50in, main | us-east-2 |
| Candidate and Mighty APIs | CloudFormation mighty-api-production; pipeline MightyAPI | us-east-2 |
| Shared news | CloudFormation county-news-api; pipeline county-news-api-pipeline | us-east-2 |

Public PIA build settings:

```text
VITE_NEWS_API_URL=https://ntqzmx2vo55fnwkqfwggcmdkny0jzlco.lambda-url.us-east-2.on.aws
VITE_CANDIDATE_API_BASE=https://luzwga4j7h.execute-api.us-east-2.amazonaws.com/prod
VITE_CANDIDATE_COGNITO_REGION=us-east-2
VITE_CANDIDATE_COGNITO_CLIENT_ID=17rhshtv8pi76e2a4jeb7afe04
```

`VITE_MIGHTY_API_BASE` remains the Mighty Function URL. The separate `VITE_API_BASE_URL` serves calendar/Vimeo routes. Preserve all existing app environment variables when updating public candidate values; other settings may contain secrets. Amplify static hosting does not execute `api/` functions. Rebuild after changing `VITE_` settings and retain the SPA rewrite for fresh deep links.

## Candidates

Production source is `PatriotsIA/mighty-api`, under `src/candidates`. The earlier `pia-candidate-api` checkout supplied the implementation and is not a second production stack. Follow Mighty’s `docs/candidates.md` for the existing pipeline, deployment role permissions, Cognito, DynamoDB and SES.

The candidate Lambda uses its own role, table and HTTP API; it cannot read the Mighty secret. API Gateway validates Cognito JWTs and the handler requires the `admins` group. Keep the `/prod` stage in the frontend API base URL.

All **56 existing profiles** were seeded before frontend cutover, preserving their IDs. The API catalog is authoritative. Public intake is `/candidate-form`; moderation is `/candidate-review`. Both operational routes remain outside navigation/sitemaps and are marked noindex. Intake success requires a persisted receipt. Identical retries reuse the same candidate ID. Moderation uses optimistic revisions and publishes only the candidate profile, keeping submitter details private.

The reviewer bootstrap suppresses invitation mail and stores the generated credential locally at `~/.local/share/pia/candidate-review.json` with owner-only permissions. Do not print that file or record login traces. Production smoke verification exercised actual Cognito login, authorized review, DynamoDB submission, identical retry, pending privacy, edit, approval and public projection; its generated test record was removed afterward. The public catalog returned to 56.

SES `patriotsinaction.com` is verified in us-east-2, including DKIM. CloudFormation added three DKIM CNAMEs to the existing hosted zone without changing MX/SPF/nameservers. `CandidateNotificationsEnabled=true` sends submission notices to the fixed staff recipient. Smoke tests ran with notifications disabled; no test email was sent. SES remains in the sandbox; the configured sender and staff recipient belong to the verified domain. See [SES identity requirements](https://docs.aws.amazon.com/ses/latest/APIReference/API_SendEmail.html).

## Shared news and County Post compatibility

News widgets call `/v1/feeds/counties/:stateSlug/:countySlug/:topic` or `/v1/feeds/states/:stateSlug/:topic`. Use full state slugs even when PIA page URLs use abbreviations. Each widget loads independently with 40 initial stories and can request up to 200. Browser caches are fresh for five minutes, retry empty feeds after 30 seconds, and retain a bounded saved copy for up to 24 hours. The API owns locality and topic filtering. Nearby coverage stays labelled. Video selects actual video items from the cached general response.

| Widget | API topic |
| --- | --- |
| County/City News, video source | general |
| Elections & Politics | politics |
| Sports | sports |
| Obituaries | obituaries |
| Bond Issues | municipal-bonds |
| Budgets & Spending | budgets-levies |
| Taxes, Rates & Appraisals | property-taxes |

The API now uses one 750 ms image-enrichment budget and retains completed images. The regional Lambda quota is ten executions, so the warmer uses three workers and fifty feeds per five-minute pass, with bounded transient-error retries. All 3,245 county/state feeds cycle in about 5 hours 25 minutes, inside the shared 24-hour cache window. Four consecutive deployed passes refreshed 50/50 feeds each with zero failures; the previous ten-worker deployment failed 141–142 of 150 requests per observed pass.

Louisiana retrieval and locality labels use Parish. The previously empty West Carroll feed returned 21 stories after a forced refresh of the deployed fix. Six independent cities now have distinct `-city` routes: Baltimore, St. Louis, Fairfax, Franklin, Richmond and Roanoke. Existing county URLs remain intact. PIA, Mighty geography validation, the news API and County Post agree on all 3,143 FIPS routes.

County Post continues using its existing API URL and editorial filters. Compatibility checks cover national/state/county feeds, batched page sections, sources, atlas and the six city routes, including PIA and County Post apex/www CORS. Its frontend recognizes parish/city display names and distinct city URLs.

## Verification and releases

The [deployed nationwide audit](news-audit-deployed-2026-09-07.json) checked **3,245 distinct endpoints**: all 3,143 county/city general feeds plus 51 state/DC general and politics feeds. **All populated; zero empty feeds and zero HTTP/CORS/scope failures.** Median response time was **154 ms**, p95 **361 ms**, maximum **12.4 seconds**. These measurements predominantly reflect cache hits; cold provider work can still take several seconds. They do not assert that every specialty topic has stories everywhere.

The earlier [baseline audit](news-audit-2026-09-07.json) covered 3,239 distinct endpoints before the six city routes were corrected: 3,238 populated, one empty parish, median 6.3 seconds and p95 16.8 seconds. Fourteen sampled Potter/Texas specialty feeds also populated.

Local checks on Node 22: PIA lint/build, 9 unit tests and 4 browser tests; Mighty typecheck/build and 19 tests; shared news typecheck/build and 112 tests; County Post build and 33 browser checks. Both backend SAM templates pass lint and SAM builds. The PIA browser suite starts the real candidate handler from `../mighty-api` using fixture storage. Override with `CANDIDATE_API_REPO` and `PLAYWRIGHT_CHROMIUM_EXECUTABLE` as needed. AWS persistence/authentication checks are separate from browser fixtures.

```bash
npm test
npm run lint
npm run build
npm run test:e2e
npm run check:deployment -- --live
npm run audit:news -- --base-url=https://<news-api> --retry-failures --retry-empty
npm run audit:news -- --base-url=https://<news-api> --state=texas --county=potter --all-topics --output=coverage/potter-topics
```

Use bounded audit concurrency. Ignored `coverage/` contains resumable JSONL checkpoints and complete reports. `check:deployment --live` is read-only and rejects missing/placeholder configuration and an unseeded catalog.

Deploy backends before frontend consumers, retain existing stack parameters and original API URLs, and follow the existing main-branch CodePipeline/Amplify jobs to completion. Keep deployed changes committed so future pipeline runs cannot revert a manual update. Roll back frontend and backend code independently while preserving the candidate table and original IDs.
