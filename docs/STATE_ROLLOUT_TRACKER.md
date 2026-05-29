# State Rollout Tracker (temporary)

> **Purpose.** Track the Phase 3 fan-out of `/states/[slug]/` pages for all 50
> states + DC. **Delete this file** once every row in the status table is ✅.
>
> **Last updated:** 2026-05-27. California and Alabama are live (audit-fixed).
> Every other jurisdiction is pending. The intent is to ship one state at a
> time so any session — including one with no prior conversation context —
> can read this doc and pick up the next state.
>
> **If you're a fresh Claude Code session starting work on a state:** read
> sections 0 through 7 below in order. Each step is concrete. Steps 2 and 4
> require WebSearch / WebFetch — those are the verification gates.

---

## Data layers — where each kind of edit lives

A state's content is spread across **four data layers**. Knowing which
layer to touch is the difference between "fix shipped" and "fix
silently reverted." Internalize this table before doing any work.

| # | layer | what it holds | who reads it at runtime | how to update |
|---|---|---|---|---|
| 1 | `realready-web/src/content/states/[XX].json` | Per-state web content: exam facts, intro HTML, FAQ entries | Astro build → realready.app | Edit + commit + push **web repo** (`marknygren/realready-web`) |
| 2 | `realready-web/src/content/questions/[XX]-NN.json` | Question bank, web's **synced copy** | Astro build → realready.app | Edit + commit + push **web repo**, OR run `npm run sync-questions` to overwrite from mobile-app source |
| 3 | `realready/data/questions/[XX]-NN.json` | Question bank, mobile-app **canonical source** | Seed-script input (does NOT reach the app directly) | Edit + commit + push **outer repo** (`marknygren/real-estate-app`) |
| 4 | Supabase `questions` table (production) | Question bank, **runtime data** the mobile app actually queries | iOS / Android RealReady app at every quiz load | `cd realready && npx tsx scripts/seed-questions.ts [STANDARD_REF] --reseed` |

**Critical:** layer 3 (git) and layer 4 (Supabase) are NOT the same
thing. The mobile app reads from layer 4 at runtime via Supabase
queries (`lib/questions.ts`). Editing layer 3 changes the seed source
for future re-seeds but does **not** by itself change what paying
users see. The seed script in layer 4's update column is the bridge.

**What touches what:**

- **Shipping a NEW state's web page** → layer 1 only. Layers 2, 3, 4
  are already populated from the initial bank sync + seed.
- **Fixing a wrong question discovered in step 4b's audit** → layers
  2, 3, **and 4**. Hit all three. Skipping layer 3 means the next
  sync-questions reverts your web fix. Skipping layer 4 means paying
  mobile-app users keep seeing the wrong answer indefinitely.
- **Correcting an exam fee, FAQ entry, or intro paragraph** → layer 1
  only. The mobile app doesn't show this content; it's web-only.

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

**Copy guidance** — patterns we landed on after several iterations on
California. Follow these closely; they save a lot of back-and-forth.

#### General rules

- **No em dashes** (—) in body copy. Replace with periods, commas, or a
  connector like "and" / "so".
- **No colons** in body copy. Break into separate sentences instead.
- **Don't sound like AI.** Vary sentence length. Don't end a paragraph
  with three short fragments in a row.
- **Don't close P4 with "It's the same study guide thousands of
  licensees use..."** That generic-sounding wraparound is out. P4 ends
  at the feature list.
- **HTML-entity gotcha.** Astro's `{}` interpolation escapes HTML
  entities, so `&rsquo;` would render literally in copy. Use the real
  Unicode characters directly in JSON strings: `'`, `—`, `&`, `"`.

#### Intro paragraph template (4 `<p>` blocks inside the `intro` field)

**P1 — Exam intro (~3 sentences)**

- Open with a hook like *"The [State] real estate salesperson exam is
  one of the toughest in the country."*
- Name the regulator (DRE, TREC, REBA, REC, etc.) **in P1** — not later.
- Give the question count + time limit + unified-vs-split exam
  structure.
- Close with one sentence on why state-specific prep matters here.

**P2 — State-specific topics + practice-questions hook (~4 sentences)**

- Open: *"State-specific prep matters more here than almost anywhere
  else."*
