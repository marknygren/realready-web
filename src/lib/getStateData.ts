/**
 * State data assembler for /states/[state]/ pages.
 *
 * Combines two data sources at build time:
 *  - src/content/questions/[STATE]-NN.json — synced from the mobile app via
 *    `npm run sync-questions`; the canonical question bank, organized by
 *    category (one file per category per state).
 *  - src/content/states/[STATE].json       — website-only per-state intro,
 *    exam facts, and FAQ entries; authored by us.
 *
 * Picks 20 questions per state by round-robin across the category files so
 * the selection is balanced across topics, with a deterministic shuffle of
 * each question's options so the correct answer isn't always in the same
 * slot (and so the position is stable across rebuilds).
 *
 * Fails loudly if a state has fewer than 20 questions or is missing the
 * per-state content file.
 */

// Eagerly load all question JSONs and state content JSONs at module init.
const questionModules = import.meta.glob<RawQuestionFile>(
  '../content/questions/*.json',
  { eager: true, import: 'default' },
);
const stateModules = import.meta.glob<RawStateContent>(
  '../content/states/*.json',
  { eager: true, import: 'default' },
);

const FREE_PER_STATE = 20;

// ---------- Source-data types (match the JSON shape on disk) ----------

interface RawQuestion {
  key_topic_ref: string;
  question_text: string;
  correct_answer: string;
  distractors: string[];
  explanation: string;
  difficulty?: string;
  cognitive_level?: string;
  is_free?: boolean;
  tags?: string[];
}

interface RawQuestionFile {
  standard_ref: string;
  scope: string;
  state: string;
  category: string;
  questions: RawQuestion[];
}

interface RawStateContent {
  name: string;
  code: string;
  /**
   * Official name of the licensing exam in this state — used in copy.
   * Examples: "California Real Estate Salesperson Examination",
   * "Texas Real Estate Sales Apprentice Education (SAE) Exam".
   */
  examName: string;
  /**
   * State-specific question count (the count of questions in
   * src/content/questions/[STATE]-*.json synced from the mobile app).
   * Optional — if absent we'll compute it at build time from the JSONs.
   */
  totalQuestions?: number;
  examFacts: {
    questionCount: number;
    timeLimitMinutes: number;
    passingScore: string;
    registrationFee: string;
    notes?: string;
  };
  /** 150-250 word HTML intro for the state page. */
  intro: string;
  faq: Array<{ q: string; a: string }>;
}

// ---------- Public types (what pages consume) ----------

export interface Question {
  /** Stable id for use as React/Astro key + JSON-LD @id (e.g. "CA-01.1"). */
  id: string;
  text: string;
  /** The four answer options in deterministic-shuffled order. */
  options: string[];
  /** Index into `options` of the correct answer. */
  correctIndex: number;
  /** Plain-text explanation. */
  explanation: string;
  /** Human-readable category label, e.g. "Property & Land Use". */
  categoryLabel: string;
  /** Raw category slug from the source file, e.g. "state_licensing". */
  categorySlug: string;
  tags: string[];
}

export interface ExamFacts {
  questionCount: number;
  timeLimitMinutes: number;
  passingScore: string;
  registrationFee: string;
  notes?: string;
}

export interface FaqEntry {
  q: string;
  a: string;
}

export interface StateData {
  name: string;
  code: string;
  /** URL-safe slug, e.g. "california" or "new-york". */
  slug: string;
  /** Official licensing exam name, e.g. "California Real Estate Salesperson Examination". */
  examName: string;
  /** Count of state-specific questions in the mobile-app bank. */
  stateQuestionCount: number;
  /** Count of national/shared questions every user gets. */
  nationalQuestionCount: number;
  /** Total questions a user studying for this state has access to (national + state). */
  totalQuestionsAvailable: number;
  examFacts: ExamFacts;
  intro: string;
  faq: FaqEntry[];
  questions: Question[];
  /** Distinct category labels present in `questions`, in display order. */
  categoryLabels: string[];
}

// ---------- Category slug → human label ----------

const CATEGORY_LABELS: Record<string, string> = {
  state_licensing: 'Licensing & Regulation',
  property_and_land_use: 'Property & Land Use',
  agency: 'Agency & Fiduciary Duties',
  contracts: 'Contracts',
  finance: 'Finance & Lending',
  transfer_of_title: 'Transfer of Title',
  practice_of_real_estate: 'Practice of Real Estate',
  real_estate_calculations: 'Real Estate Math',
  national_overview: 'National Overview',
  state_specific: 'State-Specific Rules',
};

