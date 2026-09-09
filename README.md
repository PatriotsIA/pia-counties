# The County Banner Counties

Simple nationwide React app for data-driven The County Banner county sites.

## Routes

- `/` landing page
- `/counties` state directory
- `/:state/:county` county home, for example `/texas/potter`
- `/:state/:county/about`
- `/:state/:county/elections`
- `/:state/:county/news`
- `/:state/:county/events`
- `/:state/:county/tv`
- `/:state/:county/partners`
- `/:state/:county/contact`
- `/:state/:county/submit-event`

## Data

County pages are generated from `@nickgraffis/us-counties` in `src/data/counties.ts`. Add county-specific content, links, calendars, feeds, and custom blocks through the `countyOverrides` map using keys like `texas/potter`.

## Forms

Contact and event submission forms use EmailJS. Set:

- `VITE_EMAILJS_SERVICE_ID`
- `VITE_EMAILJS_TEMPLATE_ID`
- `VITE_EMAILJS_PUBLIC_KEY`

The EmailJS template receives `title`, `name`, `email`, `reply_to`, `to_email`, `county_name`, `county_slug`, `state_name`, `state_slug`, `message`, `page_url`, and `submitted_at`.

## Analytics

Google Tag Manager is loaded in production builds with container `GTM-KDNSLKZ7`. SPA page views are pushed to `dataLayer` on route changes, and sponsor click/impression events are pushed as custom events.

Optional environment variables:

- `VITE_GTM_ID` overrides the default GTM container ID.
- `VITE_GTM_ENABLE_LOCAL=true` enables GTM during local development.

## Feeds

County and state stories come from the shared `county-post-news-api`. Set `VITE_NEWS_API_URL` in the frontend environment and in Amplify. See [deployment and validation](docs/deployment.md) for topic mapping, caching, CORS and the nationwide audit. The app no longer fetches Google News or Census market lookups for county/state news.

Vimeo still uses the separate first-party `/api/rss-feed` route. Calendar and optional authenticated Vimeo routes use `VITE_API_BASE_URL`; that variable must point to a deployment of this project's API functions, not the County Post news service.

## Mighty Networks proxy API

County community feeds and calendars are fetched through a separate Mighty Networks proxy API. The browser must only receive the proxy URL; `MIGHTY_API_KEY` and `MIGHTY_NETWORK_ID` belong exclusively in the proxy service's environment.

Set this public build-time variable in both the local frontend `.env` and AWS Amplify:

```bash
VITE_MIGHTY_API_BASE=https://your-mighty-api.example.com
```

The configured API must expose:

- `GET /health`
- `GET /spaces/:spaceId/feed?per_page=40`
- `GET /spaces/:spaceId/events?per_page=100`

The deployed API must return an `Access-Control-Allow-Origin` header for the Amplify site's exact origin (and any local origins used during development). A successful health check alone is not sufficient: browser requests will fail without CORS.

After changing a `VITE_` variable in Amplify, redeploy the frontend because Vite embeds these values at build time. Do not configure the obsolete `VITE_MIGHTY_PROXY` variable.

The RSS proxy accepts the Patriots in Action Vimeo RSS host as well as Google News. The optional `/api/vimeo-showcase` route uses Vimeo's authenticated API; set `PIA_VIMEO_ACCESS_TOKEN` or `VIMEO_ACCESS_TOKEN` on the API deployment before using that route.
## Candidate profile API

Candidate submissions, moderation, profile change requests, and runtime directory updates use the candidate service in the existing `mighty-api-production` stack (source: sibling `mighty-api`, `src/candidates`). Set the stack output values locally and in AWS Amplify:

```bash
VITE_CANDIDATE_API_BASE=https://your-api-id.execute-api.us-east-2.amazonaws.com/prod
VITE_CANDIDATE_COGNITO_REGION=us-east-2
VITE_CANDIDATE_COGNITO_CLIENT_ID=your-public-spa-client-id
```

- `/candidate-form` accepts a new pending profile or a request to update a published/pending profile; each public profile links here with **Request Changes**.
- `/candidate-review` requires a Cognito user in the API's `admins` group. It supports review/apply/deny for change requests, normal publication review, and searchable direct editing of all published profiles.
- See [Candidate profile change requests](docs/candidate-profile-updates.md) for user/reviewer instructions, pending-draft privacy, conflicts, tests and backend-first release guidance.
- Reviewer tokens are kept in memory rather than persistent browser storage; refreshing or leaving the isolated review page requires signing in again.
- When configured and reachable, the API's approved profiles are authoritative for the candidate directory. The checked-in candidate data remains available before API configuration and as an outage fallback.
- These two operational routes are intentionally absent from navigation and sitemap generation; browser metadata marks them `noindex`.

The API's CORS origins must include the exact frontend origin. Cognito client IDs are public identifiers, but passwords, AWS credentials, SES credentials, and API secrets must never be stored in frontend environment variables.


The files in `api/` are Vercel-style serverless functions. A plain AWS Amplify static hosting deployment will not serve those routes, so `/api/rss-feed`, `/api/calendar`, and `/api/vimeo-showcase` are unavailable unless you also deploy an API backend. For Amplify hosting, either:

- deploy the `api/` functions to a serverless host and set `VITE_API_BASE_URL` in Amplify to that backend origin, for example `https://your-api.example.com`
- or create equivalent AWS Lambda/API Gateway routes and set `VITE_API_BASE_URL` to that API Gateway/custom domain

When `VITE_API_BASE_URL` is empty, the app uses same-origin `/api/...` routes for local development and Vercel-style deployments.

## Commands

Use Node 22 from the workspace `.nvmrc`.

```bash
npm install
npm run dev
npm run lint
npm run build
```

## Project workflow skill

The maintained skill is [pia-counties-delivery](skills/pia-counties-delivery/SKILL.md). It captures the cross-repository candidate contract, shared-feed routing and release checks.
