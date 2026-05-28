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
every state** — you don't author it per-state, but know what it says:

- H2: *"Want the rest of [State]'s {totalBankPretty}-question bank?"*
- Body opens: *"The RealReady app has all {totalBankPretty} questions
  covering both national real estate principles and [State]-specific
  law, with topic articles, a missed-question drill mode, detailed
  explanations on every question, and progress tracking that shows
  your per-category accuracy."*
- Body closes with the **no-subscription beat**: *"Unlike other real
  estate prep apps, we don't cut off access or charge a monthly
  subscription fee. Once you buy, it's yours forever."*

Both the H2 and the body reference the full `totalBankPretty` count
(NOT `totalBank - 20`). If you find yourself touching this CTA, keep
the count consistent.

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

#### Important — fix the question in BOTH places

> The question bank lives in **two repos**. The web's copy at
> `src/content/questions/[XX]-NN.json` is a sync of the mobile app's
> source at `../realready/data/questions/[XX]-NN.json` (produced by
> `npm run sync-questions`). **Fixing the web's copy alone is not
> enough** — the next time someone runs the sync, the mobile app's
> version overwrites your fix, the deploy regresses, and the mobile
> app keeps showing wrong answers to paying users.
>
> **The rule:** every question correction must be applied to **both**
> files:
> 1. `realready/data/questions/[XX]-NN.json` (mobile app source — the
>    canonical bank)
> 2. `realready-web/src/content/questions/[XX]-NN.json` (web's synced
>    copy — what build-time `getStateData()` reads)
>
> They live in **separate git repos** — the outer
> `marknygren/real-estate-app` repo owns the mobile app and its data,
> and `marknygren/realready-web` owns the website. Commit + push to
> both. Alternative: edit only the mobile app source, then run
> `npm run sync-questions` from `realready-web/` to overwrite the
> web's copy from source — that keeps the two trees identical by
> construction.

Either way, capture the change in your commit message with a source
URL on both repos: *"Verified Q7 against [Civil Code §2079.16 URL];
flipped marked answer."*

#### 4c. Mini-rubric before flipping the row to ✅

Don't mark a state ✅ on the status table unless:

- [ ] All 6 exam-facts fields verified against a current regulator source (URLs captured in commit)
- [ ] All 20 questions' correct answers verified
- [ ] All 20 questions' explanations checked for stale facts (statutes, agency names, percentages)
- [ ] FAQ entries' dollar figures and percentages match the regulator's current page
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
| 5 | CA | California | 260 | ✅ | shipped 2026-05-25, pilot. Audit 2026-05-27: fee $60→$100, Q7 answer flipped (Civil Code §2079.16), Q3 + Q6 tightened |
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