function labelForCategory(slug: string): string {
  if (CATEGORY_LABELS[slug]) return CATEGORY_LABELS[slug];
  // Fallback: turn snake_case_thing into "Snake Case Thing"
  return slug
    .split('_')
    .map((w) => (w.length ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

// ---------- Deterministic shuffle (FNV-1a-seeded Fisher–Yates) ----------

function hashStringFNV1a(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function deterministicShuffle<T>(arr: T[], seed: string): T[] {
  let state = hashStringFNV1a(seed) || 1;
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    state = Math.imul(state ^ i, 16777619) >>> 0;
    const j = state % (i + 1);
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

// ---------- Slug helpers ----------

function stateNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ---------- Internal indexing of question files by state ----------

interface IndexedFiles {
  filename: string;
  data: RawQuestionFile;
}

function questionFilesForState(stateCode: string): IndexedFiles[] {
  const code = stateCode.toUpperCase();
  const entries: IndexedFiles[] = [];

  for (const [path, data] of Object.entries(questionModules)) {
    if (!data) continue;
    // Match e.g. ".../CA-01.json"
    const match = path.match(/\/([A-Z]{2})-(\d+)\.json$/);
    if (!match) continue;
    if (match[1] !== code) continue;
    entries.push({ filename: `${match[1]}-${match[2]}.json`, data });
  }

  // Sort by file number so round-robin is deterministic.
  entries.sort((a, b) => a.filename.localeCompare(b.filename));
  return entries;
}

/**
 * Count every question in the national bank — the N-NN.json files shared
 * across all states. Memoized via const at module init.
 */
const NATIONAL_QUESTION_COUNT: number = (() => {
  let total = 0;
  for (const [path, data] of Object.entries(questionModules)) {
    if (!data) continue;
    if (/\/N-\d+\.json$/.test(path)) {
      total += data.questions.length;
    }
  }
  return total;
})();

function countStateQuestions(stateCode: string): number {
  return questionFilesForState(stateCode).reduce(
    (sum, f) => sum + f.data.questions.length,
    0,
  );
}

function loadStateContent(stateCode: string): RawStateContent | null {
  const code = stateCode.toUpperCase();
  for (const [path, data] of Object.entries(stateModules)) {
    if (!data) continue;
    const match = path.match(/\/([A-Z]{2})\.json$/);
    if (!match) continue;
    if (match[1] === code) return data;
  }
  return null;
}

// ---------- Licensing-process filter ----------
//
// We deliberately skip questions whose subject matter is the licensing
// process itself (how to get licensed, hours of pre-license education,
// fingerprinting, application fees, renewal procedures, CE requirements).
// Those exist in the bank because they DO appear on real state exams, but
// they're a poor showcase of what RealReady teaches — visitors landing on
// a marketing page expect substantive real-estate content (agency, contracts,
// finance, property law, math), not regulatory trivia.
//
// Pattern-matched on question text + correct answer. False positives are
// possible but rare; the bank is large enough that a few skipped questions
// just push the round-robin to the next one in the bucket.
const LICENSING_PROCESS_PATTERNS = [
  /\bpre[- ]?licens(e|ing|ure)\b/i,
  /\bpost[- ]?licens(e|ing|ure)\b/i,
  /\bcredit hours?\b/i,
  /\beducation hours?\b/i,
  /\bhours? of (education|coursework|instruction)\b/i,
  /\bhours? of pre[- ]?licens(e|ing|ure)\b/i,
  /\bhours? of post[- ]?licens(e|ing|ure)\b/i,
  /\bcontinuing education\b/i,
  /\bce (hours?|requirements?|curriculum|courses?|electives?|deadlines?)\b/i,
  /\bhours? of CE\b/i,
  /\binactive (status|license|licence)\b/i,
  /\blicens(e|es|ing) (is |are )?renewed\b/i,
  /\blive scan\b/i,
  /\bfingerprint(s|ing|ed)?\b/i,
  /\bbackground check\b/i,
  /\bcontract writing course\b/i,
  /\bbroker management clinic\b/i,
  /\bannual commission update\b/i,
  /\brenewal cycle\b/i,
  /\blaw update\b/i,
  /\belective credit\b/i,
  /\bbroker education\b/i,
  /\bapplication (form|fee|process)\b/i,
  /\bexamination application\b/i,
  /\b(license|licence|licensing) (fee|renewal|expir|valid|must be renewed|applicant|application)/i,
  /\bsalesperson applicant\b/i,
  /\bbroker applicant\b/i,
  /\b(broker|salesperson) candidate\b/i,
  /\bminimum age\b/i,
  /\bprospective (salesperson|broker)\b/i,
  /\bbirthday month\b/i,
  /\bobtain (a|an) .* (license|licensure)\b/i,
  /\bapply for (a |an |the )?(real estate |Georgia )?(salesperson |broker )?licens(e|ure)\b/i,
  /\brenew (their |a )?licens/i,
  /\b(passes?|passed|fails?|failed) (the )?(national|state) portion\b/i,
  /\b(satisfies|fulfills|completes) .* (pre[- ]?licens(e|ing|ure)|education) requirement\b/i,
];

function isLicensingProcessQuestion(q: RawQuestion): boolean {
  const haystack = `${q.question_text} ${q.correct_answer}`;
  return LICENSING_PROCESS_PATTERNS.some((re) => re.test(haystack));
}

// ---------- Round-robin picker ----------

function pickQuestionsRoundRobin(
  files: IndexedFiles[],
  count: number,
): Array<{ raw: RawQuestion; categorySlug: string }> {
  const buckets = files.map((f) => ({
    categorySlug: f.data.category,
    // Strip out licensing-process questions up-front; the round-robin will
    // pull from what's left.
    questions: f.data.questions.filter((q) => !isLicensingProcessQuestion(q)),
  }));

  const picked: Array<{ raw: RawQuestion; categorySlug: string }> = [];
  let idx = 0;

  while (picked.length < count) {
    let advanced = false;
    for (const bucket of buckets) {
      if (picked.length >= count) break;
      const q = bucket.questions[idx];
      if (q) {
        picked.push({ raw: q, categorySlug: bucket.categorySlug });
        advanced = true;
      }
    }
    idx++;
    if (!advanced) break;
  }

  return picked;
}

function buildQuestion(raw: RawQuestion, categorySlug: string): Question {
  const rawOptions = [raw.correct_answer, ...raw.distractors];
  const seed = raw.question_text + '|' + raw.key_topic_ref;
  const options = deterministicShuffle(rawOptions, seed);
  const correctIndex = options.indexOf(raw.correct_answer);

  return {
    id: raw.key_topic_ref,
    text: raw.question_text,
    options,
    correctIndex,
    explanation: raw.explanation,
    categoryLabel: labelForCategory(categorySlug),
    categorySlug,
    tags: raw.tags ?? [],
  };
}

// ---------- Public API ----------

/**
 * Loads everything a /states/[state]/ page needs to render.
 * Throws if the state has insufficient data so build fails loudly.
 */
export function getStateData(stateCode: string): StateData {
  const code = stateCode.toUpperCase();
  const stateContent = loadStateContent(code);
  if (!stateContent) {
    throw new Error(
      `getStateData(${code}): no src/content/states/${code}.json found. ` +
        `Author the per-state content file before building this page.`,
    );
  }

  const files = questionFilesForState(code);
  if (files.length === 0) {
    throw new Error(
      `getStateData(${code}): no question files found at ` +
        `src/content/questions/${code}-*.json. Run \`npm run sync-questions\`.`,
    );
  }

  const picked = pickQuestionsRoundRobin(files, FREE_PER_STATE);
  if (picked.length < FREE_PER_STATE) {
    throw new Error(
      `getStateData(${code}): only ${picked.length} questions available across ` +
        `${files.length} category files, but ${FREE_PER_STATE} required. ` +
        `Question bank is incomplete.`,
    );
  }

  const questions = picked.map(({ raw, categorySlug }) =>
    buildQuestion(raw, categorySlug),
  );

  const categoryLabels = Array.from(
    new Set(questions.map((q) => q.categoryLabel)),
  );

  const stateQuestionCount =
    stateContent.totalQuestions ?? countStateQuestions(code);

  if (!stateContent.examName) {
    throw new Error(
      `getStateData(${code}): src/content/states/${code}.json is missing examName.`,
    );
  }

  return {
    name: stateContent.name,
    code: stateContent.code,
    slug: stateNameToSlug(stateContent.name),
    examName: stateContent.examName,
    stateQuestionCount,
    nationalQuestionCount: NATIONAL_QUESTION_COUNT,
    totalQuestionsAvailable: stateQuestionCount + NATIONAL_QUESTION_COUNT,
    examFacts: stateContent.examFacts,
    intro: stateContent.intro,
    faq: stateContent.faq,
    questions,
    categoryLabels,
  };
}

/**
 * Lightweight directory listing — every state we have website content for,
 * with its slug and question-bank count. Used by the /states/ index page
 * and the OtherStatesGrid component.
 */
export interface StateSummary {
  code: string;
  name: string;
  slug: string;
  /** Total questions in the mobile app's bank for this state (0 if no JSONs synced). */
  questionBankCount: number;
  /** True if src/content/states/[STATE].json exists (i.e. the state page is buildable). */
  hasContent: boolean;
}

export function getAllStateSummaries(): StateSummary[] {
  // Discover every state that has either question files or content.
  const codes = new Set<string>();

  for (const path of Object.keys(questionModules)) {
    const match = path.match(/\/([A-Z]{2})-\d+\.json$/);
    if (match) codes.add(match[1]!);
  }

  // Static name lookup for states we know exist in the question bank.
  const STATE_NAMES: Record<string, string> = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
    CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
    DC: 'Washington DC', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii',
    ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
    KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine',
    MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
    MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska',
    NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico',
    NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
    OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island',
    SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas',
    UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
    WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  };

  const summaries: StateSummary[] = [];
  for (const code of codes) {
    const files = questionFilesForState(code);
    const questionBankCount = files.reduce(
      (sum, f) => sum + f.data.questions.length,
      0,
    );
    const hasContent = !!loadStateContent(code);
    const name = STATE_NAMES[code] ?? code;
    summaries.push({
      code,
      name,
      slug: stateNameToSlug(name),
      questionBankCount,
      hasContent,
    });
  }

  summaries.sort((a, b) => a.name.localeCompare(b.name));
  return summaries;
}

export const ALL_STATE_NAMES_BY_CODE: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
  CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  DC: 'Washington DC', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii',
  ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine',
  MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska',
  NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico',
  NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island',
  SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas',
  UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

export { stateNameToSlug };
