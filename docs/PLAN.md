# realready.app — Marketing & SEO Site Plan

> Status: design approved, not yet built. Build happens in a new session.
> Owner: Mark Nygren · Date: 2026-05-25

---

## 1. Why we're building this

RealReady is live on iOS and Android with a $17.99 one-time IAP. The economics of paid acquisition are tough at that price point — after store fees we net ~$15 per sale, so any paid channel needs to convert under that to break even. There is no subscription/LTV tail to bail us out.

**Organic search is the right channel.** Search demand for state-specific real estate exam prep is substantial (estimated 80K–150K monthly US searches across the top state-specific queries), the intent is high (searchers are days-to-weeks from a paid exam), and traffic costs nothing once we rank. The site is the long-term acquisition engine.

**The SEO asset we already have:** 12,057 state-specific practice questions across 50 states + DC, each with a full explanation, organized by category, sitting in JSON files at `realready/data/questions/`. Every question is essentially a high-intent SEO landing-content unit waiting to be exposed to Google.

**Goal of this site:**
- Build 52 state-targeted landing pages, each with ~20 free practice questions plus original intro content, ranking for `"[state] real estate practice test"` and adjacent long-tail queries.
- Funnel visitors to the App Store / Google Play store listings.
- Establish realready.app as the topical authority for real estate exam prep on the open web.

**What success looks like (12-month horizon):**
- Indexed and ranking on page 1–2 for top state long-tail queries
- 3K–15K visits/day at steady state, growing
- Net acquisition cost per app install via this channel: $0
- ~30–60 installs/day from search → ~2–9 sales/day → $900–4K/month at modest traffic; meaningfully higher as rankings mature

---

## 2. How it works (architecture)

```
┌─────────────────────────────────────────────────────────────┐
│  realready/data/questions/*.json  (existing 794 files)      │
│  Source of truth for questions. Shared with mobile app.     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ build-time read
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  realready-web/  (new, sibling folder to realready/)        │
│                                                             │
│  Astro project, static-only output.                         │
│                                                             │
│   src/                                                      │
│     pages/                                                  │
│       index.astro          → /                              │
│       states/index.astro   → /states                        │
│       states/[state].astro → /states/california, etc.       │
│       faq.astro            → /faq                           │
│       privacy.astro, terms.astro                            │
│     components/                                             │
│       Hero.astro, FeatureGrid.astro, QuizCard.astro,        │
│       FaqAccordion.astro, AppStoreBadges.astro, etc.        │
│     content/                                                │
│       states/CA.json, TX.json, ... (per-state intro,        │
│         exam facts, custom FAQ entries)                     │
│     lib/                                                    │
│       getStateData.ts (reads question JSONs, picks 20)      │
│     styles/                                                 │
│       global.css (port of existing nextchapterapps style)   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ npm run build → produces dist/
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions workflow (.github/workflows/deploy.yml)     │
│  → publishes dist/ to gh-pages branch on push to main       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  GitHub Pages serves the gh-pages branch                    │
│  Porkbun DNS: CNAME realready.app → <user>.github.io        │
│  HTTPS enforced (required for .app TLD via HSTS preload)    │
└─────────────────────────────────────────────────────────────┘
```

**Content pipeline.** The website lives in its own git repo, but reads question JSONs from the mobile app repo. A `scripts/sync-questions.js` script copies the JSONs from `../realready/data/questions/` (sibling folder, same workspace) into `src/content/questions/` in the website repo. The synced JSONs are committed to the website repo so deploys are self-contained and reproducible. You run `npm run sync-questions` before `git push` whenever questions change in the mobile app — questions don't change often, so this is low-friction.

At build time, a deterministic function picks 20 questions per state by round-robin across category files — one question from each `[STATE]-01.json`, `[STATE]-02.json`, ... cycling back to file 1 until we hit 20. This guarantees a balanced selection across categories rather than all 20 coming from one topic. This means:

