---
name: pia-counties-delivery
description: Integrate, troubleshoot, and deploy pia-counties candidate intake and review through mighty-api, with shared county and state feeds from county-post-news-api. Use for this PIA project and compatibility with the-county-post.
---

# PIA Counties delivery

The local projects live under `/home/telephoneheater/Projects/PIA`, normally as sibling repositories. Inspect repository status before editing; candidate work originated on `pia-counties`'s `candidate-api-update` branch and is absent from older main checkouts. Preserve newer main changes when integrating it.

## AWS account and regions

Use the user's **`pia` AWS CLI profile explicitly** for local AWS/SAM commands and `AWS_PROFILE=pia` for local SDK/seed commands. Verify `aws --profile pia sts get-caller-identity`: the expected account is `426771918029` (`pia-cli`). Do not fall back to `default` or `dharma`. CodeBuild uses its assigned service role, so do not add a workstation profile to buildspecs.

PIA hosting is Amplify app `d1c230b674qax4` in **us-west-1**, production branch `main`. County Post hosting is `d2z6lt4e5q50in` in **us-east-2**. The news stack `county-news-api` and existing candidate/Mighty stack `mighty-api-production` use **us-east-2**. Preserve existing app environment variables and stack parameters when updating public candidate settings; they also configure unrelated consumers and contain secrets. See `docs/deployment.md` for deployed identifiers and verification.

## Shared news

`pia-counties` reads county/state stories from `county-post-news-api`, configured with public build-time `VITE_NEWS_API_URL`. The independent `VITE_API_BASE_URL` serves calendar/Vimeo routes; do not point it at the news service. Static Amplify hosting does not execute the files in `api/`.

Use `src/lib/news-api.ts` and `src/components/NewsFeed.tsx`. Feed paths use full state slugs, even when the page uses state abbreviations. Keep the centralized topic mapping: elections uses `politics`; narrow `election-administration` misses candidate/race coverage. Video selects `mediaType=video` from the same cached general feed. The API owns locality, deduplication and topic filtering. Do not reapply the old county-name filter: it discards local-town and publisher stories already accepted by the server. Check returned scope/topic before displaying content. Preserve nearby-coverage notices, bounded stale cache, retries, and independent widget loading.

Use `npm run audit:news -- --base-url=... --retry-failures` for a resumable live check of all 3,143 county general feeds and all 51 state/DC general and politics feeds. `--all-topics --state=texas --county=potter --output=coverage/potter-topics` narrows a topical check. The checkpoint/report are ignored under `coverage/`. Keep bounded concurrency and rate-limit backoff. Separate mock/browser results, live cache hits, cold timings, empty topics and failed requests in reports. Never infer all-topic nationwide coverage from a general-news audit.

The PIA Lambda regional quota was ten concurrent executions when checked. A warmer with ten workers consumes the quota alongside its own invocation, then drains its queue through 429 failures. Keep the prepared three-worker, fifty-feed passes and bounded retries unless measured capacity supports a change. Check `warmer.pass` logs and `lambda get-account-settings`; an enabled schedule alone proves nothing about successful warming. Louisiana retrieval and locality must use **Parish**, including nearby queries, while retaining existing county URL slugs.

Keep geography consistent across PIA, Mighty candidate validation, the news API and County Post: FIPS 24510, 29510, 51600, 51620, 51760 and 51770 use `-city` slugs to avoid collisions with same-named counties. Do not reconstruct slugs from names alone. Assert unique routes and correct FIPS resolution across all 3,143 records; array length alone hid six collisions. Deploy these news routes before the frontend uses them. Preserve County Post's existing editorial filtering and batched page, sources and atlas contracts. Its locality labels must recognize Parish and City. Run its browser suite on an isolated strict port, not a reused user dev server.

## Candidate workflow

Production backend: `PatriotsIA/mighty-api`, source `src/candidates`, in the existing `mighty-api-production` stack. The earlier `pia-candidate-api` checkout is historical implementation provenance, not a second production stack. Preserve the original Mighty Function URL, proxy routes, CORS and secret access. The separate candidate Lambda must not inherit the Mighty secret ARN or permissions. Public and private routes are `/candidate-form` and `/candidate-review`; keep both out of navigation/sitemaps and mark them noindex. The backend base URL includes its API Gateway stage, normally `/prod`.

The public form submits `{candidate, submitter, consent, attestation, honeypot}`. Submitter details are private. Success requires a real submission receipt. Reuse the candidate ID only for identical retries; approval uses optimistic revisions and publishes only `candidate`. Reviewer authentication uses Cognito and an `admins` group; keep tokens in memory and clear them on leaving review. A successful health request does not verify storage, JWT authorization, CORS or publication.

The reviewer’s **Preview Profile** dialog must share `src/components/CandidateProfile.tsx` with public profiles and use current form values, including unsaved edits. Pass only candidate fields; exclude submitter details and moderation notes. Previewing must not save, approve, publish or expose draft URLs through sharing. Preserve Escape/close focus return, edits, and mobile layout. React StrictMode replays effects: do not call dialog `close()` during effect cleanup when `onClose` dismisses component state.

Additional reviewers are provisioned by Mighty `scripts/create-reviewers.py <email> ...` using the existing pool and `admins` group. It suppresses invites and saves generated permanent credentials in `~/.local/share/pia/candidate-reviewers.json` (0600). Verify actual login and the protected candidate endpoint. Never reset another account as an incidental side effect; provide generated passwords only when explicitly requested by the user.

Run Node 22 checks in both repositories. Mighty backend: `npm run typecheck`, `npm test`, `npm run build`, `sam validate --lint`. Frontend: `npm test`, `npm run lint`, `npm run build`, `npm run test:e2e`. Browser tests start the real candidate handler from `../mighty-api` with a test-only memory repository; they do not call DynamoDB, Cognito or SES. `CANDIDATE_API_REPO` overrides the sibling checkout and `PLAYWRIGHT_CHROMIUM_EXECUTABLE` selects Chromium.

Read the frontend `docs/deployment.md` and Mighty `docs/candidates.md` before deployment. Run SAM lint as well as YAML parsing: CloudFormation requires `EnabledMfas: [SOFTWARE_TOKEN_MFA]` on the user pool, not the Cognito API's `SoftwareTokenMfaConfiguration` shape. The deployment role needs API Gateway `TagResource`/`UntagResource` as well as CRUD. Keep candidate tables and SES identity retained after established deployments; `RetainExceptOnCreate` permits failed initial creations to roll back cleanly.

Seed before switching the directory to the authoritative API. Mighty scripts `seed-candidates.ts`, `bootstrap-reviewer.py`, `smoke-candidates.py` and `configure-pia-candidates.py` document the initial sequence. Use the existing reviewer credential at `~/.local/share/pia/candidate-review.json` without printing it or recording login traces. Production smoke tests suppress invitations/notifications, exercise actual JWT authorization and DynamoDB publication, and remove only their generated test record. Restore `CandidateNotificationsEnabled=true` through CloudFormation after cleanup and SES verification. `patriotsinaction.com` is verified in SES us-east-2 through three DKIM records; preserve existing mail DNS. Never send a test notification email without user authorization.

Check exact production-origin CORS, public API stage, Cognito region/client, seeded catalog, reviewer browser login and both sites' news after release. Follow existing GitHub main → CodePipeline/Amplify builds to success so a later pipeline cannot revert an uncommitted manual deployment. Read settings and pipeline configuration without printing secrets.