- One sentence listing 4–6 state-specific topics (statutes, disclosures,
  agency rules, regulator powers) verified in step 2.
- One sentence: *"None of that looks like the material a candidate in a
  neighboring state studies."*
- *"A generic real estate practice test won't cut it."*
- Close: **"You need [State]-specific practice questions."**
  → uses the *practice questions* keyword, **NOT** *practice exam*.

**P3 — 20-question hook (~4 sentences, ~70 words target)**

- *"Below are 20 free [State] real estate test questions and answers
  from RealReady's full [State] bank."*
- *"Each tests a specific topic with the correct answer and a
  plain-English explanation under the card."*
- *"Read each one, commit to an answer, then reveal."*
- *"Treat it like a real [REGULATOR-ACRONYM] practice test, and the
  ones you miss show you what to focus on next."*

**P4 — App pitch with specific features (~2 sentences)**

- Open: *"Get the RealReady app on iPhone, iPad, or Android for the
  rest of the [State] question bank."*
- Then: *"The full app includes short articles that walk you through
  the why behind each topic, detailed explanations on every question,
  a missed-question drill mode, and progress tracking that shows your
  per-category accuracy."*
- **Do NOT mention Quick 10** / daily practice sessions in P4.
- **Do NOT close with a "thousands of licensees use this study guide"
  line.** End at the feature list.

#### SEO keyword targets

After the template renders title + H1 + meta-description + practice
section header, each page should hit:

- *practice test* — 5+ instances page-wide
- *practice questions* — at least once (P2 closing line)
- *questions and answers* — in title or meta + once in P3
- *[Regulator] practice test* — e.g. "DRE practice test", "TREC
  practice test" — in P3
- *[State]-specific* — in P1 and P2

#### CTA band (bottom of page)

The CTA section is rendered by `[state].astro` and is the **same for
every state** — you don't author it per-state, but know what it says
so the FAQ and intro don't repeat the same claims:

- H2: *"Want the rest of [State]'s {totalBankPretty}-question bank?"*
- **Lead paragraph:** *"The RealReady app has all {totalBankPretty}
  questions covering both national real estate principles and
  [State]-specific law. The full app also includes:"*
- **Bulleted feature list** (orange ✓ on navy):
  - Short articles that walk you through the why behind each topic
  - A missed-question drill mode
  - Detailed explanations on every question
  - Progress tracking with per-category accuracy
- **Closing paragraph** (no-subscription beat): *"Unlike other real
  estate prep apps, we don't cut off access or charge a monthly
  subscription fee. Once you buy, it's yours forever."*

Both the H2 and the lead paragraph reference the full `totalBankPretty`
count (NOT `totalBank - 20`). If you find yourself touching this CTA,
keep the count consistent.

#### FAQ targets

6–8 entries. Each Q&A answers something a real candidate would Google:

- How many questions are on the [State] real estate exam?
- What's the passing score?
- How much does the exam cost?
- How long is the exam?
- Is the [State] real estate exam hard?
- What's on the exam? (cover sections + state-specific weighting)
- What's the best way to prepare?

**Do NOT include licensing-process FAQs** (CE hours, fingerprinting,
application form, license renewal). These are filtered out of the
question bank by `LICENSING_PROCESS_PATTERNS` in `getStateData.ts`;
mirror that on the FAQ side.

### 4. Pre-ship verification gate (every fact + every question)

> **This step is a hard gate, not optional polish.** A state page does
> not go live until every fact on the page has been verified against a
> current authoritative source. Stale exam fees, renamed agencies, and
> wrong "correct" answers undermine the page's authority faster than
> any SEO mistake. We caught a wrong-answer question (CA Q7) and a
> stale exam fee (CA: $60 → $100) on California after authoring —
> assume every other state has similar drift, and re-verify everything.

**Build the page first** so you're verifying what users will actually
see, not what the JSON says in isolation:

```bash
cd realready-web
npx astro build
```

Then read the generated HTML to dump the exam-facts strip and all 20
question cards:

