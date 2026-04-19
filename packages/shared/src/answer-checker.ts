export interface AnswerResult {
  isCorrect: boolean
  isTypo: boolean // correct meaning but minor spelling error
}

// ── Normalisation ──────────────────────────────────────────────────────────

function normalise(s: string): string {
  return (
    s
      .trim()
      .toLowerCase()
      // strip punctuation
      .replace(/[.,!?;:'"()[\]{}]/g, '')
      // collapse multiple spaces
      .replace(/\s+/g, ' ')
      .trim()
  )
}

// Accept common umlaut substitutions typed on non-German keyboards
function normaliseUmlauts(s: string): string {
  return s
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'ae')
    .replace(/Ö/g, 'oe')
    .replace(/Ü/g, 'ue')
    .replace(/ß/g, 'ss')
}

function prepare(s: string): string {
  return normalise(normaliseUmlauts(s))
}

// ── Levenshtein distance ───────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

// How many edit-distance errors to allow based on correct answer length
function typoThreshold(len: number): number {
  if (len <= 3) return 0 // "ja", "nein", "ein" — must be exact
  if (len <= 7) return 1 // short words — 1 typo ok
  return 2 // longer phrases — 2 typos ok
}

// ── Speaking answer check ──────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'ich',
  'du',
  'er',
  'sie',
  'es',
  'wir',
  'ihr',
  'die',
  'der',
  'das',
  'ein',
  'eine',
  'und',
  'oder',
  'ist',
  'bin',
  'hat',
  'the',
  'a',
  'an',
  'i',
  'you',
  'we',
])

function checkSpeaking(transcript: string, expected: string): AnswerResult {
  const tokenize = (s: string) =>
    normalise(s)
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w))

  const expectedTokens = tokenize(expected)
  if (expectedTokens.length === 0) return { isCorrect: true, isTypo: false }

  const transcriptTokens = new Set(tokenize(transcript))
  const matched = expectedTokens.filter((t) => transcriptTokens.has(t)).length
  const ratio = matched / expectedTokens.length

  return { isCorrect: ratio >= 0.6, isTypo: false }
}

// ── Single-candidate check ─────────────────────────────────────────────────

function checkOne(user: string, correct: string): AnswerResult {
  const u = prepare(user)
  const c = prepare(correct)

  if (u === c) return { isCorrect: true, isTypo: false }

  const dist = levenshtein(u, c)
  const threshold = typoThreshold(c.length)
  const isTypo = dist > 0 && dist <= threshold

  return { isCorrect: isTypo, isTypo }
}

// ── Main export ────────────────────────────────────────────────────────────

export function checkAnswer(
  type: string,
  userAnswer: string,
  correctAnswer: string,
  acceptedAnswers?: string[],
): AnswerResult {
  if (type === 'speaking') {
    return checkSpeaking(userAnswer, correctAnswer)
  }

  // Check primary answer first
  const primary = checkOne(userAnswer, correctAnswer)
  if (primary.isCorrect) return primary

  // Check accepted alternatives — first exact match wins, then best typo match
  if (acceptedAnswers && acceptedAnswers.length > 0) {
    let bestTypo: AnswerResult | null = null
    for (const alt of acceptedAnswers) {
      const result = checkOne(userAnswer, alt)
      if (result.isCorrect && !result.isTypo) return { isCorrect: true, isTypo: false }
      if (result.isTypo && !bestTypo) bestTypo = result
    }
    if (bestTypo) return bestTypo
  }

  return primary
}
