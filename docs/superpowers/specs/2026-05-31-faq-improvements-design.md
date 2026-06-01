# FAQ improvements across all state pages — design

Date: 2026-05-31
Status: approved direction, pending spec review

## Goal

Improve the per-state FAQ blocks on the 51 `/states/[slug]/` pages for two
ends the user named:

1. **SEO** — more search-query coverage and less near-duplicate-FAQ look across pages.
2. **Answering questions about RealReady** — the FAQ currently says almost
   nothing about the product itself; only "best way to prepare" name-drops it.

## Current state (audit)

- All 51 states share the **same 7 exam-logistics FAQ questions** (Louisiana
  has 8). Answers carry state-specific facts but the question *set* is uniform.
- The 7: how many questions / passing score / cost / how long / is it hard /
  what's on it / best way to prepare.
- **Technical SEO is already done**: each state page emits `FAQPage` JSON-LD
  (`src/pages/states/[state].astro:61`) plus `Question` schema for the 20
  practice questions. Question wording already matches real Google queries.
- **Gap**: zero product FAQs. Anyone Googling "is RealReady free", "does
  RealReady cover the [State] exam", "is RealReady a course" finds nothing.

## Decision

Add **4 new FAQ entries per state**, leave the existing 7 **untouched** (they
are fact-verified and keyword-optimized; rewriting 357 verified answers is all
risk, no reward). The `FAQPage` JSON-LD picks up the new entries automatically
— no `[state].astro` template change.

Scope: **51 state JSON files only**. Homepage `/faq` (global FAQ) is out of scope.

### Which entries actually differentiate (honest framing)

Of the 4 new entries:

- **① "Who administers" and ③ "Does RealReady cover [State]" genuinely vary
  per state** — ① by administrator (PSI / Pearson VUE / self), ③ by naming that
  state's real tested topics. These are hand-authored from each state's existing
  JSON and carry the SEO de-dup + state-keyword value.
- **② "Is it free" and ④ "Is it a course" are templated product facts** that
  repeat across states by nature. That repetition is fine — they're
  product-fact questions whose answer genuinely is the same everywhere, and FAQ
  entries are expected to be self-contained for featured snippets. They are
  **not** claimed to reduce duplicate-content load; ① and ③ do that job.

**Within-page redundancy is actively avoided:** the intro P4 and the CTA band
already list the app's feature set ("short articles, detailed explanations,
missed-question drill mode, per-category progress tracking") and the CTA band
already makes the "one-time purchase, no subscription, yours forever" pitch. The
new FAQ entries must **not** repeat either of those a third time — ③ names state
topics instead of features, and ② states the pricing fact in different words
than the CTA band.

## The 4 new entries

### Entry order (inserted into existing list)

1. How many questions *(existing)*
2. Passing score *(existing)*
3. How much cost *(existing)*
4. How long *(existing)*
5. **Who administers the exam? (NEW — state-differentiating)**
6. Is it hard *(existing)*
7. What's on the exam *(existing)*
8. Best way to prepare *(existing)*
9. **Is RealReady free? (NEW)**
10. **Does RealReady cover the [State] exam? (NEW)**
11. **Is RealReady a real estate license course? (NEW)**

Logistics cluster together; product cluster sits at the end.

### Entry ① — "Who administers the [State] real estate exam?"

