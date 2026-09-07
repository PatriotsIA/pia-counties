---
name: pia-counties-delivery
description: Integrate, troubleshoot, and prepare deployments for the pia-counties candidate form, candidate API, and County Post news feeds. Use for this PIA project, not generic political sites or County Post editorial changes.
---

# PIA Counties delivery

The local projects live under `/home/telephoneheater/Projects/PIA`, normally as sibling repositories. Inspect repository status before editing; candidate work originated on `pia-counties`'s `candidate-api-update` branch and is absent from older main checkouts. Preserve newer main changes when integrating it.

## AWS account and regions

Use the user's **`pia` AWS CLI profile explicitly** for local AWS/SAM commands and `AWS_PROFILE=pia` for local SDK/seed commands. Verify `aws --profile pia sts get-caller-identity`: the expected account is `426771918029` (`pia-cli`). Do not fall back to `default` or `dharma`. CodeBuild uses its assigned service role, so do not add a workstation profile to buildspecs.

PIA hosting is Amplify app `d1c230b674qax4` in **us-west-1**, production branch `main`. The news stack `county-news-api` and intended candidate stack `pia-candidate-api-prod` use **us-east-2**. Hosting already has the public news URL; inspect current settings before changing them. See `docs/deployment.md` for the latest verified release prerequisites.

## Shared news

`pia-counties` reads county/state stories from `county-post-news-api`, configured with public build-time `VITE_NEWS_API_URL`. The independent `VITE_API_BASE_URL` serves calendar/Vimeo routes; do not point it at the news service. Static Amplify hosting does not execute the files in `api/`.

Use `src/lib/news-api.ts` and `src/components/NewsFeed.tsx`. Feed paths use full state slugs, even when the page uses state abbreviations. Keep the centralized topic mapping: elections uses `politics`; narrow `election-administration` misses candidate/race coverage. Video selects `mediaType=video` from the same cached general feed. The API owns locality, deduplication and topic filtering. Do not reapply the old county-name filter: it discards local-town and publisher stories already accepted by the server. Check returned scope/topic before displaying content. Preserve nearby-coverage notices, bounded stale cache, retries, and independent widget loading.

Use `npm run audit:news -- --base-url=... --retry-failures` for a resumable live check of all 3,143 county general feeds and all 51 state/DC general and politics feeds. `--all-topics --state=texas --county=potter --output=coverage/potter-topics` narrows a topical check. The checkpoint/report are ignored under `coverage/`. Keep bounded concurrency and rate-limit backoff. Separate mock/browser results, live cache hits, cold timings, empty topics and failed requests in reports. Never infer all-topic nationwide coverage from a general-news audit.

The PIA Lambda regional quota was ten concurrent executions when checked. A warmer with ten workers consumes the quota alongside its own invocation, then drains its queue through 429 failures. Keep the prepared three-worker, fifty-feed passes and bounded retries unless measured capacity supports a change. Check `warmer.pass` logs and `lambda get-account-settings`; an enabled schedule alone proves nothing about successful warming. Louisiana retrieval and locality must use **Parish**, including nearby queries, while retaining existing county URL slugs.

Keep `county-geography.ts` consistent across the three repositories: FIPS 24510, 29510, 51600, 51620, 51760 and 51770 use `-city` slugs to avoid collisions with same-named counties. Do not reconstruct slugs from names alone. Assert unique routes and correct FIPS resolution across all 3,143 records; array length alone hid six collisions. Deploy these news routes before the frontend uses them.

## Candidate workflow

Backend repository: `git@github.com:ErikBurdett/pia-candidate-api.git` (the PatriotsIA owner does not resolve for this repository). Public and private routes are `/candidate-form` and `/candidate-review`; keep both out of navigation/sitemaps and mark them noindex. The backend base URL includes its API Gateway stage, normally `/prod`.

The public form submits `{candidate, submitter, consent, attestation, honeypot}`. Submitter details are private. Success requires a real submission receipt. Reuse the candidate ID only for identical retries; approval uses optimistic revisions and publishes only `candidate`. Reviewer authentication uses Cognito and an `admins` group; keep tokens in memory and clear them on leaving review. A successful health request does not verify storage, JWT authorization, CORS or publication.

Run Node 22 checks in both repositories. Backend: `npm run typecheck`, `npm test`, `npm run validate:templates`, `npm run build`. Frontend: `npm test`, `npm run lint`, `npm run build`, `npm run test:e2e`. Browser tests start the real candidate handler with a test-only memory repository; they do not call DynamoDB, Cognito or SES. `CANDIDATE_API_REPO` overrides the sibling checkout and `PLAYWRIGHT_CHROMIUM_EXECUTABLE` selects Chromium.

Read the frontend `docs/deployment.md` and backend `docs/deployment.md` before deployment. Run SAM lint as well as YAML parsing: CloudFormation requires `EnabledMfas: [SOFTWARE_TOKEN_MFA]` on the user pool, not the Cognito API's `SoftwareTokenMfaConfiguration` shape. The seed must precede switching the public directory to the API, because the remote catalog is authoritative. Production verification requires exact Amplify/custom-origin CORS, API stage URL, Cognito region/client, seeded profiles, and the SES identity. Read AWS configuration without printing secrets. Preparing deployment does not authorize a production publish or test notification email.
