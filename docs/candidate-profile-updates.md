# Candidate profile change requests

## User-facing workflow

The shared public candidate profile has **Request Changes**, linking to
`/candidate-form?mode=published&candidate=<profile-id>`. The existing submission
form offers three submission types:

- **New profile:** the existing submission and publication review workflow.
- **Published profile update:** choose a published profile or follow its Request
  Changes link. Load its authoritative API version, edit its prefilled public
  fields, explain the requested changes, and enter current submitter details,
  attestation and publication consent. Clearing an optional field requests its
  removal; unchanged fields are not sent as edits.
- **Pending profile update:** enter the original submission reference and describe
  the changes. The reference is in the original receipt, and the new-submission
  success screen links back to this mode. If the reference is unavailable, contact
  `erik@patriotsinaction.com`.

Pending updates intentionally do **not** offer a public draft lookup. A reference
or an email address is not authentication. Draft content and original submitter
contacts remain private; the reviewer enters the requested edits using the
existing draft. This also supports older pending submissions without creating a
candidate account or introducing emailed passwords.

All updates create a **separate change-request receipt**, not a duplicate
candidate. Submitting a request never changes the pending or published original.
Requests are unverified submissions: reviewers must verify the requester’s
authority and the proposed facts before applying them.

## Reviewer workflow

Sign into `/candidate-review` with an existing authorized Cognito reviewer.

1. **Review queue** shows pending profiles and change requests. Requests identify
   whether the original was pending or published at submission time. Search by
   name, office, state or reference; use **Record type** to narrow the queue.
2. Open a request to read its private instructions and submitter details. The
   comparison shows the original public fields at request time versus the proposed
   values, including unsaved edits. Pending narrative requests initially have no
   field differences; enter the requested corrections before applying.
3. **Save Proposed Changes** saves only the request. **Preview Profile** displays
   the shared public layout without submitter details, instructions or review
   notes, and performs no API write.
4. **Open Original Profile** opens the current original in the review backend.
   **Back to Change Request** returns to the request. Internal editor navigation
   warns before discarding unsaved work.
5. **Apply to Published Profile** updates the existing published candidate in place.
   **Apply to Pending Profile** updates the existing draft, which **stays pending**;
   normal **Approve & Publish** remains a separate decision on that original.
6. **Deny Request** requires a reason and leaves the original unchanged. Accepted
   and denied requests are read-only history, available under **All records**.

**Published profiles** lists only actual published candidates, not accepted
change-request records. Reviewers can search for any published profile, open its
public page in another tab, edit its fields and use **Save Published Profile**.
This is an immediate live update, explicitly described in the editor. Private
review notes can also be saved. The candidate ID/public URL is not editable.

## Safety and concurrency

- Pending drafts, submitter contacts, change instructions, review notes and
  request history are excluded from public candidate responses.
- Approved change-request records must never appear as extra public candidates.
- Public pagination must not expose request IDs or moderation timestamps through
  encoded continuation keys. The backend continues through hidden rows internally
  and anchors public cursors only to returned published originals.
- The public prefill route serves only approved originals and includes the
  revision used by the request. It cannot retrieve pending profiles.
- Requests retain the original reference, target status/revision and baseline
  candidate snapshot. Candidate identifiers cannot be reassigned through edits.
- Acceptance checks both the request and original revisions in one DynamoDB
  transaction. If the original changed since the request was created, applying
  the request fails rather than overwriting newer work.
- For a stale request, open the original, compare the request instructions and
  current profile, and resolve the intended corrections there; then deny the
  stale request with an explanatory note or have the requester resubmit against
  the current version. There is no silent merge or force-apply operation.
- A pending original is not promoted during update acceptance. Original
  submitter/source/consent/attestation metadata is not replaced with the requester’s.
- County coverage is an unordered, deduplicated set; omitted and empty coverage
  are equivalent. Reordering counties, repeating them, or editing review notes
  alone cannot enable acceptance without an actual profile correction.
