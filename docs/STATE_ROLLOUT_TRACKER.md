# State Rollout Tracker (temporary)

> **Purpose.** Track the Phase 3 fan-out of `/states/[slug]/` pages for all 50
> states + DC. **Delete this file** once every row in the status table is ✅.
>
> **Last updated:** 2026-05-27. California is live (pilot). Every other
> jurisdiction is pending. The intent is to ship one state at a time so any
> session — including one with no prior conversation context — can read this
> doc and pick up the next state.

---

## How to ship one state (read this first)

A session with no context should be able to read **just this section** and
ship the next pending state on its own.

### 0. Prereqs

- Open this project at `realready-web/` (its own git repo,
  `marknygren/realready-web`). **Not** the outer `Real Estate App/` folder.
- The question bank is already synced from the mobile app —
  `src/content/questions/[XX]-NN.json` files exist for every state. You do
  **not** need to run `npm run sync-questions`.
- The state-page template (`src/pages/states/[state].astro`) is generic.
  It auto-generates a page for any state that has both
  - a question bank (`src/content/questions/[XX]-*.json`), and
  - a per-state content file (`src/content/states/[XX].json`).

  So **shipping a new state = authoring that one JSON content file**, then
  pushing. The 20 free practice questions are picked automatically by
  `getStateData()`.

### 1. Pick the next pending state

From the table at the bottom of this file, pick the topmost 🟡 row. Mark
it 🟠 (*in progress*) in your local copy. Don't commit the tracker update
yet — wait until step 7.

### 2. Look up the official exam info (use WebSearch)

Before authoring anything, run a few web searches and capture the
**official, current** values from the state regulator's site. Don't pull
numbers from competitor prep sites — exam fees, question counts, and
time limits change, and stale numbers will undermine the page's
credibility.

**What to look up** (all required):

| value | what it is | where to find it |
|---|---|---|
| Official exam name | The full title the regulator uses on its candidate handbook | State real estate commission site, or the candidate information bulletin published by the test administrator (often PSI, Pearson VUE, or Applied Measurement Professionals) |
| Regulator name | The state agency that licenses real estate salespeople / agents | Same |
| Question count on the exam | Number of multiple-choice questions on the real test (not in our bank) | Candidate handbook / bulletin |
| Time limit | Minutes allowed | Candidate handbook |
| Passing score | Usually a percent like 70% or 75%, sometimes a raw score | Candidate handbook |
| Registration fee | Per-attempt fee in USD | Regulator fee schedule or candidate handbook |
| Exam content outline | Topic breakdown by percentage (used in the FAQ + intro P2) | Candidate handbook |

**Suggested search queries** (replace `[STATE]`):

- `[STATE] real estate salesperson exam candidate handbook`
- `[STATE] real estate commission exam information`
- `[STATE] real estate license exam PSI` (or `Pearson VUE`, or `AMP`)
- `[STATE] real estate department official site`

**Look at multiple sources** — at minimum cross-check the regulator's
own page against the test administrator's candidate handbook. If they
disagree, prefer the regulator's site. If you can't find a current
candidate handbook (some states publish PDFs with vague dates), surface
that uncertainty in the tracker note column and ask the user before
guessing.

**Record what you found** in a short scratch note for the commit
message — e.g. *"Verified examName + facts against [URL of candidate
handbook]"*. That gives the user (and a future you) a trail to audit.

### 3. Author `src/content/states/[XX].json`

Copy `src/content/states/CA.json` and adapt it using the verified values
from step 2. The schema is declared in `src/lib/getStateData.ts` (search
`interface RawStateContent`).

Required fields:

| field | source | what to fill |
|---|---|---|
| `name` | known | Full state name, e.g. `"Texas"` |
| `code` | known | Two-letter uppercase code, e.g. `"TX"` |
| `examName` | **step 2 lookup** | Verbatim from the regulator's candidate handbook, e.g. `"Texas Real Estate Sales Agent Examination"` |
| `totalQuestions` | bank count | Computed from the question bank (snippet below) |
| `examFacts.questionCount` | **step 2 lookup** | Number of questions on the **real exam**, not in the bank |
| `examFacts.timeLimitMinutes` | **step 2 lookup** | Time limit in minutes |
| `examFacts.passingScore` | **step 2 lookup** | e.g. `"70%"` |
| `examFacts.registrationFee` | **step 2 lookup** | e.g. `"$60"` |
| `examFacts.notes` | **step 2 lookup** | 1 short sentence naming the regulator and (if relevant) the test administrator |
| `intro` | written, **with statutes verified in step 2** | 4-paragraph HTML — see SEO targets below |
| `faq` | written, **with logistics from step 2** | 6–8 Q&A entries (no licensing-process Qs — see Rules) |