```bash
python3 <<'PY'
import re
SLUG = 'texas'  # <-- replace with the state you're shipping
html = open(f'dist/states/{SLUG}/index.html').read()

# Exam facts strip (top of page)
print("EXAM FACTS")
facts = re.findall(r'class="exam-facts__value[^"]*"[^>]*>([^<]+)</p>\s*<p class="exam-facts__label[^"]*"[^>]*>([^<]+)</p>', html)
for v, l in facts:
    print(f"  {v.strip()} — {l.strip()}")

# 20 question cards
print("\nQUESTIONS")
cards = re.findall(r'<article class="quiz-card.*?</article>', html, re.DOTALL)
for i, card in enumerate(cards, 1):
    q = re.search(r'class="quiz-card__text[^"]*"[^>]*>([^<]+)<', card)
    correct = re.search(r'class="quiz-card__correct-text[^"]*"[^>]*>([^<]+)<', card)
    expl = re.search(r'class="quiz-card__explanation[^"]*"[^>]*>([^<]+)<', card)
    print(f"Q{i}: {q.group(1).strip() if q else '?'}")
    print(f"  ✓ {correct.group(1).strip() if correct else '?'}")
    print(f"  → {expl.group(1).strip()[:200] if expl else '?'}")
PY
```

#### 4a. Re-verify the exam facts

Re-check every field, even if you just looked them up in step 2. Step 2
gathered data from the regulator's site; step 4a confirms that data is
still current at ship time (a few weeks may pass while you author the
intro and FAQ).

For each of these, do at least one web search and link to the source in
your commit message:

- [ ] Official exam name still matches the regulator's wording
- [ ] Question count on the real exam
- [ ] Time limit
- [ ] Passing score
- [ ] **Registration fee** — fees change. Recent example: California's
      exam fee went from $60 → $100 effective July 1, 2024, the first
      hike since 1997. Always check the regulator's current fee page.
- [ ] Regulator name in the notes line
- [ ] Any fee figure mentioned in the FAQ entries (license fee,
      renewal fee, retake fee)

#### 4b. Verify every one of the 20 questions

For each of Q1–Q20, do a web search and confirm:

1. **The marked correct answer is still legally correct** for that
   state today. Don't take the question bank at face value — questions
   were authored at a specific date and laws change.
2. **Every factual claim in the explanation is still accurate.** Watch
   in particular for:
   - Statute / code section numbers (renumbering happens)
   - Agency names (California's DFEH became CRD in 2022; DBO became
     DFPI in 2020 — similar renames happen in other states)
   - Percentages, dollar caps, time windows
   - Statutes cited by year or proposition number
3. **The question is not about the licensing process itself** (hours,
   fees, fingerprinting, application). The bank filter
   (`LICENSING_PROCESS_PATTERNS` in `getStateData.ts`) catches most,
   but skim for anything that slipped through.

**California examples of what to look for** (from the May 2026 audit):

- Q7 had "Disclose the seller's underwater status to buyers" marked
  correct. **Wrong.** A seller's loan balance is confidential
  financial information under Civil Code §2079.16, not a material
  property fact. Flipped to the confidentiality answer.
- Q3 cited "§10176" for undisclosed dual agency. Imprecise — the
  specific subsection is §10176(d). Tightened explanation.
- Q6 claimed "California abolished subagency by statute." Imprecise —
  the agency-disclosure law (Civil Code §§2079.13–2079.24) effectively
  ended subagency in 1-4 unit sales without literally "abolishing" it.
  Softened.

If a question is wrong or stale, you have two paths:

- **Fix it** — edit `correct_answer`, `distractors`, `explanation`, or
  `question_text` as needed and re-build. The deterministic option
  shuffle keeps display order stable as long as `question_text +
  key_topic_ref` doesn't change.
- **Remove it** if it can't be fixed. The picker will pull the next
  available question from the same category bucket, so all 20 slots
  stay filled.

#### Important — fix the question in ALL THREE places