- Identical network retries reuse a request ID; changed payloads get a new ID.
  A persistence receipt is required before the form reports success.
- Existing photo limits, upload/save gating, Cognito admin checks and in-memory
  reviewer sessions remain in effect. Preview links do not expose draft URLs.
- `/candidate-form` and `/candidate-review` remain noindex operational routes,
  outside the main navigation and generated sitemaps.

## Implementation map

Frontend (`pia-counties`):

- `src/components/CandidateProfile.tsx`: shared public Request Changes entry point.
- `src/components/CandidateSubmissionForm.tsx` and related form components:
  submission modes, published prefill, pending instructions and receipts.
- `src/lib/candidate-api.ts`: public request contract, private request metadata,
  single-record admin navigation and private review-note persistence.
- `src/components/CandidateReviewConsole.tsx`: queue classifications, published
  management, comparisons, apply/deny controls and original/request navigation.
- `src/styles.css`: responsive review controls and comparison layout.
- `tests/browser/candidate-requests.spec.ts` and
  `tests/browser/candidate-review-updates.spec.ts`: public and admin regression
  workflows, alongside the existing integration suite.

Backend is the sibling **`mighty-api`** repository, not the historical
`pia-candidate-api` checkout. See its `docs/candidate-change-requests.md` for exact
routes, validation, storage, transactions, notification behavior and rollback
safeguards, and `docs/candidates.md` for the existing service's operations.

## Delivery and verification

Run with Node 22:

```bash
# pia-counties
mise exec node@22 -- npm test
mise exec node@22 -- npm run lint
mise exec node@22 -- npm run build
mise exec node@22 -- npm run test:e2e

# mighty-api
mise exec node@22 -- npm run typecheck
mise exec node@22 -- npm test
mise exec node@22 -- npm run build
sam validate --lint --profile pia --region us-east-2
```

Playwright starts the real Mighty candidate handler with test-only memory storage;
Cognito/external services are fixtures. These tests do not prove live DynamoDB,
Cognito, SES, API Gateway routing or production CORS. They send no real mail and
must not run concurrently on their shared strict ports (4180 and 8791).

Deploy **Mighty first**, then the frontend through the existing main-branch
CodePipeline/Amplify workflows. Use AWS CLI profile **`pia`** explicitly and verify
account **426771918029**. Preserve existing stack parameters, environment settings,
retained data, Mighty proxy routes, secrets and notification configuration. No
candidate reseed or data migration is required. Do not roll the backend back to a
version that publishes all approved records indiscriminately after update-request
records exist.

A production release and live persistence/authentication smoke checks are separate
from local implementation verification. Do not send test notification mail without
authorization. See [deployment.md](deployment.md).

### Local verification snapshot

The completed automated run after review fixes passed:

| Gate | Result |
| --- | --- |
| Frontend unit tests | 19 passed |
| Browser workflows | 33 passed; no skipped or flaky tests |
| Backend tests | 120 passed |
| Frontend ESLint, TypeScript and Vite build | Passed |
| Backend TypeScript and build | Passed |
| SAM template validation with lint | Passed using profile `pia`, us-east-2 |

Browser coverage includes pending/published intake, unchanged originals until
acceptance, denial, stale conflicts, published navigation, field removal across
save/apply, confirmed/rejected discard, upload-only corrections, and dependent
county resets and unordered county-set no-op detection. Delayed original/request
responses are also checked after SPA navigation away: neither success nor failure
can restore the old reviewer page. Backend tests cover private cursor boundaries
and concurrent receipt recovery. Existing Vite configuration/chunk-size and
terminal-color warnings remain; they do not fail these checks.

Desktop and mobile screenshots and local read-back observations are retained in
ignored `coverage/change-qa/`. Native pixel review covered the public profile,
published/pending forms, request comparison, application and published management.
These local results are **not a production deployment or live AWS smoke test**.