State-differentiating. Built from the **already-verified `examFacts.notes`**
field (every state's notes already names the administrator + regulator), so
**no new facts are introduced**.

Templating rule:

- **Third-party-administered states (PSI / Pearson VUE):**
  > The [examName] is administered by [Administrator] on behalf of the
  > [Regulator] ([ACRONYM if one exists]). You register and schedule your exam
  > date through [Administrator].
- **Self-administered states (CA, NY):**
  > The [examName] is administered directly by the [Regulator] rather than an
  > outside testing company. You register and schedule your exam date through
  > [the regulator / its scheduling system named in notes].

Rules to keep it safe:
- Use the most **real-estate-specific** regulator named in notes (e.g. FL →
  "Florida Real Estate Commission (FREC)", not DBPR).
- Acronym only when the notes already provide one.
- **No claims about result timing, online proctoring, or split scoring** in
  this entry — those vary per state and are already covered (where true) in the
  existing answers. Keep it to administrator + regulator + how you schedule.

### Entry ③ — "Does RealReady cover the [State] real estate exam?" (state-anchored)

Hand-authored per state. Names **2–3 of that state's real tested topics**
(pulled from the state's existing intro P2 / "what's on the exam" answer) rather
than repeating the app feature list. This makes ③ vary across all 51 pages
(real de-dup), reads as useful instead of salesy, and pulls in state-law
keywords.

Template:
> Yes. RealReady has a dedicated [State] question bank built for the salesperson
> exam, covering the national principles every candidate sees plus the [State]
> law that trips people up, like [2–3 real state topics from this state's JSON].

NJ worked example:
> Yes. RealReady has a dedicated New Jersey question bank built for the
> salesperson exam, covering the national principles every candidate sees plus
> the New Jersey law that trips people up, like the Real Estate Guaranty Fund,
> the Consumer Information Statement, and the attorney-review clause.

Rule: the named topics must already appear in that state's existing JSON copy —
do not introduce new state facts. **Do not** list the app's feature set here
(that lives in intro P4 + the CTA band).

### Entries ② & ④ — templated product facts

Only `[State]` is injected. RealReady facts are constant. **Worded to not parrot
the CTA band** ("one-time purchase… no subscription… yours forever").

**② Is RealReady free?**
> The 20 [State] practice questions on this page are free, no account or signup
> needed. Unlocking the rest of the [State] bank is a single in-app purchase you
> pay once and own, with no recurring charge and no time limit on access.

(States the pricing fact in different words than the CTA band's "monthly
subscription… yours forever".)

**④ Is RealReady a real estate license course?**
> No. RealReady is exam practice, not a pre-license course, so it doesn't count
> toward [State]'s required pre-license education hours. Use it after or
> alongside your coursework to drill realistic practice questions and find your
> weak spots before exam day.

Entry ④ factually answers the "is this a course?" confusion for both real
visitors and search engines. (No overlap with the CTA band, which is
pricing/features — no rewording needed.)

## Constraints / house style

- **No em dashes**, **no colons** in body copy (replace with commas / periods /
  "so" / "and").
- Real Unicode apostrophes (`'`), not `&rsquo;` (Astro escapes entities).
- **No hardcoded per-state numbers** in the new copy (no bank counts, no
  pre-license hour counts) → zero number-drift risk.
- Don't sound like AI: vary sentence length, no three-fragment endings.

## Files affected

- `src/content/states/[XX].json` × 51 — insert the 4 entries into each `faq`
  array in the order above. Entries ② and ④ are pure templates (inject state
  name). Entries ① and ③ are **hand-authored per state from that file's own
  existing copy** (① from `examFacts.notes`; ③ from the state topics already in
  intro P2 / "what's on the exam"). No new facts introduced anywhere.
- `docs/STATE_ROLLOUT_TRACKER.md` — update the **FAQ targets** subsection
  ("6–8 entries…") to document the new convention (existing 7 exam Qs + the 4
  new entries, with ①/③ state-anchored and ②/④ templated product facts).

## Verification gate

1. `npx astro build` succeeds (no JSON parse errors across 51 files).
2. Spot-check rendered HTML for **three representative states**:
   - NJ (PSI, split exam) — the worked example above.
   - CA (self-administered) — confirms the self-administered template path.
   - TX or AK (Pearson VUE) — confirms the third-party Pearson VUE path.
3. Confirm each spot-checked page's `FAQPage` JSON-LD `mainEntity` array now has
   **11 entries** (12 for LA).
4. Confirm entries ① and ③ **differ** between the three spot-checked states
   (i.e. they actually carry state-specific content, not boilerplate).
5. Grep the new copy for em dashes and colons → must be zero.
6. Ship: commit + push `marknygren/realready-web` (layer 1 only — web-only
   content, no Supabase reseed needed per the data-layers rule).

## Out of scope

- Homepage `/faq` global FAQ.
- Any change to the existing 7 exam answers.
- Any question-bank / Supabase change (this is layer-1 web content only).