Count the state's questions in the bank:

```bash
cd realready-web
python3 -c "import os, json; XX='TX'; print(sum(len(json.load(open(f'src/content/questions/{f}'))['questions']) for f in os.listdir('src/content/questions') if f.startswith(f'{XX}-')))"
```

(Replace `XX='TX'` with the state you're shipping.)

**SEO targets for the intro** (4 paragraphs, in this order):

1. **P1** — what's distinctive about this state's exam. Name it, give
   question count + time limit, hook why state-specific prep matters here.
2. **P2** — 3–4 state-specific topics that show up on the exam (cite real
   statutes / agencies / disclosures — verify against the regulator's
   candidate handbook).
3. **P3** — introduce the 20 free practice questions on the page. Use the
   phrases *"real estate practice test"*, *"questions and answers"*, and
   *"practice exam"* naturally.
4. **P4** — pitch the app: full bank, progress tracking, missed-question
   mode. Repeat the state name + *"practice test"* once more.

**FAQ targets.** Each Q&A should answer something a real candidate would
Google. Suggested set:

- How many questions are on the [state] real estate exam?
- What's the passing score?
- How much does the exam cost?
- How long is the exam?
- Is the [state] real estate exam hard?
- What's on the exam? (cover sections + state-specific weighting)
- What's the best way to prepare?

**Do NOT include licensing-process FAQs** (CE hours, fingerprinting,
application form, license renewal). These are filtered from the question
side by `LICENSING_PROCESS_PATTERNS` in `getStateData.ts`; mirror that on
the FAQ side.

**HTML-entity gotcha.** Astro's `{}` interpolation escapes HTML entities,
so `&rsquo;` will render literally in copy. Use the real Unicode characters
directly in JSON strings: `'`, `—`, `&`, `"`.

### 4. Verify the 20 picked questions

The page renders exactly the 20 questions that `getStateData("XX").questions`
returns. Easiest way to see them is to build and read the generated HTML:

```bash
cd realready-web
npx astro build
# Look at the rendered quiz cards:
python3 -c "
import re, sys
html = open('dist/states/[slug]/index.html').read()  # <-- replace [slug]
for m in re.finditer(r'class=\"quiz-card__q\">([^<]+)<', html):
    print('Q:', m.group(1))
"
```

Or build and open `dist/states/[slug]/index.html` in a browser.

**For each of the 20 questions, do a web search to verify:**

1. The marked correct answer is **still legally correct** for that state.
2. The fact the *explanation* cites is still accurate (statutes get
   amended, agency names change, fees change, etc.).
3. The question is **not** about the licensing process itself (hours,
   fees, fingerprinting, application). If one slipped past the filter,
   flag it.

If a question is wrong or stale, either:

- **Fix it** in the source bank JSON
  (`src/content/questions/XX-NN.json`) and re-build. The deterministic
  shuffle keeps selection stable for unchanged questions.
- **Remove it** from the source JSON if it can't be fixed. The picker
  will pull the next available question from the same category bucket.

Keep notes of any edits in your commit message.

### 5. Build + smoke-test locally

```bash
cd realready-web
npx astro build
```

Spot-check `dist/states/[slug]/index.html`:

- `<title>` reads `Free [Name] Real Estate Practice Test | RealReady`
- Hero subhead shows the total-bank number in orange (the
  `.rr-hero__highlight` span)
- 20 quiz cards render with category badges
- FAQ section has 6–8 expandable entries
- "Studying in another state?" grid at the bottom links to the right slugs

### 6. Ship

```bash
cd realready-web
git add src/content/states/XX.json
# If you edited any source questions:
# git add src/content/questions/XX-*.json
git commit -m "feat(states): [Name] state page goes live"
git push origin main
```

The GitHub Actions deploy takes ~25–30 seconds. Verify live:

```bash
# Bypass Fastly CDN for the freshest copy
curl -s --resolve realready.app:443:185.199.108.153 \
  https://realready.app/states/[slug]/ | grep -o '<title>[^<]*</title>'
```

### 7. Update this tracker

In the status table at the bottom of this file:

- Change the row's status emoji from 🟡 (or 🟠) to ✅
- Add a short note in the rightmost column, e.g. `shipped 2026-06-02`

Commit the tracker change in the same push (or as a follow-up commit).

---

## Rules to follow (don't break these)

1. **Pre-launch noindex stays on.** Don't touch the `noindex` default in
   `src/layouts/BaseLayout.astro` or the `Disallow: /` line in
   `public/robots.txt` until the user explicitly says we're launching the
   site to search engines. (User memory `feedback_noindex_prelaunch`.)
2. **No licensing-process questions.** The filter is in `getStateData.ts`
   (`LICENSING_PROCESS_PATTERNS`). Don't author FAQ entries about CE
   hours, pre-license hours, fingerprinting, application fees, or license
   renewal either.
3. **`examName` and every `examFacts` field must come from step 2's
   regulator lookup.** Not from competitor prep sites, not from memory,
   not from another state. If you can't find a current candidate
   handbook, surface that to the user — don't guess.
4. **One commit per state ship.** Scope each commit to a single state so
   we can revert cleanly if a question turns out to be wrong post-launch.
   Include a one-line "Verified against [source URL]" trailer in the
   commit body so audits are easy.
5. **Don't create commits without explicit user approval** in normal work
   — but state-ship commits are pre-authorized by this tracker as long as
   the steps above are followed.

---

## Status

Legend: 🟡 pending · 🟠 in progress · ✅ live

| # | Code | Jurisdiction | Bank size | Status | Notes |
|---|---|---|---|---|---|
| 1 | AL | Alabama | 205 | 🟡 | |
| 2 | AK | Alaska | 180 | 🟡 | |
| 3 | AZ | Arizona | 260 | 🟡 | |
| 4 | AR | Arkansas | 210 | 🟡 | |
| 5 | CA | California | 260 | ✅ | shipped 2026-05-25, Phase 1 pilot |
| 6 | CO | Colorado | 265 | 🟡 | |
| 7 | CT | Connecticut | 210 | 🟡 | |
| 8 | DE | Delaware | 195 | 🟡 | |
| 9 | DC | District of Columbia | 195 | 🟡 | |
| 10 | FL | Florida | 205 | 🟡 | |
| 11 | GA | Georgia | 260 | 🟡 | |
| 12 | HI | Hawaii | 210 | 🟡 | |
| 13 | ID | Idaho | 225 | 🟡 | |
| 14 | IL | Illinois | 225 | 🟡 | |
| 15 | IN | Indiana | 215 | 🟡 | |
| 16 | IA | Iowa | 200 | 🟡 | |
| 17 | KS | Kansas | 210 | 🟡 | |
| 18 | KY | Kentucky | 215 | 🟡 | |
| 19 | LA | Louisiana | 250 | 🟡 | |
| 20 | ME | Maine | 210 | 🟡 | |
| 21 | MD | Maryland | 225 | 🟡 | |
| 22 | MA | Massachusetts | 230 | 🟡 | |
| 23 | MI | Michigan | 205 | 🟡 | |
| 24 | MN | Minnesota | 245 | 🟡 | |
| 25 | MS | Mississippi | 185 | 🟡 | |
| 26 | MO | Missouri | 210 | 🟡 | |
| 27 | MT | Montana | 230 | 🟡 | |
| 28 | NE | Nebraska | 205 | 🟡 | |
| 29 | NV | Nevada | 185 | 🟡 | |
| 30 | NH | New Hampshire | 210 | 🟡 | |
| 31 | NJ | New Jersey | 290 | 🟡 | |
| 32 | NM | New Mexico | 205 | 🟡 | |
| 33 | NY | New York | 260 | 🟡 | |
| 34 | NC | North Carolina | 255 | 🟡 | |
| 35 | ND | North Dakota | 200 | 🟡 | |
| 36 | OH | Ohio | 260 | 🟡 | |
| 37 | OK | Oklahoma | 220 | 🟡 | |
| 38 | OR | Oregon | 255 | 🟡 | |
| 39 | PA | Pennsylvania | 255 | 🟡 | |
| 40 | RI | Rhode Island | 165 | 🟡 | |
| 41 | SC | South Carolina | 221 | 🟡 | |
| 42 | SD | South Dakota | 120 | 🟡 | smallest bank — still ≥ 20, but verify carefully |
| 43 | TN | Tennessee | 240 | 🟡 | |
| 44 | TX | Texas | 185 | 🟡 | |
| 45 | UT | Utah | 215 | 🟡 | |
| 46 | VT | Vermont | 220 | 🟡 | |
| 47 | VA | Virginia | 250 | 🟡 | |
| 48 | WA | Washington | 230 | 🟡 | |
| 49 | WV | West Virginia | 195 | 🟡 | |
| 50 | WI | Wisconsin | 261 | 🟡 | |
| 51 | WY | Wyoming | 190 | 🟡 | |

**Progress: 1 / 51 live.**
