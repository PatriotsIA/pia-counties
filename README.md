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

County news and Vimeo widgets fetch RSS on demand through the first-party `/api/rss-feed` endpoint. The endpoint validates feed hosts, merges Google News date windows, and returns cacheable JSON without exposing visitors to third-party proxy limits or browser CORS failures.

When the frontend is hosted separately from the API, set `VITE_API_BASE_URL` to the serverless API origin. This is required for a static AWS Amplify frontend:

```bash
VITE_API_BASE_URL=https://your-api.example.com
```

If no API base is configured and the same-origin endpoint is unavailable, the browser makes one RSS2JSON request per feed. This compatibility fallback is not suitable as the production architecture. AllOrigins is disabled by default because its public endpoint is unreliable and frequently blocks browser CORS requests.

Optional frontend environment variables:

- `VITE_RSS_PROVIDER_URL` overrides the compatibility RSS2JSON endpoint. It must accept `rss_url` and return RSS2JSON-compatible JSON.
- `VITE_RSS2JSON_API_KEY` adds an RSS2JSON API key to that compatibility request.
- `VITE_RSS_RAW_PROXY_URL` explicitly enables a final raw RSS proxy fallback. It must accept `url` and return RSS XML with browser CORS headers.
- `VITE_RSS_CACHE_TTL_MINUTES` controls browser cache freshness. The default is 360 minutes.

County calendar pages use `/api/calendar`, which proxies allowlisted ICS URLs from county data. Potter County has the current community calendar configured.

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
