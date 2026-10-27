# Editorial staging

The reviewed UI is deployed independently from production:

- Public review address: `https://staging.patriotsinaction.com`
- Amplify default address: `https://editorial-staging.d1c230b674qax4.amplifyapp.com`
- Amplify app: `d1c230b674qax4`, region `us-west-1`
- Staging Git/Amplify branch: `editorial-staging`
- Production Git/Amplify branch: `main`

The older, divergent `staging` Git branch is preserved. The new review branch includes the editorial overhaul, existing sponsors, Recover America ads, and white county search fields with black input text. Do not merge or push it to `main` until production release is authorized.

The staging branch sets `VITE_DEPLOYMENT_ENV=staging`. This adds noindex metadata to the generated HTML and client-side routes and generates a robots file disallowing crawling. Production builds without this variable retain their existing indexing behavior. The standalone Amplify domain association for `staging.patriotsinaction.com` maps its empty prefix to `editorial-staging`; the existing apex/www domain association is retained unchanged.

Staging inherits the existing app configuration and uses the shared live candidate, Mighty and opinion-poll services. Their CORS lists retain all existing origins and add only the two staging origins above. This is a UI review deployment, not a copy of production data: do not submit trial votes, contact forms or candidate records as a visual check.

CORS changes use CloudFormation change sets with every unrelated parameter preserved. For the SAM `mighty-api-production` stack, resubmit the unchanged **Original** template with the new origin parameters. `UsePreviousTemplate` alone can reuse a processed template containing the previous literal API CORS list. Review the change set before execution: only the existing Mighty function environment and candidate HTTP API definition should change, with no replacements. The poll stack changes only its existing API CORS and function origin environment (and the dependent integration reference). No application code, tables, notification destinations or production URLs change.

Future parameter overrides must retain both staging origins while this review deployment is in use. Use the existing `pia` AWS profile; never put credentials in this document or in Git.

Before and after staging deployment, compare the main Amplify job/commit, production home HTML hash, and apex/www domain mappings. Verify HTTPS on the custom staging domain, deep links, white/black search inputs, original sponsor inventory, Recover America artwork, noindex metadata, and read-only candidate/poll API access. Production was on main job 75 / `c7e03d165dd7f5d6f4214b7c215487746d7fc893` when this staging release began.