- The mobile app repo is the canonical source for question content; the website repo is the consumer.
- Per-state intros, exam facts, and custom FAQ entries live in `src/content/states/[STATE].json` in the website repo — these are website-only content authored once.

**Deploy workflow.** Push to `main` triggers a GitHub Actions job that runs `npm run build` and pushes the `dist/` folder to the `gh-pages` branch. GitHub Pages serves `gh-pages` as the live site. Domain is wired up via a `CNAME` record at Porkbun pointing `realready.app` at `<github-username>.github.io`.

---

## 3. Decisions locked in

| Decision | Value | Why |
|---|---|---|
| Domain | `realready.app` (already purchased at Porkbun) | Topical authority, brand-matching |
| Tech stack | **Astro** (static output) | Best long-term fit for content/marketing site, near-zero JS by default, easy to grow into a blog |
| Hosting | **GitHub Pages** | User is already familiar with it; free; sufficient for our traffic |
| Free questions per state | **20** | ~9% of median state's bank — strong SEO depth, app keeps 90%+ of state content |
| Site scope | **Marketing site only**, funnels to app stores | Keeps things simple; no web app integration; no auth/IAP on web |
| Build phasing | **1 pilot state first** (California), get the template right, then fan out to remaining 51 | Lowest risk; locks template before duplication |
| Question UI | **Click-to-reveal** answers (HTML `<details>` element) | Google fully indexes hidden answer content; engagement boost; minimal JS |
| Email capture | **None in v1** | Phase-2 decision after we see real traffic |
| Existing site | The current `nextchapterapps.com/realready/` page is **superseded** by this build (we may eventually retire that page or redirect it) | One canonical RealReady site, owned by the brand |

---

## 4. Reusing the existing site

The user already built a polished landing page at `nextchapterapps.com/realready/`. The design system is mature and should be reused.

**Source location (read-only reference):**
- HTML: `/Users/nygren/Next Chapter LLC/nextchapterapps.com/realready/index.html`
- CSS: `/Users/nygren/Next Chapter LLC/nextchapterapps.com/style.css` (1825 lines)
- Notify modal JS: `/Users/nygren/Next Chapter LLC/nextchapterapps.com/realready/notify.js` (will not be reused; app is live)
- Privacy/Terms: `/Users/nygren/Next Chapter LLC/nextchapterapps.com/realready/privacy/index.html`, `.../terms/index.html`
- App screenshots already hosted: `https://nextchapterapps.com/realready/images/{hero-home,step-state,step-practice,step-article}.png` (these can be served from nextchapterapps.com or copied into the new site)

**Design system to inherit verbatim:**
- Page background: warm off-white `#f5f5f0`
- RealReady palette (scoped `.rr-*` classes): navy `#023047`, teal `#219ebc`, orange `#ffb703`, accent dark `#fb8500`
- Fonts: **Outfit** (display, Google Fonts) + **DM Sans** (body, Google Fonts) — *not* the system fonts that `WEBSITE_BRIEF.md` claims. The actual implementation uses Google Fonts; we follow the implementation.
- Type scale, spacing rhythm, button styles, card styles, hero halo gradients, phone mockup styling, FAQ accordion styling, "rise" entrance animation — all carry over.

**Components to port from the existing HTML (mostly 1:1):**
- `.rr-hero` (dark navy band, phone mockup, halo gradients) → `Hero.astro`
- 3-value-prop section ("Made for your exam") → `ValueProps.astro`
- 6-feature card grid ("Built around how you actually study") → `FeatureGrid.astro`
- 3-step "How it works" → `HowItWorks.astro`
- FAQ accordion → `FaqAccordion.astro` (data-driven so state pages can have their own FAQ items)
- `.rr-section--warm/--cool/--dark` band variants → `Section.astro` wrapper
- Closing CTA band → `ClosingCta.astro`

