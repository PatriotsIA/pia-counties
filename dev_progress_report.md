# PIA Counties — Development Progress Report

**Generated:** June 18, 2026  
**Repository:** `pia-counties`  
**Branches covered:** `main`, `advertiser-preview`

---

## Executive summary

The project has **diverged into two parallel tracks** since a shared base commit on **June 1, 2026** (`e1e3733` — initial PaymentsPage work).

| Branch | Role | Latest commit | Status |
| --- | --- | --- | --- |
| **`main`** | Production / civic platform | `901839a` (Jun 10, 2026) | In sync with `origin/main`. Candidate directory and community features are ahead. Payments and advertiser preview are **not** on this branch. |
| **`advertiser-preview`** | Sales / sponsorship preview deployment | `400279c` (Jun 16, 2026) | In sync with `origin/advertiser-preview`. Payments page, pricing preview mode, and sponsorship tooling are ahead. Candidate data and recent main UI work are **behind** `main`. |

**Key gap:** Neither branch currently contains the full feature set. Merging `advertiser-preview` into `main` (or rebasing preview onto `main`) is the logical next step before launching `/payments` and live pricing previews in production.

---

## `main` branch

**HEAD:** `901839a` — *Update sitemap.xml lastmod dates and add new candidate Dr. Brooks McKenzie to candidates data*  
**Tracking:** `origin/main` (up to date)

### Focus since divergence (8 commits, Jun 3–10)

Production work has prioritized the **candidate directory**, **community promotion**, and **layout polish**. Notably, the payments page added in early June was **removed** on Jun 3 (`d24d516`) so sponsorship checkout stays on the preview branch until ready.

### Shipped / active features

- **County civic hub** — Nationwide county sites from `@nickgraffis/us-counties` with overrides, weather, news RSS, events/calendar, PIA TV (Vimeo proxy), partners, contact forms (EmailJS).
- **Candidate directory** — State and county candidate listings, filters, pinned candidates, individual profile pages (`/candidates/:candidateId`, `/:stateSlug/candidates`). **~57 candidates** in `src/data/candidates.ts`.
- **Candidate directory sponsorship UI** — `CandidateDirectorySponsors` and `CandidateDirectoryEmptyBanner` components for sponsor placement around candidate listings.
- **Patriot Network community banner** — `PatriotNetworkCommunityBanner` on directory, state, county elections, and related pages.
- **Ad / sponsor system (live creatives)** — `AdSlot.tsx` drives sponsor carousels, banners, and inline placements across county pages. Creative assets in `ads/` and `NewAds/`.
- **Analytics & SEO** — Google Tag Manager, sponsor click/impression events, automated sitemap generation (`npm run generate:seo`), meta/SEO on route changes.
- **UX polish** — County bookmark toast, market/weather top ticker, directory search, state flags, hero messaging updates, responsive layout improvements.

### Routes (production)

| Path | Available on `main` |
| --- | --- |
| `/`, `/counties`, `/partners`, `/contact`, `/tv`, `/rewards`, `/privacy`, `/terms` | Yes |
| `/payments` | **No** (removed Jun 3) |
| `/:state/:county/*` county pages | Yes |
| `/candidates/:candidateId`, `/:stateSlug/candidates` | Yes |

### Documentation & assets on `main`

- `README.md` — Basic setup (73 lines); routes, EmailJS, feeds, analytics.
- `AD_PRICING_AND_SPONSORSHIP_PLAN.md` — Sales/pricing reference.
- `AD_SYSTEM_PLAN.md` — Canonical ad system documentation (212 lines; **not** on `advertiser-preview`).
- `Patriots_in_Action_Ad_Pricing_and_Sponsorship_Plan.pdf` — Internal PDF reference.

### Not on `main` ( lives on `advertiser-preview` )

- `/payments` page and Stripe subscription checkout UI
- `src/data/ad-pricing.ts` centralized pricing + Stripe Payment Links
- `AdPreviewPlaceholder` / advertiser preview mode (`ADVERTISER_PREVIEW_ENABLED`)
- Payment-specific components (`PaymentsSubscriptionTable`, `PaymentsPricingContent`, etc.)
- Mobile-responsive stacked payment table cards
- Expanded README with payments documentation

### Recent commit timeline

| Date | Summary |
| --- | --- |
| Jun 10 | Added candidate Dr. Brooks McKenzie; sitemap refresh |
| Jun 9 | Candidate data cleanup (Drinda Randall image); expanded candidate features |
| Jun 5 | Ad layout/responsiveness improvements |
| Jun 3 | **Removed PaymentsPage**; added candidate directory sponsors + Patriot Network banner |
| May 12–Jun 1 | Candidate directory, RSS, analytics, SEO, contact forms, API proxies |

### Build & deploy

```bash
npm install
npm run dev
npm run lint
npm run build   # runs generate:seo + tsc + vite build
```

Node 22 (`.nvmrc`). No GitHub Actions CI config in repo. API routes in `api/` require Vercel-style hosting or `VITE_API_BASE_URL` for Amplify.

---

## `advertiser-preview` branch

**HEAD:** `400279c` — *Update adjacent county pricing details and enhance related components*  
**Tracking:** `origin/advertiser-preview` (up to date)

### Focus since divergence (7 commits, Jun 1–16)

Preview-branch work builds a **sales-ready sponsorship experience**: live pricing overlays on ad slots, a full partner payments page with Stripe links, and polished mobile payment UX.

### Shipped / active features

Everything from the **Jun 1 shared base** (core county app, initial PaymentsPage), plus:

- **Advertiser preview mode** — `src/config/advertiser-preview.ts` with `ADVERTISER_PREVIEW_ENABLED = true`. When enabled, `AdPreviewPlaceholder` shows tier/pricing context on live ad placements for sales demos.
- **`/payments` page** — Patriot Partner Payments with:
  - Subscription table (Patriot Preferred, Gold, Platinum, County Gold Founding, County Platinum, County Sponsor)
  - Stripe Payment Links for monthly/yearly checkout where configured
  - Quote-only tiers linking to contact form
- **Pricing content** — Brochure tiers, national homepage placements, county packages, placement inventory, discounts/add-ons, placement-to-tier guide.
- **Multi-county add-ons** — Adjacent/contiguous neighboring county pricing at **50% of base tier**; dedicated add-on table and clearer copy in county packages section.
- **Centralized pricing data** — `src/data/ad-pricing.ts` (~544 lines): tiers, packages, Stripe URLs, placement pricing, adjacent county rates.
- **Mobile-responsive payments tables** — Card/stacked layout on screens ≤780px so subscribe buttons are visible without horizontal scrolling.
- **Pricing corrections** — County Gold Partner package updated to **$295/mo · $2,950/yr** (matching Gold Business Partner; founding tier remains at $95/mo).
- **Component library** — `PaymentsSubscriptionTable`, `PaymentsPricingContent`, `PaymentsAdjacentCountyAddOns`, `PaymentsQuoteLink`, `AdAssetDeliveryNotice`, `AdPreviewPlaceholder`.
- **Expanded README** — ~198 lines documenting routes, project structure, payments tiers, and preview deployment.

### Routes (preview)

| Path | Available on `advertiser-preview` |
| --- | --- |
| `/payments` | **Yes** |
| All standard civic routes | Yes |
| Candidate routes | Yes (data **behind** `main`) |

### Documentation on `advertiser-preview`

- `AD_PRICING_AND_SPONSORSHIP_PLAN.md` — Updated (78-line delta vs `main`).
- `README.md` — Expanded with payments and preview deployment notes.
- **Missing vs `main`:** `AD_SYSTEM_PLAN.md`, sponsorship PDF.

### Behind `main` (not yet merged)

- **Candidate data** — ~48 candidates vs ~57 on `main` (missing recent additions such as Dr. Brooks McKenzie and Jun 9 data fixes).
- **Candidate directory sponsors** — `CandidateDirectorySponsors`, `CandidateDirectoryEmptyBanner` not present.
- **Patriot Network community banner** — Not on preview branch.
- **Recent ad layout/responsiveness work** from `c814a4e` (Jun 5).
- **`AD_SYSTEM_PLAN.md`** and pricing PDF.

### Recent commit timeline

| Date | Summary |
| --- | --- |
| Jun 16 | Adjacent county pricing copy + component updates; County Gold pricing fix |
| Jun 15 | Mobile payment table card layout; sitemap refresh |
| Jun 5 | Patriot Preferred pricing updates |
| Jun 4 | Payments functionality expansion; README updates; ad pricing spec doc |
| Jun 1 | Advertiser preview features on live ad components; PaymentsPage |

### Preview deployment note

`advertiser-preview.ts` includes an explicit comment: **set `ADVERTISER_PREVIEW_ENABLED` to `false` before merging to `main`.**

---

## Branch comparison

```
                    e1e3733  (Jun 1 — shared: PaymentsPage added)
                   /         \
                  /           \
         main (8 commits)   advertiser-preview (7 commits)
              |                      |
         901839a                 400279c
    (candidates, banner,      (payments, preview,
     no /payments)             pricing, mobile UX)
```

| Area | `main` | `advertiser-preview` |
| --- | --- | --- |
| Candidate directory | **Ahead** (~57 candidates, sponsors UI) | Behind (~48 candidates) |
| `/payments` + Stripe | Removed | **Complete** |
| Advertiser preview overlays | No | **Enabled** |
| Mobile payment tables | N/A | **Done** |
| County Gold package pricing | N/A | **Corrected ($295)** |
| Multi-county half-off messaging | N/A | **Clarified** |
| `AD_SYSTEM_PLAN.md` | **Present** | Absent |
| README depth | Basic | **Expanded** |

Approximate diff size: **36 files**, ~30k insertions / ~29k deletions between branch tips (large sitemap churn included).

---

## Other branches (reference)

| Branch | Notes |
| --- | --- |
| `staging` | Remote only; purpose not documented in repo |
| `playwright-video` | Local + remote; likely video/automation experiments |
| `site-tour-videos` | Local branch; site tour work |

---

## Recommended next steps

1. **Rebase or merge `main` → `advertiser-preview`** to pick up candidate directory, Patriot Network banner, and latest candidate data before further preview work.
2. **QA `/payments` on mobile and desktop** on the preview deployment; verify Stripe links for all checkout-enabled tiers.
3. **Merge `advertiser-preview` → `main`** when ready for production:
   - Set `ADVERTISER_PREVIEW_ENABLED = false` (or gate by environment).
   - Restore/sync `AD_SYSTEM_PLAN.md` and candidate assets.
   - Resolve `ads/` vs `NewAds/` asset path differences.
4. **Deploy preview branch** to a staging URL for sales team review before enabling `/payments` on patriotsinaction.com.

---

## Commands to inspect branches locally

```bash
git checkout main
git log --oneline -10

git checkout advertiser-preview
git log --oneline -10

git log main..advertiser-preview --oneline   # commits only on preview
git log advertiser-preview..main --oneline   # commits only on main
git diff main advertiser-preview --stat
```
