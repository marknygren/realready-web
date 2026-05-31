# State Rollout Tracker (temporary)

> **Purpose.** Track the Phase 3 fan-out of `/states/[slug]/` pages for all 50
> states + DC. **Delete this file** once every row in the status table is ✅.
>
> **Last updated:** 2026-05-30. California and Alabama are live (audit-fixed).
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
| 9 | DC | District of Columbia | 195 | ✅ | shipped 2026-05-29. Verified facts against PSI Real Estate License Examination Candidate Information Bulletin (rev 10/1/2018, still current per psiexams.com) + DC Real Estate Commission page on dlcp.dc.gov + D.C. Code § 42-1704 + 17 DCMR Chapter 26 + DC Code §§ 42-3404.01 (TOPA) and 42-3501.01 et seq. (Rental Housing Act of 1985). Salesperson combo exam: 80 national + 30 DC = 110 items, 120 + 90 = 210 min, scaled 75 per portion, $61.50 PSI fee, administered for DCREC under DLCP. Audit: DC-06.1 earnest-money-deposit-deadline question wrong answer flipped from "Within a reasonable time" → "Within 7 days of receipt" per D.C. Code § 42-1704 (statutory deadline). Filter expansion: added `topic\|topics` to existing CE alternation to catch "mandatory CE topic" CE-infrastructure questions (drops DC-03 "DC Legislative Update" leak); added `cost to renew` to catch DC-03 "total cost to renew" question; added `late renewal` to catch DC-03 "penalty fee for late renewal" question. Re-seeded DC-06 to Supabase. |
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
| 20 | ME | Maine | 210 | ✅ | shipped 2026-05-29. Verified facts against Pearson VUE Maine Real Estate Candidate Handbook #092000 (Dec 2025) + content outlines #092005 (rev 04/2025): combination Sales Agent exam 120 scored (80 general + 40 Maine Law), 240 min (150 + 90), scaled 75 per portion, $88 Pearson VUE fee, administered for the Maine Real Estate Commission (prep sites citing PSI/$85 are stale; $85 is the separate Maine Law reciprocity/renewal exam). Audit: ME-11.1 (5 Qs) wrongly claimed Maine legally requires an attorney to conduct/supervise residential closings — corrected to "no specific closing agent required" (closings done by attorneys OR title companies; Title 9-A §3-311 only governs the buyer's attorney choice when a lender requires one); ME-06.1 trust-account explanation tightened from "located in Maine" to statutory "authorized to do business in Maine" (32 M.R.S. §13178). Re-seeded ME-06/ME-11 to Supabase. Filter expanded (non-renewable, biennial/biennially, upgrade-to-associate-broker, applies-for-associate/designated-broker-license, must-be-at-least-18) to drop ME-02/ME-03 license-term, CE, renewal, age, and experience-upgrade leaks; replacements verified (MREC powers/composition, one-DB-per-agency, activity-requires-license). Verified Title 33 §§173-174 disclosure, 30-A §4401 subdivision, 32 M.R.S. §13278 appointed agency, C.M.R. ch.410 §§1/9 advertising + brokerage-relationship disclosure, 14 §6032 security deposit, 33 §159 tenancy-in-common. |
| 21 | MD | Maryland | 225 | ✅ | shipped 2026-05-29. Verified facts against PSI Maryland Real Estate Candidate Information Bulletin (rev 2024) + MREC mrecexam.shtml + mrecaff.shtml + Md. Code Bus. Occ. & Prof. §§ 17-201, 17-404, 17-530 + Md. Real Property §§ 7-105, 7-105.1, 8-203 (RRSA): salesperson exam 110 scored = 80 national + 30 state (state portion administers up to 10 unscored pretest items), 120 min total (90 + 30), 70% per portion, $44 PSI exam fee, $98 original license fee (incl. $20 Guaranty Fund), $78 renewal. Audit: MD-14.1 first question wrong answer flipped from "Judicial foreclosure through courts" → "Non-judicial power of sale" — Maryland's primary foreclosure method under Real Property §7-105 is power-of-sale via the deed-of-trust clause (the "quasi-judicial" Order to Docket + court ratification process is not a full judicial foreclosure lawsuit). Filter expanded with `\bce cycle\b/i` to drop the MD-04 CE-cycle-hours fair-housing question; replacement is the broker-affiliation 10-day notification question (verified) and the license-transfer Commission-approval question. Re-seeded MD-14 to Supabase.
| 22 | MA | Massachusetts | 230 | ✅ | shipped 2026-05-28. Verified facts against PSI Massachusetts Real Estate Candidate Information Bulletin (Updated 09/23/2025, https://www.mass.gov/doc/psi-candidate-information-bulletin/download) + Board page at mass.gov/orgs/board-of-registration-of-real-estate-brokers-and-salespersons + DPL fee schedule. Salesperson combo exam 120 scored (80 General + 40 State), 240 min (150 + 90), 70% per portion, $56 PSI fee, administered by PSI for the Board of Registration of Real Estate Brokers and Salespersons within the Division of Occupational Licensure. Audit: MA-15.1 Q1 ("most commonly used deed type") explanation rewritten — the MA quitclaim deed under M.G.L. c.183 §11 carries limited "quitclaim covenants" against grantor-period encumbrances (equivalent to a special warranty deed in other states), it is NOT a no-warranty deed as the prior explanation incorrectly stated. Verified MA-04.1 Chapter 93A treble-damages + 30-day demand letter (c.93A §9), MA-09.1 source-of-income protection under c.151B, MA-12.1 Lead Paint Law pre-1978 disclosure under c.111 §197A, MA-13.1 one-month security deposit cap under c.186 §15B, MA-05.1 Consumer/Licensee Relationship disclosure timing under 254 CMR 3.00. Re-seeded MA-15 to Supabase. |
| 23 | MI | Michigan | 205 | ✅ | shipped 2026-05-28. Verified facts against the PSI/LARA Real Estate Candidate Information Bulletin (rev. 5/25/2017) + the live PSI catalog for the salesperson exam: 115 questions (80 national + 35 Michigan), 180 min, 70% scored as one combined result (need 80 of 115), administered by PSI for LARA's Board of Real Estate Brokers and Salespersons. Exam fee recorded as $79 (current prep-site consensus; the last official PSI bulletin I could read showed $76 — user confirmed $79 since PSI's current fee sits behind a JS portal). Audit: MI-05.1 earnest-money deposit deadline corrected — the 2-banking-day clock runs from notice the offer was accepted by all parties (MCL 339.2512(1)(k)), not from receipt of the check (the prior Friday→Tuesday arithmetic was wrong); MI-16.1 Land Division max parcels for a 40-acre parcel corrected 4 → 7 (MCL 560.108: 4 for the first 10 acres + 1 per additional whole 10 acres). Verified MI Board composition (9 members, 6 licensed), ELCRA classes (age/marital status/sexual orientation, current after 2023 PA 6), security-deposit cap 1.5× (MCL 554.602), county transfer tax $1.10/$1,000, Seller Disclosure timing (before the seller executes the binding agreement, MCL 565.954). Re-seeded MI-05/MI-16 to Supabase. Flagged separately (not in the displayed 20): MI-05.1 #2 in-state-institution claim and MI-16.1 #3/#5 flat-"4 per 10 years" land-division misconception. |
| 24 | MN | Minnesota | 245 | ✅ | shipped 2026-05-28. Verified facts against the Minnesota Department of Commerce licensing site (mn.gov/commerce scheduling-exams + real-estate license pages) + the PSI candidate bulletin: salesperson combination exam is now administered by **PSI** (Minnesota moved off Pearson VUE), 120 scored (80 national + 40 state), 240 min (150 + 90), 75% per portion scored separately, $63 PSI fee ($39 single-portion retake), $70 initial license fee through Commerce. Corrected stale prep-site data still citing the old Pearson VUE 50-state-question / 130-total format. Verified MN statutes via revisor.mn.gov: §82.55 closing-agent + salesperson definitions, §82.67 agency disclosure at first substantive contact + facilitator relationship, §82.75 trust accounts, §82.86 Education/Research/Recovery Fund, Ch. 515B MCIOA (post-6/1/1994), 507.02 homestead two-spouse signature, 513.05 statute of frauds. Audit: MN-03.1 trust-account question wrong answer flipped from "a federally insured institution in Minnesota" → an out-of-state (foreign) bank is permitted if it authorizes commissioner examination, with funds in a separate pooled interest-bearing account (interest remitted to the MN Housing Finance Agency) per §82.75. Re-seeded MN-03 to Supabase. Filter expanded (`courses? i{1,3}`, `reciprocity`, `non-resident applicant`) to drop the wholly licensing-process MN-02 category (pre-license Course I/II/III, CE, WI reciprocity, nonresident licensing) that was leaking 2 questions into the demo; replacements (Recovery Fund education/research, deal-honestly-and-in-good-faith duty) verified. Confirmed the broad `nonresident` pattern would wrongly drop substantive nonresident-withholding questions in live states, so used the narrow `non-resident applicant` form instead. Diffed all 23 live states before/after the filter change: none changed. |
| 25 | MS | Mississippi | 185 | ✅ | shipped 2026-05-29. Verified facts against the MREC/PSI Real Estate Salesperson & Broker Candidate Information Bulletin (updated 10/1/2023, mrec.ms.gov) + Mississippi Real Estate License Law (Title 73 Ch. 35, rev 07/2023) + MREC Rules and Regulations (Part 1601, rev 07/2023) + MREC Agency Disclosure Form A (approved 05/14/2024): combination salesperson exam 120 scored (80 national + 40 state), 240 min (150 + 90), national 70% / state 75% scored separately, $75 PSI combo fee (retakes $75), administered by PSI for the Mississippi Real Estate Commission. Verified §73-35-5 (5 commissioners, Governor + Senate, 6-yr residency / 5-yr broker, 4-yr terms), §73-35-7 (broker upgrade 12 mo + 120 hrs; salesperson 60 hrs), §73-35-16 (E&O $100k per-claim/$100k aggregate, $2,500 damages / $1,000 defense deductibles), §73-35-18(2) (senior CE exemption requires 65+ AND 25 yrs licensed), §73-35-19 (Real Estate License Fund funds operations only — Mississippi has NO consumer recovery fund), §73-35-23 (subpoena power for witnesses + documents), §§89-1-501 et seq. (PCDS on 1–4 residential units; death/felony/disease stigmatizing-factor exemptions per §89-1-527; new construction not exempt), Rule 3.2(G) (3-yr record retention), Rule 3.3 (advertising must carry broker/firm name + phone), Rule 3.4 (earnest money deposited by close of next banking day), Rule 4.3 (dual agency via MREC Form A Consent + MREC Dual Agency Confirmation Form). Audit: MS-06 "five agency types" fiction removed — MS recognizes seller's/buyer's/disclosed-dual/subagent only, NOT "transaction broker" or "designated agency" (per Form A + Rules Ch. 4 + §73-35-3). Fixed displayed Q20's explanation and rewrote 3 non-displayed MS-06.1 questions whose answers were "Five types"/"Designated agency"/"Transaction broker". Re-seeded MS-06 to Supabase (15 questions). No filter change: dropping Q18 (senior CE exemption, verified correct) would have promoted MS-04's unverified "2025 rules / 5-business-day email notice" claim into the displayed 20, so Q18 was kept. Flagged for user review (NOT displayed, could not verify against the 2023 statute/rules): MS-01/MS-04 "under 2025 rules MREC must give 5 business days' email notice before a license status change" and SB 2086 July-2025 fee-effective-date claims. |
| 26 | MO | Missouri | 210 | ✅ | shipped 2026-05-29. Verified facts against PSI/MREC Real Estate Candidate Handbook (©2024 PSI, rev 7/18/2024, pr.mo.gov/boards/realestate/MOREP-handbook.pdf) + RSMo 339.120 (7-member commission: 6 brokers w/ 10+ yrs + 1 public, 5-yr terms, Governor w/ Senate consent) + RSMo 339.710/339.750/339.755/339.780 (transaction broker is the presumed relationship absent a written agency agreement; dual agent = limited agent requiring written consent of all parties) + 20 CSR 2250-8.120 (earnest money within 10 banking days of last signature unless the contract provides otherwise) + 20 CSR 2250-8.070 (advertising must carry the broker/firm registered name) + RSMo 432.010 (statute of frauds) + HB 595 / HB 594 (eff. 8/28/2025: written agency agreement before services + source-of-income preemption; first state to eliminate individual capital gains tax). Salesperson combination exam 140 scored (100 national + 40 state), 270 min (150 + 120), national 70% / state 75% scored separately, $52 PSI combo fee. Audit: MO-04.1 #2 (AHC) explanation corrected — Missouri uses a two-step disciplinary process (the AHC decides whether cause for discipline exists, then MREC holds a separate hearing to set the discipline); the prior explanation wrongly claimed the AHC "makes the final determination" and that "MREC does not hold its own hearings." Correct answer (AHC) unchanged. Re-seeded MO-04 to Supabase. Filter expanded with MO-flavored licensing-process patterns (MREP, MREC-approved, "Missouri real estate licensing examination", pre-exam, 48-hour, out-of-state experience, licens(e\|es) expir, late penalty) to drain the wholly licensing-process MO-02 category that was leaking 2 demo slots; diffed all 25 prior live states before/after — only Missouri changed (an early broad `testing vendor` pattern also hit Georgia, so it was narrowed to the MO-specific phrase). Flagged for user review (NOT displayed): MO-05.1 #4 "four agency types" omits designated agent/subagent and is inconsistent with the bank's own designated-agency questions; MO-04.1 #4 "which body makes the final determination = AHC" is imprecise under the two-step process. |
| 27 | MT | Montana | 230 | ✅ | shipped 2026-05-29. Verified facts against the Pearson VUE Montana Board of Realty Regulation Candidate Handbook (January 2026, #092700, rev01/2026) + state content outline effective 01/01/2025 + boards.bsd.dli.mt.gov/realty-regulation site + MCA §§37-51-313 (statutory broker / brokerage relationships), 37-51-314 (relationship disclosure), 37-51-325 (E&O insurance) + ARM 24.210.426 (trust accounts: Montana-located institution + 3-banking-day deposit + monthly reconciliation + up to $1,000 personal funds) + ARM 24.210.601 (8-year record retention) + ARM 24.210.641(dd) (advertising must disclose licensee name + brokerage identity) + Title 71 Ch.1 Part 3 (Small Tract Financing Act, ≤40 acres, 120-day non-judicial trustee's sale, no deficiency) + MCA 70-20-502 (2023 Property Condition Disclosure Statement, delivered before contract is signed) + MCA Title 70 Ch.23 (Unit Ownership Act) + Title 70 Ch.24 (Residential Landlord and Tenant Act) + the Montana group E&O policy ($100k per claim / $300k aggregate, $1,000 damages deductible). Salesperson combo exam: 80 national + 40 state = 120 scored, 150 + 90 = 240 min, scaled 75 per portion scored separately, $95 Pearson VUE fee. Audit: Q10 (MT-10.1) wrong answer flipped from "5 years" → "8 years" per ARM 24.210.601 (records retained 8 years to coincide with MCA 27-2-202(1) statute of limitations on written contracts); 3 related MT-10.1 explanations on departing-salesperson, electronic-storage, and listing-termination scenarios also corrected to the 8-year figure with the ARM 24.210.601 citation. Re-seeded MT-10 to Supabase. Flagged for user review (NOT displayed): MT-10.2 #3 personal-funds-in-trust-account question says "$100 maximum for bank fees" — ARM 24.210.426 currently allows "a sum not to exceed $1,000 of broker's personal funds" for bank charges, maintenance expenses, and property manager fees, so the $100 figure is stale. |
| 28 | NE | Nebraska | 205 | ✅ | shipped 2026-05-29. Verified facts against the Pearson VUE Nebraska Real Estate License Examinations Candidate Handbook #092800 (April 2025) + Nebraska state content outline #092801 (eff. 09/01/2023) + NREC fee schedule (nrec.nebraska.gov/licensing-forms/fees.html) + NREC Jan 2026 salesperson application checklist: salesperson combination exam 130 scored (80 national + 50 state), 240 min (150 + 90), 75% per portion scored separately, $150 exam fee paid to NREC. The $150 is high vs neighbors (MT $95, KS $70) because Nebraska bundles the exam fee into the Commission rather than charging a lower Pearson VUE seat fee — confirmed against the regulator's own fee schedule + application checklist. **Competing-source note:** NREC's examprocedures.html still names PSI as administrator, but it is stale — the April 2025 Pearson VUE handbook, the Jan 2026 NREC application checklist, and NREC's applicationprocess.html all confirm Pearson VUE is the current administrator. Audit (4 question fixes, all re-seeded): NE-07 displayed agency-types question fixed "Five types" → "Six types" (NREC brokerage-relationships pamphlet + Neb. Rev. Stat. 76-2401–76-2430: buyer/tenant/seller/landlord limited agency, dual limited agency, common law agency — Nebraska has NO non-agent/facilitator) and the non-displayed NE-07.1 facilitator-fiction question rewritten to the default buyer's-limited-agent rule; NE-14 displayed fair-housing question fixed "Marital status" → "Military or veteran status" (Neb. Rev. Stat. 20-318) and three non-displayed NE-14.1 questions corrected (age 40+ and public-assistance/Section-8 are NOT Nebraska protected classes); NE-02.3 auctioneer question fixed "licensed auctioneers are exempt" → "must comply with the License Act" (Neb. Rev. Stat. 81-887.03). Re-seeded NE-02/NE-07/NE-14 to Supabase. Filter expanded with `/course #\d{3,4}/` to drop NE-02 Course #7000 (post-license) and NE-05 Course #6000 (designated-broker education) leaks; grep-confirmed the pattern matches only NE-02/NE-05 across all states, so no other live state's picks changed. Also verified: NREC = 7 members (Secretary of State chairs + 6 Governor-appointed per 81-885.07), SPCD on 1-4 residential units delivered before the contract (76-2,120), out-of-state subdivision threshold 25+ lots → subdivision certificate (81-885.33+), broker-conducted closings (Nebraska is not attorney-only), agency disclosure at first substantial contact, trust-account/commingling rules. |
| 29 | NV | Nevada | 185 | ✅ | shipped 2026-05-29. Verified facts against Pearson VUE Nevada Real Estate Candidate Handbook #092900 (July 2025, rev 09/2025) + content outlines #092901 (Nevada state outline eff. 01/15/2025, national outline eff. 04/01/2025) + NRS 645.090/645.310/645.577/645.995, NRS 116.4109, NAC 645.657: salesperson combination exam 120 scored (80 general + 40 Nevada state), 240 min (150 + 90), 75% per portion scored separately, $100 exam fee paid to the Nevada Real Estate Division (NRED) via red.prod.secure.nv.gov (prep sites citing $90 are stale), $125 salesperson license fee. Audit (5 question fixes across NV-01/03/09, all re-seeded): NV-01 Commission composition corrected — all five members must be licensed real estate professionals (broker 3+ yrs or broker-salesperson 5+ yrs) per NRS 645.090, Nevada seats NO public members (Q1 explanation fixed; displayed Q15 answer flipped "Three licensees and two public members" → "All five must be licensees"); NV-03 broker-transfer notification flipped 10 → 30 days per NRS 645.577 (Q17), and conviction-report explanation tightened to NRS 645.995 (10 days for a practice-related felony or any crime of fraud/deceit/misrepresentation/moral turpitude, NOT broker-association changes) (Q3); NV-09 trust-deposit deadline flipped "3 business days" → "by the end of the next banking day" per NAC 645.657 (Q9 + 1 non-displayed sibling explanation). Re-seeded NV-01/NV-03/NV-09 to Supabase. Verified correct (no change): prior-appropriation water doctrine (Q14), HOA resale package 10 calendar days per NRS 116.4109 (Q11), in-state Nevada trust-account requirement per NRS 645.310 (not an Iowa-style error), broker's licensed name required in all advertising (Q8). Flagged for user review (NOT fixed): NV-05 frames the "Consent to Act" form as the foundational pre-service agency disclosure, but in Nevada that role belongs to the "Duties Owed by a Nevada Real Estate Licensee" form (NRS 645.252) while Consent to Act is the dual-agency consent (NRS 645.253/645.254) — displayed Q5/Q19 rest on this framing (timing answers defensible, form attribution imprecise); NV-09 #2 (non-displayed) says a broker may keep up to $200 personal funds in the trust account, but the NRED Trust Fund Accounting guide 4th ed. caps it at $100 (current NAC figure unconfirmed). |
| 30 | NH | New Hampshire | 210 | ✅ | shipped 2026-05-29. Verified facts against the OPLC Real Estate Examination page + Boston Real Estate Class / US Realty Training summaries of the current PSI candidate handbook + RSA 331-A (full chapter at gc.nh.gov/rsa) + RSA 477:4-c + RSA 78-B + RSA 356-B + N.H. Admin. Code Rea 404.05 (Advertisements) + Rea 701 (Disclosure: 701.01 brokerage relationship, 701.03 private water supply, 701.05 sewage). Salesperson combination exam: 120 scored (80 national + 40 New Hampshire), 240 min (150 + 90), 70% per portion scored separately, $67 first attempt / $65 retake, administered by PSI for the NHREC within OPLC. Audit (3 question fixes, NH-12.1 same key topic): NH-12.1 stale 5-unit POS threshold corrected — RSA 356-B:49 actually exempts condominiums of "not more than 10 units" from registration / Public Offering Statement requirements (unless time sharing is involved); displayed Q12 correct answer flipped "Five or more units" → "More than 10 units," and two non-displayed siblings ("3-unit project exemption" framing, AG-reviews-POS explanation) rewritten to match the actual 10-unit cutoff with RSA 356-B:49 / :51 / Form CPLC122 citations. Re-seeded NH-12 to Supabase. Verified correct (no change): post-2023 Recovery Fund repeal + $25,000 surety bond framework (RSA 331-A:14, repeal of RSA 331-A:28–35 by 2023 ch. 79 §336 eff. 9/1/2023), five RSA 331-A:25-b through :25-f brokerage relationships including the facilitator role, RSA 331-A:13 in-state trust account, RSA 477:4-c private water-supply disclosure, RSA 78-B $0.75/$100 transfer tax per party (1.5% combined), RSA 354-A Law Against Discrimination, RSA 540:3 default 30-day eviction notice (7 days for nonpayment / substantial damage), RSA 672/674 planning and zoning. |
| 31 | NJ | New Jersey | 290 | ✅ | shipped 2026-05-29. Verified facts against the PSI New Jersey Real Estate Candidate Information Bulletin (updated 2/1/2026) + NJREC site (nj.gov/dobi/division_rec) + N.J.S.A. Title 45 Ch.15 + N.J.A.C. 11:5: salesperson combination exam 110 scored (80 national + 30 NJ state), 240 min, scored as a single combined 70% (77 of 110, unlike the per-portion broker exam), $45 PSI fee, administered by PSI for the New Jersey Real Estate Commission (a division of the Dept. of Banking and Insurance). Audit: NJ-09.1 (displayed Q9) explanation law name corrected from the nonexistent "Consumer Protection and Equity Act" to the actual "Real Estate Consumer Protection Enhancement Act" (CPEA, eff. 8/1/2024 per NJ Realtors + Saul Ewing); answer "all sellers incl. banks/estates" verified correct. NJ-12.1 (displayed Q12) explanation corrected — NJ does NOT legally require an attorney at closing (title/settlement companies conduct closings in South Jersey, attorneys customary in North Jersey), so the prior flat "attorney state" claim was softened; non-displayed sibling NJ-12.1 #3 false "NJ requires separate attorneys" premise rewritten to "customarily retain." Also fixed 3 non-displayed NJ-12.2 explanations that defined lien theory backwards ("In lien theory states, the lender holds legal title" → "title theory states"). Re-seeded NJ-09/NJ-12 to Supabase. Verified correct (no change): Q7 in-state trust account IS required per N.J.S.A. 45:15-12.5 (not an Iowa-style error), Q13 Realty Transfer Fee $2.00/$500 up to $150,000, Q20 Guaranty Fund $10 salesperson/$20 broker per N.J.S.A. 45:15-35, Q5 CIS agency disclosure at first contact (N.J.A.C. 11:5-6.9), Q11 3-business-day attorney review (N.J.A.C. 11:5-6.2), Q10 LAD source-of-income, Q14 just-cause eviction, Q15 Pinelands Commission, Q16 Mount Laurel doctrine. |
| 32 | NM | New Mexico | 205 | ✅ | shipped 2026-05-29. Verified facts against NMSA 1978 §61-29-4 (NMREC = 5 members: 4 brokers + 1 public) + NM RLD Real Estate Commission apply-for-license page + PSI "NM Broker Exam" program page (PSI administers for NMREC under RLD): combination Associate Broker exam 125 scored (75 national + 50 state), 180 min (120 + 60), 75% per portion scored separately, $95 PSI exam fee ($270 license application). NM is a broker-only state (entry license = associate broker, no salesperson). Caught and discarded a WebFetch hallucination (a generic "80+40 / $120 / salesperson" summary of the PSI online-app PDF) by checking the regulator's own statute/rule and three corroborating sources. Audit: NM-04.2 qualifying-broker experience question wrong answer flipped "2 years within prior 5" → "4 years within prior 5" per 16.61.3.10 NMAC (4 yrs active in the 60-month period for a SUPERVISING QB — the only kind the bank frames; 2 yrs is the non-supervising tier, and "4 years" was not even an option); non-displayed NM-04.2 inactive-status sibling explanation corrected off the stale 2-year figure. Re-seeded NM-04 to Supabase. Verified §28-1-7 Human Rights Act (2001 amendment replaced "marital status" with "spousal affiliation," so Q13's "marital status" EXCEPT answer is correct), prior-appropriation water + OSE (NM Const. Art. XVI), 1/3 assessed value (§7-37-3), PID assessments run with the land, and the NM broker duties owed to all parties (16.61.19 NMAC). |
| 33 | NY | New York | 260 | ✅ | shipped 2026-05-29. Verified facts against the NYS Department of State Division of Licensing Services (dos.ny.gov/real-estate-agent) + RESNYS written-exam-requirements summary of the DOS/eAccessNY process: single combined salesperson exam, 75 multiple-choice questions, 90 min, 70% to pass, $15 exam fee (lowest in the nation, paid to DOS through eAccessNY, not PSI/Pearson), $65 license fee, built on the 77-hour qualifying curriculum. Audit: NY-09.1 zoning-authority explanation corrected — it cited "Article 9-A" (that is RPL Article 9-A, the subdivided-lands law); NY zoning power is delegated through Town Law Article 16, Village Law Article 7, and General City Law Article 2-A (correct answer "municipality's legislative body" unchanged). Re-seeded NY-09 to Supabase. Filter: added `\d+ questions with a \d+% passing score` to drop the NY-02 exam-format-trivia question (75q/70%) that duplicated the FAQ; diffed all 32 prior live states before/after, only NY's picks changed (replacement is the substantive single-broker-association rule, verified). Verified correct (no change): Q7 PCDS $500-credit alternative eliminated effective March 20, 2024 (signed 9/22/2023, per NYSBA/NYSAR), Q14 NYS transfer tax 0.4% under $3M / 0.65% at $3M+ residential, Q19 broker supervision under 19 NYCRR 175.21, Q3 Executive Law Article 15 Human Rights Law protected classes, Q13 lien theory, Q17 NYC Rent Guidelines Board, Q5 RPL 443 first-substantive-contact agency disclosure. |
| 34 | NC | North Carolina | 255 | ✅ | shipped 2026-05-29. NC is a broker-only state (entry license = Provisional Broker); comprehensive exam administered by Pearson VUE for the NCREC. Verified facts against the NCREC April 2026 "Real Estate Licensing in North Carolina" handbook (pearsonvue.com .../093400.pdf) + NCREC exam-change bulletin (bulletins.ncrec.gov/license-exam-change-is-here-and-it-is-good) + GS 93A and 21 NCAC 58A: 140 scored items (80 national + 60 state), 4h total (150 + 90 min), scaled 75 per section scored separately, $63 Pearson exam fee ($53 single-section), $105 NCREC application fee. Audit: NC-07 displayed Q7 wrong answer fixed "3 days" → "within a reasonable time" per GS 93A-6(a)(13) (statute sets a reasonable-time standard, not a fixed day count; the 3-day figure is actually the WWREA disclosure deadline under 21 NCAC 58A .0104(c)); NC-08 displayed Q8 miscited GS 93A-13 and was reframed — operating under an oral listing is unlawful under Rule 58A .0104(a) (written agency agreement required at formation), whereas GS 93A-13 "Contracts for broker services" only makes the oral agreement unenforceable for commission recovery (the old answer's distractor was therefore also defensible); NC-01 stale fees corrected ($60→$63 comprehensive, $50→$53 single-section, $100→$105 application) and the wrong "new application fee on retest" claim removed from displayed Q1. Re-seeded NC-01/07/08 to Supabase. Verified correct (no change): Q5 WWREA required for commercial sales per 58A .0104(c), Q11 due-diligence fee paid to seller not trust, Q12 trust account GS 93A-6(a)(12) (no in-state-bank error), Q13 Good Funds Settlement Act recording-before-disbursement, Q14 octennial reappraisal, Q16 tenancy by the entirety default, Q18 Limited Nonresident Commercial Broker, Q19 conviction reporting 58A .0113, Q20 BIC trust-account responsibility. |
| 35 | ND | North Dakota | 200 | ✅ | shipped 2026-05-29. PSI-administered for the North Dakota Real Estate Commission (NDREC). Verified facts against the PSI/NDREC Real Estate Salesperson and Broker Candidate Information Bulletin (© 2025 PSI, rev 10/1/2025) + NDCC 43-23 (commission/discipline) + 43-23.2 (Recovery Fund) + NDAC 70-02-03 (advertising/licensee responsibilities). Salesperson combination exam: 100 national + 40 state = 140 scored, 150 + 90 = 240 min, national 70% / state 75% scored separately, $134 PSI combo fee (the $131/$150 figures on prep sites and a lossy PDF read are stale; bulletin p.1 says $134). Resolved a PSI-vs-Pearson-VUE administrator conflict — a generic search hit named Pearson VUE, but the regulator's exam-information + how-to-apply pages and the current bulletin all confirm PSI. Audit found NO wrong question answers across the picked 20; all statute cites confirmed against the official NDCC PDFs (NDREC 5 members = 3 active brokers + 2 public, 2 consecutive 5-yr term limit per 43-23-01/02; commingling + acting-for-more-than-one-party-without-consent grounds per 43-23-11.1(e)/(d); Recovery Fund $20 one-time fee + $15k per-licensee cap + 4% repayment interest per 43-23.2-02/08/09; advertising trade-name-equal-or-larger per NDAC 70-02-03-02.1; appointed agent per 43-23-06.1). Filter expanded with `renewal application`, `fails? to renew`, `\d+ additional hours` to drop 3 licensing-process leaks (ND-03 renewal late-fee + Jan-15 cancellation, ND-02 broker-upgrade education hours); promoted replacements (entry-level license type, designated-broker duty on revocation, exclusive-agency commission) verified correct. Diffed all 35 live states before/after the filter change: only ND changed — an earlier broader `upgrade to broker license` pattern also caught a Mississippi broker-upgrade question (which would have promoted MS's unverified "2025 rules / MREC notice" claim into its displayed 20), so it was narrowed to `\d+ additional hours`. No question JSON edited, so no mobile-repo commit and no Supabase re-seed. |
| 36 | OH | Ohio | 260 | ✅ | shipped 2026-05-30. PSI-administered for the Ohio Division of Real Estate & Professional Licensing (Dept. of Commerce, overseen by the 5-member Ohio Real Estate Commission per ORC 4735.03). Verified facts against the Ohio Dept. of Commerce / PSI Real Estate Salesperson & Broker Candidate Information Bulletin (Examination Summary Table: salesperson 80 national + 40 state = 120 items, 120 + 60 = 180 min, 70% per portion scored separately) + codes.ohio.gov. Fee recorded as $63 (the bulletin's "State & National taken at same time" figure; some 2026 prep sites list $61 — used the regulator bulletin per the prefer-the-regulator rule, flagged for user awareness). Audit found NO wrong question answers across the picked 20; verified ORC 4735.081 (principal broker designation), 4735.18(A)(26) (trust/special account must be at an in-state depository — Ohio genuinely requires this, NOT an Iowa-style error), 5302.30 (seller completes the Residential Property Disclosure Form), 4112 (Ohio Civil Rights Act / OCRC), 4735.12 (Recovery Fund covers acts in a licensed capacity only), 4735.142 (permanently resigned is final, must reapply), 4735.14/.141 (no CE while inactive, 30 hrs to reactivate), Ohio judicial-foreclosure-only, semi-annual property tax, no security-deposit cap (ORC 5321.16). Filter expanded with `permanently resigned` and `inactive [state] real estate license` to drop 2 licensing-process leaks (resigned-status reapplication, inactive-CE) from the displayed 20; replacements (disciplinary suspend/revoke status, FSBO owner-exemption) verified correct. Diffed all 36 built pages before/after the filter change — only Ohio changed. No question JSON edited, so no mobile-repo commit and no Supabase re-seed. |
| 37 | OK | Oklahoma | 220 | ✅ | shipped 2026-05-30. Pearson VUE-administered for the Oklahoma Real Estate Commission (OREC). Verified facts against the Pearson VUE/OREC Oklahoma Real Estate Candidate Handbook #093800 (July 2024, rev 03/2025) + content outlines #093801 (Oklahoma state outline eff. 04/02/2024, national salesperson outline eff. 06/01/2025) + OREC application-and-exam FAQs (oklahoma.gov/orec). Two SEPARATE exams: 80-item national (150 min, 5 pretest) + 40-item Oklahoma state (90 min, 10 pretest), scaled 70% per portion scored separately, $75 two-for-one combo fee (each portion $75 alone), $35 OREC application fee; entry license = Provisional Sales Associate. Audit found NO wrong question answers across the picked 20: verified OREC composition (7 members = 5 brokers + 1 real-estate-school rep + 1 lay person, 4-yr terms, ≤2 per congressional district, Senate-confirmed, 3-yr OK residency per 59 O.S. §858-201), Broker Relationships Act via HB 2524 eff. 11/01/2013 abrogating common-law agency (§858-360; eliminated agent/subagent/dual agent), BRA duties owed to all parties (honesty + reasonable skill and care) and timely written-offer presentation, 13-member Contract Form Committee (5 OREC + 3 OBA + 5 OAR), trust funds deposited by the 3rd banking day, RPCDA two-track disclosure-vs-disclaimer (60 O.S. §831 et seq.), no statutory residential security-deposit cap, 15-hour Broker-in-Charge course confirmed real (not an NC import). Filter expanded with OK-specific patterns (`active sales associate experience`, `broker-in-charge course`, `Oklahoma (broker|salesperson) state exam`, `exam authorization`, `per portion`) to drain the wholly licensing/exam-process OK-02 bucket that was leaking 2 demo slots (broker-experience requirement + Broker-in-Charge course); promoted replacements (BRA timely-offer presentation, supervising-broker-plus-associate liability for an associate's misrepresentation) verified correct. Diffed all 37 built state pages before/after the filter change — only Oklahoma changed. No question JSON edited, so no mobile-repo commit and no Supabase re-seed. |
| 38 | OR | Oregon | 255 | ✅ | shipped 2026-05-30. Broker-only state (entry license = Broker, no salesperson; Principal Broker is the supervising tier); PSI-administered for the Oregon Real Estate Agency (OREA). Verified facts against the PSI Oregon Real Estate Broker, Principal Broker and Property Manager Candidate Information Bulletin (Effective 10/1/2020, served at proctor2.psionline.com/media/programs/380 OR RE.pdf) Examination Summary Table + content outlines, cross-checked against current 2026 prep-site data and OREA eLicense: combination broker exam 130 scored (80 national + 50 Oregon state), 195 min (120 + 75), 75% per portion scored separately, $75 PSI fee, $300 OREA license application fee. Caught and discarded a WebFetch PDF hallucination (it claimed 40 state items / 60 min / $100 exam + $75 registration) by reading the bulletin PDF pages directly — the Summary Table says 50 state items / 75 min / single $75 fee. Audit found NO wrong question answers across the picked 20: verified OREA single-Commissioner model (ORS 696.375, Governor-appointed, not a commission), ORS 696.301 disciplinary grounds (commingling, compensation only through one's principal broker, fraud/misrepresentation), OAR 863-015-0250 3-banking-day document transmittal to the principal broker (Q4/Q20), ORS 105.462-105.490 seller's property disclosure on 1-4 units delivered on a written offer (Q8), ORS 659A.421 source-of-income protected class beyond federal FHA (Q10), SB 608 (2019) just-cause termination after 12 months (Q11), Oregon Trust Deed Act ORS 86.705 borrower-as-grantor (Q12), SB 100 (1973) statewide land use program (Q13), prior-appropriation water rights (Q15), ORS 92.010-92.990 subdivision = 4+ lots / partition = 2-3 (Q16). No question JSON edited, so no mobile-repo commit and no Supabase re-seed. |
| 39 | PA | Pennsylvania | 255 | ✅ | shipped 2026-05-30. Pearson VUE-administered for the Pennsylvania Real Estate Commission (Bureau of Professional and Occupational Affairs, Dept. of State). Verified facts against the Pearson VUE/PREC Pennsylvania Real Estate Candidate Handbook #093900 (March 2026, rev 03/2026) + PA Salesperson state content outline #093901 (eff. 03/16/2026) + 49 Pa. Code Ch. 35 + RELRA (63 P.S. §§ 455.101 et seq.): two-part salesperson exam 120 scored (80 national + 40 PA state), 210 min (150 + 60), 75% per portion scored separately, $52 combined fee (national-alone $52, state-alone $49; combination discount when both portions are on the same order). Audit found NO wrong question answers across the picked 20: verified PREC composition (11 members = 5 brokers w/ 10 yrs + 1 cemetery broker + 3 public + 2 ex officio per RELRA 455.202), Act 52 of 2024 wholesaler cancellation (30th day after execution or before conveyance, whichever is sooner), Consumer Notice at first substantive contact / initial interview (49 Pa. Code 35.336), escrow deposit by end of the next business day (49 Pa. Code 35.324), advertising must carry the employing broker's business name AND telephone number of equal size (49 Pa. Code 35.305), Seller's Property Disclosure on 1-4 units (68 Pa.C.S. 7301-7315), PHRC fair-housing enforcement, PAR Standard Agreement of Sale, security deposit max 2 months first year / 1 month after (68 P.S. 250.511a-b), state realty transfer tax 1% (+1% local typical), Recovery Fund court-judgment prerequisite + one-year-after-appeals filing window (RELRA 455.803). No question JSON edited, so no mobile-repo commit and no Supabase re-seed. Flagged for user review (NOT fixed, displayed Q15): the timeshare 7-day rescission answer is correct and verified via 68 Pa.C.S. 4405, but the explanation labels it "PA Timeshare Act (68 Pa.C.S. 4401-4414)" — Chapter 44 is technically the Real Estate Cooperative Act's time-share provisions, so the act-name label is imprecise even though the period and substance are right. |
| 40 | RI | Rhode Island | 165 | ✅ | shipped 2026-05-30. Pearson VUE-administered for the RI Department of Business Regulation (DBR), Division of Commercial Licensing; oversight by the RI Real Estate Commission. Verified facts against the Pearson VUE RI Real Estate Candidate Handbook #094000 (January 2026) + content outlines #094001 (RI state outline eff. 08/21/2025, national salesperson outline eff. 04/01/2025) + DBR Real Estate Salesperson Application (rev 12/29/2023). Salesperson combination exam: 80 national (2.5h, $53) + 50 state (1.5h, $50) = 130 scored, 240 min, scaled 70 per portion scored separately, $103 total exam fee; license fee $140 + $25 Real Estate Recovery Account, biennial 2-year license. State outline weighting: Statutory Requirements Governing Licensee Activity 48%, Additional Topics 36%, Licensing Requirements 12%, Duties/Obligations 4%. Audit: RI-02.2 wrong answer flipped — application/exam-result validity corrected from "24 months" to the one-year rule (handbook + DBR application both require filing within one year of passing; passing results valid one year, so a 20-month gap means retake). Re-seeded RI-02 to Supabase. Filter expanded with 4 RI-unique patterns (`lead paint (course\|module)`, `approved application`, `each section of the Rhode Island`, `Rhode Island real estate licenses be renewed`) to drain the wholly-licensing-process RI-02 bucket's 4 demo leaks; promoted substantive replacements (broker-change DBR notification; MLO/RE dual-compensation prohibition per H5811/S936 Public Law 2025 eff. 6/24/2025) verified. Diffed all 40 built state pages before/after the filter change — only RI changed. Verified statutes: RIGL 5-20.5-26 (escrow at a federally insured institution in RI — genuine in-state requirement, not an Iowa-style error), 5-20.5-14 ($2,000 max administrative penalty per violation), 5-20.6-8 (MRED before disclosing confidential info; designated client representative / transaction facilitator / dual facilitator are the actual RI relationship types — "dual facilitator" is real, not a fiction), 5-20.8-2 (sales disclosure before signing the transfer agreement, 1-4 units + vacant land), 23-19.15-12 (cesspool removed/replaced within 12 months of sale), 34-36.1-4.09 (condo resale certificate within 10 days), 34-18-19 (security deposit capped at one month's rent), 34-37 (lawful source of income protected since the 2021 amendment, incl. Section 8), individual E&O $50k/claim + $150k aggregate. |
| 41 | SC | South Carolina | 221 | ✅ | shipped 2026-05-30. PSI-administered for the South Carolina Real Estate Commission (LLR). Verified facts against the PSI/SCREC client bulletin (llr.sc.gov/re/recpdf/Renewal/PSI Candidate Bulletin.pdf, modified 6/4/2021) + LLR Associate Licensure Requirements/Application (rev 06/20/2024) + live PSI test-takers portal + 2026 prep-site consensus: current combination Salesperson exam 120 scored (80 national + 40 state), 200 min (120 + 80), 70% per portion scored separately (56/80 + 28/40), $63 PSI combo fee ($55 single portion), $25 application + $50 initial associate license fee. **Competing-source note:** the 6/4/2021 PSI client doc's items line still reads 80+30=110 / 180 min, but its own passing-score line (state pass = 28) only works for a 40-question state portion (28/40 = 70%, not 28/30 = 93%), and the live portal now shows the state portion at 80 min — so 120/200min is current and the 110 figure is stale. SC entry license is the "associate" (Title 40 Ch.57, restructured by Act 170/2016; chapter retitled "...Associates..." by 2025). Audit found NO wrong question answers across the picked 20: verified SCREC 10-member elected/appointed composition (§40-57-40), §40-57-710(7) guaranteeing-future-profits discipline, four brokerage relationships incl. transaction brokerage (§40-57-350 + SC Disclosure of Real Estate Brokerage Relationships form — not a transaction-broker fiction), demand-deposit trust account in an SC-authorized institution (§40-57-135/136, genuine in-state requirement), attorney-supervised closings (SC Supreme Court), 4% owner-occupied assessment (§12-43-220), no security-deposit cap (Title 27 Ch.40), Beachfront Management Act now under SCDES Bureau of Coastal Management (Act 60/2023, eff. 2024), non-delegable BIC supervision (§40-57-360), BIC written policy manual (§40-57-137(B)), broker 5-yr active-associate experience + Unit IIIA/IIIB. Filter expanded with 5 SC-only phrases (Unit I, active associate licensure, property manager licensing, manage rental properties in SC, SC CE) to drain the wholly-process SC-02 bucket's 2 demo leaks (Unit I pre-license, broker experience); promoted replacements (trust-account naming = trust/escrow, blind-ad prohibition) verified. Diffed all 41 built state pages before/after the filter change — only South Carolina changed. No question JSON edited, so no mobile-repo commit and no Supabase re-seed. |
| 42 | SD | South Dakota | 120 | ✅ | shipped 2026-05-30. Broker-only state — the entry license is the **Broker Associate** (SD has no "salesperson" license; salesperson is a legacy/inactive role only). PSI-administered for the South Dakota Real Estate Commission (DLR). Verified facts against the PSI Real Estate Broker Associate Examination Candidate Information Bulletin (rev 10/1/2023, proctor2.psionline.com/programs/Instructions/SDRE.pdf) + dlr.sd.gov/realestate exam_information & license_types_requirements pages: combined exam 142 scored (90 national / 100 points / 150 min + 52 state / 120 min), 75% scaled per portion scored separately, 4.5h, 116-hr pre-license course. **Fee discrepancy flagged:** the regulator's live exam_information page says "$105 at time of registration," but the 2023 PSI bulletin still lists $98 (combo) — used $105 per the prefer-the-regulator tie-break; prep sites echo the older $98. National outline (Contracts 19%, Agency 13%, Practice of RE 12%, Property Ownership 10%, Financing 9%, Valuation 8%, Disclosures 7%, Transfer 6%, Land Use 5%, Property Mgmt 5%, Calculations 6%) and SD state outline (Commission duties/powers 4 items + Licensing 6 + Statutory activity requirements 42 = 52) from the bulletin. Audit found NO wrong question answers across the picked 20 (all SD-specific): verified SDREC = 5 members, 3 active brokers + 2 public, not all one party (SDCL 36-21A-13); grounds-for-denial NSF checks within the calendar year before application (36-21A-33); Recovery Fund $15,000-per-person cap + unsatisfied-judgment prerequisite (36-21A-104); E&O as a condition of licensure (36-21A-119) at $100k/claim + $500k aggregate, $1,000 damage / $500 expense deductibles (matches the current RISC group policy Jan 2026–Jan 2027); earnest money on the first legal banking day after acceptance (36-21A-80); seller's property condition disclosure on residential ≤4 units before the buyer's written offer (43-4-44); single/limited/appointed agency framework with limited agency = in-company dual requiring informed written consent (no transaction-broker fiction); residential rental agent requires no education or exam (regulator license-types table), PM 40 hrs + exam, auctioneer 116 hrs + exam; prior-appropriation water doctrine. No question JSON edited, so no mobile-repo commit and no Supabase re-seed. Minor flag (not fixed, displayed Q19): the explanation says E&O limits are "for 2025" while the current group-policy period is 2026, but the figures are unchanged and correct. |
| 43 | TN | Tennessee | 240 | ✅ | shipped 2026-05-30. PSI-administered for the Tennessee Real Estate Commission (TREC), Dept. of Commerce & Insurance; entry license = Affiliate Broker. Verified facts against the PSI/TREC Tennessee Real Estate Candidate Information Bulletin (Updated 7/1/2025) Examination Summary Table + Score Reporting table + tn.gov/commerce/regboards/trec PSI & fees pages: combination Affiliate Broker exam 120 scored (80 national + 40 state), 160 + 80 = 240 min, 70% per portion scored separately (56/80 + 28/40), $63 PSI combo fee ($37 national-only / $26 state-only), $91 initial affiliate broker license. Audit (3 question fixes, all re-seeded): TN-06 "five agency types" fiction removed — per the TREEF/TAR Guide to Tennessee's Agency Law a facilitator is NOT an agency relationship (it is the lack of one), reframed to the T.C.A. § 62-13-401 written-bilateral-agreement creation rule; TN-11 trust-account in-state fiction flipped — TREC Rule 1260-02-.09 requires a separate federally insured escrow/trustee account but does NOT require a Tennessee-located institution (2 questions: displayed Q11 + out-of-state-online-bank sibling); TN-12 net listings "discouraged" → "prohibited" — TREC Rule 1260-02-.07 bars any listing based on a "net price." Re-seeded TN-06/11/12 to Supabase. Filter expanded with 6 TN-only phrases (Course for New Affiliates, take the exam now, apply for a Tennessee license, Notify TREC of the address change, Register with TREC as a licensed firm, Tennessee real estate license be displayed) to drain the wholly-process TN-02 (state_licensing) bucket's 2 demo leaks (course-sequence + exam-eligibility); promoted replacements (affiliate-works-under-principal-broker, facilitator definition) verified. Diffed all 43 built state pages before/after the filter change — only Tennessee changed. Also verified: Q15 assessment ratios 25/40/55% (TN Const. Art. II §28), Q10 RPCD 1-4 units (T.C.A. 66-5-201), Q16 four license types + Q1 TREC dept (bulletin), Q3/Q18 E&O requirement, Q4/Q19 § 62-13-312 discipline grounds, Q5/Q20 advertising firm-name rule, Q7 dual-agency written consent, Q8 compensation via principal broker, Q14 attorney-optional closings, Q13 no state-mandated forms. |
| 44 | TX | Texas | 185 | ✅ | shipped 2026-05-30. Pearson VUE-administered for the Texas Real Estate Commission (TREC). Verified facts against the Pearson VUE Texas Real Estate Candidate Handbook (January 2026, #094400) + Texas Sales Agent State Law Content Outline (eff. 1/1/2026, in #094400) + TREC become-licensed/sales-agent page + Tex. Occ. Code Ch. 1101: combination Sales Agent exam 120 scored (80 national + 40 state, plus 5/10 unscored pretest), 240 min (150 + 90), 70% per portion scored separately (56/80 + 28/40), $43 Pearson VUE fee. Audit: TX-01 Q19 (TREC term limits) wrong answer corrected — Occ. Code §1101.055 sets staggered six-year terms but NO term/reappointment cap, so the marked answer "cannot be reappointed" was legally false; rewritten so the correct answer is that a member may be reappointed (no statutory limit), with the old misconception kept as a distractor. Re-seeded TX-01 to Supabase. Filter expanded with TX-only phrases (`sales apprentice education`, `SAE`, `deferral fee`) to drain TX-03's education/CE-hours leaks (SAE 270-hour first-renewal, $200 CE deferral fee, SAE+Legal-Update) so a substantive question (broker-sponsorship change → notify TREC) represents the state_licensing bucket; grep-confirmed those phrases appear only in TX files (SAE in TX-02 only as a distractor, which the question_text+correct_answer filter ignores), and diffed all 44 built state pages before/after the change — only Texas changed. Also verified: Q1 TREC composition 9 members (6 brokers 5-yr + 3 public, §1101.051), Q2 owner-selling-own outside the brokerage definition, Q5 Recovery Trust Account, Q7 IABS at first substantive dialogue (§1101.558 / TREC Rule §531.20), Q8 intermediary not dual agency (§1101.559), Q10 earnest money by 2nd working day (TREC Rule §535.146 → Wed), Q11 compensation via sponsoring broker, Q12 six promulgated forms incl. Unimproved Property Contract, Q13 option fee to seller + earnest money refunded on option-period termination (TREC 20-16 ¶5), Q14 foreclosure exempt from Seller's Disclosure (Prop. Code §5.008), Q15 inheritance during marriage = separate property (Fam. Code §3.001), Q16 DTPA treble + attorney's fees for a knowing violation (§17.50), Q17 security deposit within 30 days of surrender (Prop. Code §92.103 → Mar 31), Q18 VLB general obligation bonds, Q20 on-site apartment manager exemption (§1101.005(7)). Flagged (NOT displayed, filtered out): TX-03's SAE "first renewal = 270 hours" conflates total qualifying education with the SAE increment and is debatable; left unfixed as a licensing-process question. |
| 45 | UT | Utah | 215 | 🟡 | |
| 46 | VT | Vermont | 220 | 🟡 | |
| 47 | VA | Virginia | 250 | 🟡 | |
| 48 | WA | Washington | 230 | 🟡 | |
| 49 | WV | West Virginia | 195 | 🟡 | |
| 50 | WI | Wisconsin | 261 | 🟡 | |
| 51 | WY | Wyoming | 190 | 🟡 | |

**Progress: 44 / 51 live.**