**What we keep but update:**
- Privacy + Terms pages: copy verbatim, update URLs and contact references for realready.app.

**What we remove / replace:**
| Remove | Replace with |
|---|---|
| `noindex, nofollow` meta tag | Indexable site, sitemap, robots.txt allowing crawlers |
| "Join the waitlist" button + Supabase notify modal | App Store + Play Store badges linking to live store listings |
| Hero subhead referencing pre-launch | Hero subhead suited to live app (e.g., "Free practice for all 50 states. Get the app for the full state-specific question bank.") |
| Hero platform caption ("Built for iPhone, iPad, Android, and the web") | "Now on iPhone, iPad, and Android" (web mention can be cut since the SEO site itself is the web presence) |
| Top nav: "Next Chapter Education" wordmark + Home/RealReady/Privacy/Terms/Support | RealReady wordmark (no parent brand) + Features/How it works/States/FAQ + primary CTA |

---

## 5. Page structure

**Total routes: 57**
- `/` — homepage
- `/states/` — index of all 51 states + DC, with practice-question count and a "start here" CTA
- `/states/[state]/` — **52 state-specific pages** (the SEO engine; one per state plus DC)
- `/faq/` — global FAQ (reuses the existing site's 6-question FAQ as a starting point, expanded with shipping-related questions like "Is RealReady on iOS?" "How much does it cost?")
- `/privacy/`, `/terms/` — legal (port from existing)
- `/404/` — not-found page

**URL convention:** state pages use the full state name in lowercase with hyphens (`/states/california/`, `/states/new-york/`, `/states/district-of-columbia/`). This is the SEO-friendly form. The two-letter state code (CA, NY, DC) is used internally for filenames and JSON lookups.

---

## 6. State page anatomy

This is the SEO engine. Each state page follows this structure (California shown as the pilot):

```
┌──────────────────────────────────────────────────────────┐
│  STICKY NAV                                              │
│  RealReady  ·  Features  ·  How  ·  States  ·  FAQ       │
│                                       [Get the App ↗]    │
├──────────────────────────────────────────────────────────┤
│  HERO (rr-section--dark, navy background)                │
│  Eyebrow: California · Real estate exam prep             │
│  H1: California Real Estate Practice Questions (Free)    │
│  Subhead: Free practice questions for the California     │
│           salesperson exam. Honest feedback. State-      │
│           targeted content. Pass with confidence.        │
│  CTAs:                                                    │
│    [Get the App — Free] (accent orange)                  │
│    [Jump to practice questions ↓] (ghost)                │
├──────────────────────────────────────────────────────────┤
│  EXAM FACTS STRIP (rr-section--cool, light band)         │
│  ┌────────┬────────┬────────┬─────────────┐               │
│  │ 150 Qs │ 3h 15m │ 70%    │ $60 fee     │               │
│  │ on the │ time   │ to pass│ to register │               │
│  │ exam   │ limit  │        │             │               │
│  └────────┴────────┴────────┴─────────────┘               │
│  (Pulled per state from content/states/CA.json)          │
├──────────────────────────────────────────────────────────┤
│  INTRO (rr-section--warm, 150-250 words, original per    │
│  state — written by us, not LLM-spammed)                 │
│  • What's covered on the CA exam                          │
│  • Why state-specific prep matters                        │
│  • How to use this page                                   │
├──────────────────────────────────────────────────────────┤
│  20 PRACTICE QUESTIONS (the core SEO content)            │
│  Section header: "Try 20 free California questions"      │
│  Filter chips: [All] [Licensing] [Contracts] [Math] ...  │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Q1 of 20 · Licensing                                │  │
│  │                                                     │  │
│  │ The California Department of Real Estate           │  │
│  │ operates under which state agency?                  │  │
│  │                                                     │  │
│  │   A) Business, Consumer Services, and Housing      │  │
│  │   B) Department of Consumer Affairs                 │  │
│  │   C) California Department of Finance               │  │
│  │   D) Office of the Attorney General                 │  │
│  │                                                     │  │
│  │   <details>Show answer & explanation               │  │
│  │     Correct: A. The DRE operates under the         │  │
│  │     Business, Consumer Services, and Housing       │  │
│  │     Agency. This placement reflects its dual role  │  │
│  │     overseeing both consumer protection and        │  │
│  │     housing-related licensing.                     │  │
│  │   </details>                                        │  │
│  └────────────────────────────────────────────────────┘  │
│  (×20 questions total, each wrapped in JSON-LD Question  │
│   schema for Google rich-result eligibility)             │
├──────────────────────────────────────────────────────────┤
│  CTA BAND (rr-section--dark with accent orange button)   │
│  H2: Want the rest of California's question bank?         │
│  Body: 200+ more California-specific questions, progress │
│        tracking, and missed-question mode are inside the │
│        app.                                              │
│  [Download on the App Store] [Get it on Google Play]     │
├──────────────────────────────────────────────────────────┤
│  STATE-SPECIFIC FAQ (rr-section--warm, 3-5 Qs)           │
│  Schema-marked FAQPage JSON-LD.                          │
│  Examples:                                                │
│    • How many questions are on the California exam?      │
│    • What's the passing score for the CA real estate    │
│      exam?                                                │
│    • How much does the California real estate license    │
│      exam cost?                                          │
│    • How long is the CA real estate exam?                │
│  (Pulled per state from content/states/CA.json)          │
├──────────────────────────────────────────────────────────┤
│  OTHER STATES (rr-section--cool, internal linking band)  │
│  H3: Studying in another state? RealReady covers all 50. │
│  [Grid of 51 other state links — small chips]            │
├──────────────────────────────────────────────────────────┤
│  FOOTER (deep navy)                                      │
│    [App Store badge]  [Google Play badge]                │
│    Privacy · Terms · Contact · States                    │
│    © 2026 RealReady. Made by Next Chapter Education LLC. │
│    "Not affiliated with any state real estate commission"│
└──────────────────────────────────────────────────────────┘
```

**Per-state content authored once** (lives in `src/content/states/[STATE].json`):
```json
{
  "name": "California",
  "code": "CA",
  "examFacts": {
    "questionCount": 150,
    "timeLimitMinutes": 195,
    "passingScore": "70%",
    "registrationFee": "$60"
  },
  "intro": "California's real estate salesperson exam is one of the toughest in the country...",
  "faq": [
    { "q": "How many questions on the California exam?", "a": "..." },
    { "q": "What's the passing score?", "a": "..." }
  ]
}
```

**Per-state content pulled from the question JSON** (lives in `realready/data/questions/CA-*.json`):
- 20 questions, picked deterministically (e.g., round-robin across category files until we have 20)
- Each question has `question_text`, `correct_answer`, `distractors[]`, `explanation`, `tags[]`

**SEO essentials embedded on each state page:**
- `<title>` = `California Real Estate Practice Questions — Free Practice Test | RealReady`
- `<meta name="description">` = the hero subhead
- One `<h1>` matching the page topic
- JSON-LD `Question` schema for each of the 20 questions (Google may surface as rich results)
- JSON-LD `FAQPage` schema for the state-specific FAQ
- Open Graph tags for social sharing (title, description, og:image — a state-specific composite or a generic RealReady hero)
- Canonical URL: `https://realready.app/states/california/`
- Internal links to other state pages (footer band) for crawl depth

---

## 7. Build phasing

### Phase 0 — Setup (~half day)

- Initialize Astro project in `realready-web/`
- Init a new git repo inside `realready-web/` (separate from the outer Real Estate App repo)
- Add `realready-web/` to the outer repo's `.gitignore` so the two repos don't conflict
- Create the GitHub remote: new dedicated repo at `marknygren/realready-web` (or similar)
- Copy `style.css` from `nextchapterapps.com/style.css` into `src/styles/global.css`
- Set up Google Fonts (Outfit + DM Sans) via Astro layout
- Write `scripts/sync-questions.js` to copy JSONs from `../realready/data/questions/` to `src/content/questions/`. Run it once to seed the data; commit the synced JSONs to the website repo.
- Wire up GitHub Actions deploy workflow targeting `gh-pages` branch
- Add `realready-web/.github/workflows/deploy.yml` that builds and publishes on push to `main`
- Configure GitHub Pages settings: source = `gh-pages` branch, custom domain = `realready.app`, enforce HTTPS
- Add a `CNAME` file containing `realready.app` to the build output so GH Pages serves the domain
- Set DNS at Porkbun: CNAME `realready.app` → `<github-username>.github.io` (and `www.realready.app` → same, with a redirect to apex)

### Phase 1 — Pilot state (California) (~1 day)

- Build the homepage, porting the existing nextchapterapps RealReady page structure (hero, value props, features, how-it-works, FAQ, footer) — but updated to:
  - Remove `noindex,nofollow`
  - Replace waitlist modal with App Store + Play Store badges
  - Update hero subhead to reflect that the app is live
- Build the `states/[state].astro` template
- Wire up `lib/getStateData.ts` to read question JSONs and pick 20 questions per state
- Build the `QuizCard.astro` click-to-reveal component
- Write California's `src/content/states/CA.json` (intro, exam facts, 3–5 FAQ entries)
- Add JSON-LD schema for Question and FAQPage
- Sitemap + robots.txt
- Deploy to live realready.app
- Submit to Google Search Console (verify ownership, submit sitemap)

### Phase 2 — Review gate (user time, hours)

- User reviews California page on phone + desktop
- We iterate on anything that doesn't feel right: copy, layout, schema, internal linking
- **No fan-out until the user signs off on California as the template.**

### Phase 3 — Scale to remaining 51 states (~1–2 days)

- Batch-author per-state intro paragraphs (with LLM assistance + user review, not pure AI slop — every state intro should be original and accurate)
- Batch-author per-state exam facts (sourced from each state's real estate commission website; this is real research, not invention)
- Batch-author state-specific FAQ entries per state (3–5 per state, all anchored in real facts)
- Generate all 51 `src/content/states/[STATE].json` files
- All 52 pages auto-generated by Astro from the locked template
- Submit updated sitemap to Search Console
- Done

### Phase 4 — Post-launch (deferred, weeks–months)

Not in scope for the initial build, but to keep in mind:
- Monitor Search Console for indexing issues, fix any
- Set up basic analytics (Plausible or Cloudflare Web Analytics — privacy-respecting, no cookie banner needed)
- Backlink outreach (real estate schools, state-specific subreddits)
- Blog content (huge SEO multiplier; Astro supports Markdown natively)
- A/B test CTA placement / copy once we have traffic
- Email capture for non-converters (newsletter, free PDF study guide)

---

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| **Cannibalization of IAP sales** — people study free questions and never buy | Hold 20-question cap. The app's value is progress tracking, missed-question mode, full state bank — not just "more questions." |
| **Duplicate-content concerns from Google** if app + web ever both expose the same questions on the open web | The mobile app's questions are not crawlable (they live inside a native binary). Web is the only place these questions appear publicly. Not a duplicate-content issue. |
| **AI-spam state intros lowering quality scores** | Write originals (or heavily edit LLM drafts). Every state intro should reference real exam structure for that state. Google ranks for E-E-A-T; quality matters. |
| **`.app` TLD HSTS requirement** | Enforce HTTPS in GH Pages settings (one click). Verify both `realready.app` and `www.realready.app` resolve correctly with HTTPS before launch. |
| **Slow SEO ramp** (60–90 days minimum before meaningful rankings) | Set expectations. This is a long game. No optimization based on first 30 days of data — too noisy. |
| **Question JSON edits in the app break the website build** | The build script should fail loudly if any state has <20 questions or malformed JSON. Catches issues early. |
| **Static images of app screenshots get stale when the app UI changes** | Host screenshot URLs at `nextchapterapps.com` (current location) initially; eventually copy into the new repo and update via a screenshot-refresh script in `realready/scripts/`. |

---

## 9. Open questions to revisit during build

These are not blockers for starting, but should be answered as we build:

1. ~~**GitHub repo location.**~~ **DECIDED: new standalone repo** named `realready-web` (or similar). The folder stays at `Real Estate App/realready-web/` on disk, but is its own git repo with its own GitHub remote. The outer `real-estate-app` repo gitignores `realready-web/` so they don't conflict. Question JSONs are synced from the mobile app repo via `scripts/sync-questions.js` (reads `../realready/data/questions/`, writes to `src/content/questions/`). Synced JSONs are committed to the website repo so deploys are self-contained.
2. **State URL slug conventions for multi-word states.** `new-york` vs `new_york` vs `newyork`? Recommendation: hyphen (SEO standard).
3. **What goes on `/states/` (the index page)?** Just a list/grid of states, or a richer "pick your state to start" page with conversion intent? Lean toward richer to capture intent from people who land there without a state in mind.
4. **Should the homepage have its own "try a sample question" callout** (pulling from the national/N question bank), or stay marketing-focused and push to state pages? Recommendation: marketing-focused, with a clear "pick your state" CTA leading to `/states/`.
5. **Analytics tool.** Plausible ($) vs Cloudflare Web Analytics (free, requires DNS through Cloudflare) vs no analytics for v1.
6. **Should we set up a `www.realready.app` → `realready.app` redirect?** Yes, but configuration depends on Porkbun + GitHub Pages limits; verify during Phase 0.
7. **Per-state exam facts sourcing.** Each state's real estate commission website has the canonical numbers. We need to pull these from official sources, not invent them. This is real research work in Phase 3.
8. **Old nextchapterapps.com/realready/ page** — leave it up, redirect it to realready.app, or take it down? Decision deferred: likely a 301 redirect to `https://realready.app/` once the new site is live and stable, but we'll handle it then.

---

## 10. References

- **Existing source material to reuse:**
  - `/Users/nygren/Next Chapter LLC/nextchapterapps.com/realready/index.html` — HTML structure baseline
  - `/Users/nygren/Next Chapter LLC/nextchapterapps.com/style.css` — design system (port verbatim)
  - `/Users/nygren/Next Chapter LLC/nextchapterapps.com/realready/privacy/index.html` — privacy page
  - `/Users/nygren/Next Chapter LLC/nextchapterapps.com/realready/terms/index.html` — terms page
- **Content source (read-only at build time):**
  - `/Users/nygren/ClaudeCode2026/Real Estate App/realready/data/questions/*.json` — 794 files, 12K+ state-specific questions
  - `/Users/nygren/ClaudeCode2026/Real Estate App/realready/data/states/*.md` — per-state outline files (may inform intro content)
  - `/Users/nygren/ClaudeCode2026/Real Estate App/State Outlines (PDF)/` — full state outline PDFs (reference only)
- **Design brief (older, partially superseded by actual implementation):**
  - `/Users/nygren/ClaudeCode2026/Real Estate App/WEBSITE_BRIEF.md`
- **Mobile app project (the funnel target):**
  - `/Users/nygren/ClaudeCode2026/Real Estate App/realready/`
  - App Store: live (CTA target)
  - Google Play: live (CTA target)

---

## 11. Next steps after this doc is approved

1. User reviews this plan
2. New session opens to begin Phase 0 (project setup)
3. Phase 1 (California pilot) ships to live realready.app
4. User reviews → iterate → fan out to remaining 51 states in Phase 3
