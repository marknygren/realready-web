# realready-web — Claude Code context

Marketing + SEO site for the RealReady real-estate exam-prep app. Astro
static site, deployed to GitHub Pages at https://realready.app. Separate
git repo from the mobile app: `marknygren/realready-web`.

## When working on a state page

**Read [docs/STATE_ROLLOUT_TRACKER.md](docs/STATE_ROLLOUT_TRACKER.md)
end-to-end before touching anything.** It's the canonical, self-contained
playbook for shipping a `/states/[slug]/` page — exam-info lookup, the
4-paragraph intro template, the FAQ rules, the pre-ship verification gate
(this is where we caught CA Q7 having the wrong correct answer), and the
ship-to-both-repos step when questions get edited.

Status table at the bottom of that doc tracks which states are 🟡 pending
vs ✅ live. California is the pilot reference; copy its `src/content/states/CA.json`
as the template for any new state.

## Project structure

| path | what's there |
|---|---|
| `src/content/states/[XX].json` | Per-state content (name, exam facts, intro HTML, FAQ). One file per state. Authoring this is most of the state-rollout work. |
| `src/content/questions/[XX]-NN.json` | Question bank, **synced** from `../realready/data/questions/`. Don't edit only the web copy — see "Question fixes" below. |
| `src/pages/states/[state].astro` | Generic state-page template. Auto-generates a route for any state with a content JSON. |
| `src/lib/getStateData.ts` | Picks 20 questions per state (round-robin by category), shuffles options deterministically, filters out licensing-process questions. |
| `src/components/` | Shared chrome (MastHead, Section, AppStoreBadges, etc.) and state-page components (QuizCard, ExamFactsStrip, OtherStatesGrid, FaqAccordion). |
| `scripts/sync-questions.js` | Copies `../realready/data/questions/*.json` into `src/content/questions/`. Run `npm run sync-questions` after editing mobile-app question files. |
| `docs/PLAN.md` | Original build plan (Phase 0/1/3). Historical reference; the rollout tracker is the active doc. |

## Commands

- `npx astro build` — build the site (~1.5s). Output in `dist/`.
- `npm run sync-questions` — pull latest question JSONs from
  `../realready/data/questions/` into `src/content/questions/`.
- `git push origin main` — triggers GitHub Actions deploy to
  realready.app (~25s end-to-end).

## Verifying a deployed change

Fastly CDN sits in front of GitHub Pages, so a fresh `curl
https://realready.app/...` may serve stale content for a minute or two
after a deploy. To bypass and hit GH Pages directly:

```bash
curl -s --resolve realready.app:443:185.199.108.153 \
  https://realready.app/states/[slug]/ | grep -o '<title>[^<]*</title>'
```

The four GH Pages anycast IPs are `185.199.{108,109,110,111}.153` —
any of them works for the resolve trick.

## Question fixes — two-repo rule

The question bank is a sync from the mobile app's canonical source.
**Fixing a question in only the web's copy is not enough.** The next
sync overwrites it, the deploy regresses, and the mobile app keeps
showing the wrong answer to paying users.

Every question correction must land in BOTH:

1. `../realready/data/questions/[XX]-NN.json` (mobile app — canonical)
2. `src/content/questions/[XX]-NN.json` (web — synced copy)

They're in **different git repos**. The mobile-app source lives in
`marknygren/real-estate-app` (the outer folder); the web copy is here in
`marknygren/realready-web`. Two commits, two pushes.

See [docs/STATE_ROLLOUT_TRACKER.md](docs/STATE_ROLLOUT_TRACKER.md)
section 6b for the exact commands.

## Pre-launch noindex

The site ships with `noindex, nofollow` meta in `BaseLayout.astro` and a
`Disallow: /` robots.txt by default. **Do not flip either** until the
user explicitly says we're launching to search engines. User memory
`feedback_noindex_prelaunch` formalizes this.

## Project facts

- Custom domain: realready.app (Porkbun DNS, A records to GH Pages
  185.199.108–111.153, CNAME www → marknygren.github.io)
- GitHub Actions workflow: `.github/workflows/deploy.yml` (Node 22,
  peaceiris/actions-gh-pages@v4)
- Bundle: Astro 6 + @fontsource-variable/outfit + dm-sans (self-hosted,
  no external Google Fonts request)
- Sitemap: `@astrojs/sitemap` integration; excludes /privacy, /terms,
  /404 from sitemap.xml