> The question bank lives in **three layers** (see the data-layer
> table at the top of this doc). A question fix that only lands in
> one or two of them silently regresses on the others.
>
> **The rule:** every question correction must be applied to **all
> three** layers:
> 1. `realready/data/questions/[XX]-NN.json` (layer 3 — mobile-app
>    canonical source, outer repo `marknygren/real-estate-app`)
> 2. `realready-web/src/content/questions/[XX]-NN.json` (layer 2 —
>    web's synced copy, web repo `marknygren/realready-web`)
> 3. Supabase `questions` table (layer 4 — what the mobile app reads
>    at runtime; updated via `npx tsx scripts/seed-questions.ts
>    [STANDARD_REF] --reseed` from `realready/`)
>
> **Skipping any layer's update:**
> - Skip layer 2 → web visitors keep seeing the wrong answer on
>   realready.app until next sync
> - Skip layer 3 → next `npm run sync-questions` overwrites layer 2
>   with the wrong answer, deploy regresses
> - Skip layer 4 → paying mobile-app users keep seeing the wrong
>   answer on every quiz load
>
> Layers 1/2/3 are handled by step 6a/6b (git pushes). Layer 4 is
> step 6c (Supabase re-seed). Don't stop at "I committed the fix."

Either way, capture the change in your commit message with a source
URL on both repos: *"Verified Q7 against [Civil Code §2079.16 URL];
flipped marked answer."*

#### 4c. Mini-rubric before flipping the row to ✅

Don't mark a state ✅ on the status table unless:

- [ ] All 6 exam-facts fields verified against a current regulator source (URLs captured in commit)
- [ ] All 20 questions' correct answers verified
- [ ] All 20 questions' explanations checked for stale facts (statutes, agency names, percentages)
- [ ] FAQ entries' dollar figures and percentages match the regulator's current page
- [ ] If any questions were edited: changes pushed to **both git repos** AND Supabase re-seeded (see steps 6b + 6c)
- [ ] Build succeeds, page renders, JSON-LD validates

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

#### 6a. Web repo (always)

```bash
cd realready-web
git add src/content/states/XX.json
# If you edited any web-side question files in step 4:
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

#### 6b. Mobile app repo (only if you fixed questions in step 4)

If step 4 turned up wrong answers or stale explanations and you edited
files in `../realready/data/questions/`, commit + push those to the
outer mobile-app repo. This makes the git source canonically correct
so future seeds and syncs work from the right baseline.

```bash
cd ..   # back up to "Real Estate App/"
git add realready/data/questions/XX-*.json
git commit -m "fix(questions): [Name] audit corrections — Q7 wrong answer, Q3 imprecise"
git push origin main
```

The outer repo is `marknygren/real-estate-app`.

Skip 6b entirely if you didn't touch any question JSONs.

#### 6c. Supabase re-seed (only if you fixed questions in step 4)

This is the step a session is most likely to miss. The mobile app
reads questions from a Supabase `questions` table at runtime, **not**
from the JSON files you just edited. Until you re-seed, paying
mobile-app users keep getting the old (wrong) data on every quiz
load, even though the git history looks fine.

For each `standard_ref` you touched in step 4 (e.g. CA-03, CA-06,
CA-07), run the seed script with `--reseed`:

```bash
cd realready
npx tsx scripts/seed-questions.ts CA-03 --reseed
npx tsx scripts/seed-questions.ts CA-06 --reseed
npx tsx scripts/seed-questions.ts CA-07 --reseed
```

Each invocation:
- Validates the JSON
- Deletes existing Supabase rows for that `standard_id`
- Re-inserts from the file

The script needs `EXPO_PUBLIC_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` in `realready/.env`. If either is missing
or stale, it fails loudly — fix the env first.

**Why this is layer 4 and not just "another commit":** Supabase is a
running production database, separate from git. Re-seeding is a
direct write to production data. Treat it that way — verify each
seed succeeds (look for `OK: Inserted N questions for [REF]`) before
moving on.

Skip 6c entirely if you didn't touch any question JSONs.

### 7. Update this tracker

In the status table at the bottom of this file:

- Change the row's status emoji from 🟡 (or 🟠) to ✅
- Add a short note in the rightmost column, e.g. `shipped 2026-06-02`

Commit the tracker change in the same push (or as a follow-up commit).

---

## Rules to follow (don't break these)

1. **Site is indexable as of 2026-05-27.** `BaseLayout.astro` defaults
   `noindex` to `false` and `robots.txt` is `Allow: /` + sitemap. If you
   need to keep a specific page out of Google, pass `noindex={true}` to
   BaseLayout on that page (as `404.astro` does). Don't broadly revert
   to the pre-launch noindex defaults without explicit instruction.
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
| 1 | AL | Alabama | 205 | ✅ | shipped 2026-05-27. Audit: Q3 temp-license duration corrected to 1 year (active 6 mo + inactive 6 mo per Ala. Admin. Code 790-X-2-.03), Q11 "Substantial misrepresentation" → "Material misrepresentation" (§34-27-36(a)(3)), Q13 tax-year framework fixed to Oct 1–Sept 30. Re-seeded AL-03/11/13 to Supabase |
| 2 | AK | Alaska | 180 | ✅ | shipped 2026-05-27. Verified against Pearson VUE Alaska Real Estate Candidate Handbook #092200 (rev 09/2025) + AS 08.88 statutes (Sept 2024) + AREC ExamInformation page (120 scored = 80 national + 40 state, 4h, scaled 75, $100 exam fee). Audit: Q5 (licensee relationships) wrong answer flipped from "Four types" to "Three types" per AS 08.88.600–.695 + AREC Consumer Disclosure 08-4145 (rev 04/2024); Q16 (Recovery Fund deadline) explanation tightened to cite AS 08.88.460(a)(3) — 2 years after judgment no longer subject to appeal. Re-seeded AK-02/05 to Supabase 2026-05-27 |
| 3 | AZ | Arizona | 260 | ✅ | shipped 2026-05-27. New 2026 split-exam format (80 General + 60 State, $75 combo, 75% per portion). Verified against Pearson VUE candidate handbook Feb 2026 #090300 + content outlines #090301 + ADRE fee schedule. Audit found no question-bank errors; tightened picker filter to catch "pre-licensing" (hyphen+ing), broker/salesperson candidate, minimum-age, obtain/apply-for-license, license-applicant, Contract Writing Course, Broker Management Clinic |
| 4 | AR | Arkansas | 210 | ✅ | shipped 2026-05-27. Verified facts against Pearson VUE Arkansas Real Estate Candidate Handbook #090400 (Jul 2024) + content outlines #090402 (Apr 2025) + AREC FAQs (exam $75, application $50, license $50 + Recovery Fund $25, scaled 70 each on 80 general + 30 state). Audit found no question-bank errors; CE-plurals filter expansion (`requirements?`, `courses?`, `electives?`, `deadlines?`) needed to drop a "Principal Broker's CE requirements" question that leaked past the singular pattern. Verified ACA §17-42-201 (5 commissioners), §17-42-316 (absolute fidelity), §17-42-103 (license required for compensation), AREC Reg 10.5 (advertising firm name), Title 18 Ch.14 (Time-Share Act registration), Arkansas caveat-emptor doctrine. |
| 5 | CA | California | 260 | ✅ | shipped 2026-05-25, pilot. Audit 2026-05-27: fee $60→$100, Q7 answer flipped (Civil Code §2079.16), Q3 + Q6 tightened. Re-seeded CA-03/06/07 to Supabase 2026-05-27 |
| 6 | CO | Colorado | 265 | ✅ | shipped 2026-05-27. Verified facts against PSI Colorado Real Estate Candidate Information Bulletin (Updated 10/1/2023) + DRE Real Estate Broker Contracts and Forms page + C.R.S. §§ 12-10-204, 12-10-206, 12-10-407. Audit: Q10 CBS-versions answer corrected from "Three" → "Four: residential, income-residential, commercial, land" (CBS1/2/3/4); filter expanded with `annual commission update` pattern to drop two ACU CE-cycle questions (replacements are E&O-insurance content). Re-seeded CO-10 to Supabase. |
| 7 | CT | Connecticut | 210 | ✅ | shipped 2026-05-28. Verified facts against CT DCP Real Estate Salesperson InitialExam page + PSI CT Real Estate Broker Candidate Information Bulletin (rev 10/1/2023) for state-portion outline structure + DCP PA 23-84 changes summary + CGS Chapter 392 (110 scored = 80 national + 30 state, 165 min = 120 + 45, 70% per portion, $59 PSI fee, $80 DCP application fee). Audit: CT-05 transaction-agent fiction removed across 3 questions — CT recognizes only seller's, buyer's, dual (CGS 20-325g), and designated (CGS 20-325i) agency; 3 CT-05.3 subagency questions updated for PA 23-84 (residential broker subagency strictly prohibited effective 4/1/2024, commercial still allowed with written agreement); CT-06 disclosure-timing wording tightened from informal "first meaningful contact" to statutory "the beginning of the first personal meeting" (CGS 20-325d, Reg 20-325d-2) across 3 questions. Re-seeded CT-05/06 to Supabase. |
| 8 | DE | Delaware | 195 | ✅ | shipped 2026-05-28. Verified facts against Pearson VUE Delaware Real Estate Candidate Handbook #090800 (January 2026) + state content outline effective June 1, 2020 + 24 Del. C. §§2903, 2922, 2938 (split exam: 80 general + 40 state, $88, scaled 70 each, 4h, administered by Pearson VUE for the Delaware Real Estate Commission). Audit: Q15 (DE-01.1) wrong answer flipped from "The Governor with Senate confirmation" → "The Governor alone" — 24 Del. C. §2903 requires no Senate consent; Q6 (DE-06.1) explanation rewritten — the three DREC seller's disclosure forms are standard Real Property Condition Report, New Construction Only, and Vacant Land (no separate condo/coop form; condos use the standard form per 6 Del. C. §2572); Q5 + Q19 (DE-05.1) CIS-timing explanations tightened to cite §2938's actual triggers (earliest of first scheduled appointment, first showing, or making an offer). Re-seeded DE-01/05/06 to Supabase. |
| 9 | DC | District of Columbia | 195 | 🟡 | |
| 10 | FL | Florida | 205 | ✅ | shipped 2026-05-28. Verified facts against DBPR Candidate Information Booklet "Real Estate Sales Associate Examination" (effective January 2025) + §475.02 / §475.278 / §404.056(5) / §161.053, F.S. + Florida Constitution Art. X §4 + Rule 61J2-14.008 F.A.C. + DBPR Jan 2024 Exam Performance Summary. Single 100-question test, 3.5h, 75%, $36.75 Pearson VUE fee. Audit found no question-bank errors across the 20 picked Qs (transaction-broker default, 1/2-acre municipal homestead, 3-business-day escrow, 2-witness deed, lien-theory mortgage state, FCHR fair-housing enforcement). |
| 11 | GA | Georgia | 260 | ✅ | shipped 2026-05-28. Verified facts against GREC Candidate Information Bulletin via PSI + OCGA Title 43 Chapter 40 + OCGA 10-6A (BRRETA) + OCGA 44-7-31 + HB 404 Safe at Home Act (152 = 100 national + 52 state, 4h, 75% per portion, $121 PSI fee). Audit: Q15 (GA-15.1) wrong answer flipped from "No statutory maximum" → "Two months' rent" per HB 404 effective July 1, 2024; Q7 (GA-07.1) re-scoped from "Under Georgia law" to the GAR purchase and sale agreement default because GREC Rule 520-1-.08 actually uses an "as soon after receipt as practicably possible" standard with no fixed banking-day count; Q20 (GA-04.1 #2) Recovery Fund deadline rewritten — OCGA 43-40-22 caps the underlying lawsuit at 2 years from accrual of cause of action, not 1 year from judgment. Filter expanded with `prospective (salesperson\|broker)`, `birthday month`, `hours of CE`, and broader `apply for ... licens(e\|ure)` patterns to drop two licensing-process questions that slipped through. Re-seeded GA-04/07/15 to Supabase. |
| 12 | HI | Hawaii | 210 | ✅ | shipped 2026-05-28 (web JSONs landed in commit ec30cc4 alongside KS due to concurrent staging). Verified facts against PSI Hawaii Real Estate Candidate Information Bulletin content outline (files.hawaii.gov/dcca/reb/real_ed/exam_lic/exam_info/347hawaii-re-cib.pdf) + DCCA REB exam page + HRS Chapter 467 §§467-3 (HIREC = 9 members, 4 broker + 2 public + island distribution), 467-14 (revocation grounds incl. commingling), 467-16 ($25K Recovery Fund per-transaction cap) + HRS 521-44 (1-month security deposit cap) + HAR 16-99-4 (next-business-day trust deposit) + DCCA renewal FAQs (biennium ends Dec 31 of even years). Split exam: 80 uniform + 50 state = 130, 240 min (150 + 90), 70% per portion, $61 PSI fee. Audit: HI-05.1 + HI-05.3 had three questions ("every real estate advertisement must include", social-media post, mass-email campaign) all asserting that HAR 16-99-11 requires a license number on every ad. Per the current Cornell-published rule text (law.cornell.edu/regulations/hawaii/Haw-Code-R-SS-16-99-11), only the brokerage's legal name or registered trade name is mandatory — the license-number requirement was a proposed amendment that was never adopted. Correct answers and explanations rewritten to match the actual rule; HI-05 mirrored to mobile-app source, Supabase re-seed pending. |
| 13 | ID | Idaho | 225 | ✅ | shipped 2026-05-28. Verified facts against Pearson VUE Idaho Real Estate Candidate Handbook #091300 (July 2024, rev 11/2025) + Pearson VUE Idaho State Content Outlines #091306 (04/2025) + Idaho Code Title 54 Ch.20 + IREC/DOPL site (split exam: 80 national + 40 state, $83 Pearson VUE fee, 4h, scaled 70 on each portion, administered for the Idaho Real Estate Commission within DOPL). Audit: ID-03 Q3 ("born in March renewal starts April 1") removed — Idaho Code §54-2018 amended effective July 1, 2025 means a license now expires on the licensee's birthday, not the last day of the birth month, so the "April 1" answer is stale. Filter expanded with `renewal (start|starting|begin|begins|period|deadline)`, `commission core`, and `elective ce` patterns to drop the remaining ID-03 CE/Core-course questions that would otherwise leak past the existing process-question filter. Re-seeded ID-03 to Supabase.
| 14 | IL | Illinois | 225 | ✅ | shipped 2026-05-28. Verified facts against PSI Illinois Real Estate Examination Program (ILREP) candidate handbook + IDFPR Division of Real Estate site + 225 ILCS 454 + IL Admin Code Title 68 Part 1450 (split exam: 100 national + 40 state, 240 min = 150 + 90, scaled 75 each portion, $58 PSI fee). IL uses "Broker" as the entry-level license (salesperson tier abolished 2011). Audit: IL-03.3 address-change deadline corrected from 30 days → **14 days** per IL Admin Code 1450.150(a)(1)(B) (24-hour rule applies only to office-location changes under 1450.150(c)); IL-04.1 reframed — net listings are **not** statutorily prohibited under 225 ILCS 454 (legal in IL though discouraged), question now asks about dual agency requiring informed written consent per 225 ILCS 454/15-45. Re-seeded IL-03/04 to Supabase. |
| 15 | IN | Indiana | 215 | ✅ | shipped 2026-05-28. Verified facts against Pearson VUE Indiana Real Estate Candidate Handbook #091500 (March 2025) + state content outline #091501 (effective March 1, 2025) + IC 25-34.1 + 876 IAC 7/8 + IN Professional Licensing Agency fee schedule (split exam: 80 national + 50 state, 240 min seat time, scaled 75 each portion, $55 Pearson VUE fee). IN uses "broker" as the entry-level license. Filter: added `/\brenewal cycle\b/i` to LICENSING_PROCESS_PATTERNS to drop CE-cycle questions (CO precedent). Audit: IN-06.1 + IN-06.3 "transaction broker" / "transaction brokerage" fiction removed across 4 questions — IN recognizes only seller/buyer/landlord/tenant agency and limited agency representing both sides under IC 25-34.1-10-12; no transaction broker category exists in Indiana statute (CT precedent for transaction-agent removal). Re-seeded IN-06 to Supabase. |
| 16 | IA | Iowa | 200 | ✅ | shipped 2026-05-28. Verified facts against PSI Iowa Real Estate Commission Licensing Information Bulletin (effective 2/8/2024) + Iowa Code §543B.46 + IAC 193E—13.1 + IREC Application for an Individual License (split exam: 80 national + 40 state, 180 min = 120 + 60, 70% per portion, $95 PSI exam fee, $125 salesperson license fee, 3-year renewal, PSI test sites at West Des Moines/Cedar Rapids/Council Bluffs). Audit: IA-06.1 trust-account questions corrected — Q1 wrong answer flipped from "must be at an Iowa institution" to "Yes, if federally insured" (§543B.46(1) and IAC 193E—13.1 only require "federally insured depository institution," no in-Iowa location requirement); Q2 wrong answer flipped from "demand deposit (checking)" to "Interest-bearing federally insured account" (§543B.46(1) states "The account shall be an interest-bearing account," with interest going quarterly to the Iowa Finance Authority housing trust fund per §16.181). Filter expansion (`law update`, `elective credit`, `broker education`) added to LICENSING_PROCESS_PATTERNS to drop IA-04 questions that leaked past the existing CE/pre-license patterns. Re-seeded IA-06 to Supabase. |
| 17 | KS | Kansas | 210 | ✅ | shipped 2026-05-28 via ec30cc4. Verified facts against Pearson VUE Kansas Real Estate Candidate Handbook (April 2025, #091700) + KREC license renewal + fee pages + ksrevisor.gov for K.S.A. 58-3050, 58-3061, 58-3062, 58-3066, 58-30,106, 58-30,109, 58-30,110 (split exam: 80 general + 30 state, scaled 70/70, 2.5h + 1.5h, $70 Pearson VUE combo fee, administered by Pearson VUE for KREC). Filter expanded with `required (salesperson\|broker)? core`, `renewal fee`, `(deactivat\|reactivat)`, `fee waiver`, `military spouse` to drop CE-core-renewal, license-renewal-fee, deactivation/reactivation, and military-spouse-waiver questions leaking into the 20-question demo from KS-01..KS-05. Q4 (KS-04.1 fraud) explanation cites K.S.A. 58-3050 but transactional fraud is enumerated in K.S.A. 58-3062(a)(13); fix attempt was reverted out-of-band, citation remains pending user review. No Supabase re-seed needed (no question JSON edits landed). |
| 18 | KY | Kentucky | 215 | ✅ | shipped 2026-05-28. Verified facts against the PSI Kentucky candidate bulletin + KREC site (krec.ky.gov) + KRS Chapter 324: 324.281 (Governor-appointed 5-member Commission, 4-yr terms, max 2 consecutive), 324.111 (escrow maintained within Kentucky), 324.330 (10-day notice for residence-address change and broker transfer), 324.360 + KREC Form 402 (seller's disclosure of property condition), 324.395 + 201 KAR 11:220 ($100k/claim E&O, Form 203 annual filing for independent coverage), 201 KAR 11:121 (transactional brokerage = good faith + fair dealing only; principal broker cannot self-designate as designated agent), 201 KAR 11:105 (advertising must carry the brokerage name as registered with KREC), HB 62 2023 (advertising an equitable interest in a purchase contract is brokerage requiring a license). Split exam: 80 national + 40 state = 120 scored, 240 min (150 + 90), 75% per portion, $100 PSI fee; entry-level license is "Sales Associate". Audit: all 20 picked questions verified correct — no question-content edits, so no mobile-repo commit and no Supabase re-seed. Filter expanded with `required ce`, `core course`, `licen[sc]es? must be renewed`, `license in escrow`, `exam consists of` to drop 3 licensing-process leaks (CE penalty, exam question-count, renewal date → replaced by brokerage-transfer, HB 62 wholesaling, address-change). The `licenses must be renewed` pattern also dropped a leaked renewal-cycle question from Iowa's demo (no IA content edited; both IA replacement questions verified correct). |
| 19 | LA | Louisiana | 250 | ✅ | shipped 2026-05-28. Verified facts against Pearson VUE LREC/LREAB Candidate Handbook #091900 (rev 01/2026) + content outlines #091901 (04/2025): combination salesperson exam 135 scored (80 national + 55 state), 240 min (150 + 90), scaled 70 per portion, $81 first attempt ($96 repeat), administered by Pearson VUE for the LREC (prep sites citing PSI/$85 are stale). Audit: LA-01.1 commissioner term flipped 6yr → 4yr — Act 256 of 2025 (eff. 6/11/2025) amended R.S. 37:1432 to two consecutive 4-yr terms; LREC's own commission-members webpage is stale, statute controls. Q17 answer + Q1 explanation corrected, re-seeded LA-01 to Supabase. Filter expanded (`timely renewal`, `delinquent renewal`, `license year`, `mandatory topic`) to drop leaked CE/renewal questions from LA-03; replacements are verified E&O content ($100k/$300k limits, $1,000 max deductible, R.S. 37:1466). Q7 in-state trust-account requirement verified correct (LAC 46:LXVII-2701, not an Iowa-style error); Q5 advertising broker/firm-name and Q9 R.S. 9:3892 ministerial-acts verified. Only Louisiana picks changed. |
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

**Progress: 18 / 51 live.**
