# Candidate voter guide questionnaires

The candidate form and reviewer editor offer an optional **Office questionnaire** selector with the 28 office questionnaires supplied in `Final questions.zip`. It is available to candidates in every state and party. The supplied Texas/Republican wording is preserved; all questions may be left unanswered. Choosing no questionnaire leaves the existing profile workflow unchanged.

Each selected questionnaire has 20 questions in three sections. Public profiles and reviewer previews use the same question/answer rendering. Skipped questions display **No response provided.** A profile without a selected questionnaire has no questionnaire section. Changing the selected office or removing an answered questionnaire asks before clearing its answers.

The form provides written responses, Yes/No choices, per-year primary history, activity checkboxes, dollar amounts, and a source-of-funds selector. No choices or amounts are preselected. Zero dollars is an explicit valid answer. “None of the above” cannot be combined with another activity. Judicial notes and the source's party-section notice remain attached to the questions.

Written responses have live word counts and limits of 150 words, or 50 for questions 19–20, plus a 4,000-character safety bound per response. The API enforces the same limits and rejects unknown question IDs, fields, choices, years, versions, and invalid amounts. All questions and their subfields are optional; choosing Yes, No, or leaving a question blank does not affect publication eligibility.

## Persistence and review

Answers are stored under the optional public `candidate.voterGuide` field:

```json
{
  "version": "texas-republican-2026-09",
  "officeId": "governor",
  "answers": {
    "1": { "text": "Candidate's written response." },
    "16": { "history": { "2018": "Did not vote" } },
    "19": { "amounts": { "Local party, last four years ($)": "0" } }
  }
}
```

Version and office identify the exact questions; question numbers identify answers. Only supplied answers/subfields are stored. Submitter details and moderation notes remain private. Pending responses stay private until the normal approval of the original candidate profile. Existing records require no migration, reseed, or fabricated responses.

Reviewers can edit, save, preview, and publish responses with the existing revision checks. The public Request Changes form prefills the current answers, sends only changed profile fields, and keeps corrections private until approved. Removing a questionnaire sends `voterGuide: null`. Pending-profile requests remain narrative-only; they do not expose private drafts. A questionnaire-only correction is shown as readable questions and answers in the review comparison.

## Source and implementation

`src/voter-guide/questions.json` is the byte-for-byte JSON file from the supplied ZIP. All 560 question texts were checked against the 28 Word documents and matched. Its SHA-256 is `e87dcff33d6a0ca9285694b93ff064967986863f6b5ac3f2bfdb93f3066c47c2`.

`src/voter-guide/model.ts` contains the version, shared types, source notes, word counts and validation. Both files are mirrored at the same path in `mighty-api`; keep them synchronized. The version's question text must remain immutable so existing answers cannot silently be attached to rewritten questions. Future questionnaire editions need explicit version support in both services.

- `src/components/CandidateQuestionnaire.tsx`: form controls and public response renderer.
- `src/lib/voter-guide-form.ts`: form serialization and semantic comparison.
- `CandidateSubmissionForm`, `CandidateReviewConsole`, and `CandidateProfile`: integration points.
- `src/lib/candidate-api.ts` and `candidate-change-form.ts`: API and public correction contracts.
- Mighty `src/candidates/domain/schemas.ts`: validation for intake, research drafts, edits and requests. Candidate request-body limit is 128 KiB to accommodate bounded answers.

## Verification and release

Run Node 22 frontend unit tests, lint, build and Playwright, plus Mighty typecheck, tests, build and SAM lint. Questionnaire browser tests use the real sibling handler with in-memory storage and mocked Cognito/external services; they do not use production records or email. Screenshots are written under ignored `coverage/questionnaire/`.

Deploy **Mighty first**, then the frontend, using the existing main-branch pipelines. No new endpoint, table, bucket, Cognito setting, environment variable or CloudFormation resource is needed. Preserve questionnaire schema support and existing change-request privacy protections in any backend rollback after responses have been stored. Local verification does not constitute production deployment.
