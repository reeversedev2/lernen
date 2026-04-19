import type { CefrLevel, Exercise, ExerciseDifficulty } from '@lernen/shared'
import { Types } from 'mongoose'
import { Ollama } from 'ollama'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../config/index.js'
import { ExerciseAttempt } from '../models/exercise-attempt.model.js'
import { User } from '../models/user.model.js'
import { queueEventBus } from '../queue/event-bus.js'

const ollama = new Ollama({ host: config.OLLAMA_URL })

// ── Model warm-up ──────────────────────────────────────────────────────────
// Sends a minimal request so Ollama loads the model into RAM before the first
// real job arrives. Without this the first generation pays an 8–12s load tax.

export async function warmOllamaModel(): Promise<void> {
  await ollama.chat({
    model: config.OLLAMA_MODEL,
    messages: [{ role: 'user', content: 'hi' }],
    options: { num_predict: 1, num_ctx: 512 },
    keep_alive: -1, // tell Ollama to keep this model loaded indefinitely
  })
  console.log(`[ollama] Model "${config.OLLAMA_MODEL}" warmed and pinned in RAM`)
}

// ── Streaming Ollama call with live event emission ─────────────────────────

async function ollamaGenerate(opts: {
  jobId: string
  jobName: string
  jobData: Record<string, unknown>
  prompt: string
  temperature?: number
  numPredict?: number
}): Promise<string> {
  const { jobId, jobName, jobData, prompt, temperature = 0.8, numPredict = 1200 } = opts

  queueEventBus.emit('event', {
    ts: Date.now(),
    type: 'ollama_start',
    jobId,
    jobName,
    data: jobData,
    model: config.OLLAMA_MODEL,
    prompt,
  })

  // Retry up to 3 times on transient network / Ollama errors
  const MAX_ATTEMPTS = 3
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const stream = await ollama.chat({
        model: config.OLLAMA_MODEL,
        messages: [{ role: 'user', content: prompt }],
        format: 'json',
        options: {
          temperature,
          num_predict: numPredict,
          num_ctx: 4096, // must fit prompt + full JSON output; exercise prompts alone are ~1000 tokens
        },
        stream: true,
      })

      let accumulated = ''
      let tokenCount = 0
      const started = Date.now()
      let lastEmit = started

      for await (const chunk of stream) {
        accumulated += chunk.message.content
        tokenCount++

        const now = Date.now()
        if (now - lastEmit >= 500) {
          queueEventBus.emit('event', {
            ts: now,
            type: 'ollama_chunk',
            jobId,
            jobName,
            data: jobData,
            chunk: accumulated,
            tokenCount,
          })
          lastEmit = now
        }

        if (chunk.done) {
          const totalMs = Date.now() - started
          const evalDurationSec = (chunk.eval_duration ?? 0) / 1e9
          const tokensPerSec =
            evalDurationSec > 0 ? Math.round((chunk.eval_count ?? 0) / evalDurationSec) : 0

          queueEventBus.emit('event', {
            ts: Date.now(),
            type: 'ollama_done',
            jobId,
            jobName,
            data: jobData,
            model: config.OLLAMA_MODEL,
            chunk: accumulated,
            tokenCount: chunk.eval_count ?? tokenCount,
            promptTokens: chunk.prompt_eval_count ?? 0,
            totalTokens: (chunk.eval_count ?? 0) + (chunk.prompt_eval_count ?? 0),
            tokensPerSec,
            totalMs,
          })
        }
      }

      return accumulated
    } catch (err) {
      lastError = err
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[llm] ollamaGenerate attempt ${attempt}/${MAX_ATTEMPTS} failed: ${msg}`)
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 5000 * attempt)) // 5s, 10s backoff
      }
    }
  }

  throw lastError
}

// ── Helpers ────────────────────────────────────────────────────────────────

function extractJSON(raw: string): string {
  // 1. Strip <think>…</think> blocks and markdown fences
  let cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim()

  // 2. Slice to the outermost { … } to discard any preamble/postamble text
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1)
  }

  // 3. If the JSON was truncated mid-token, attempt to close open structures
  //    so JSON.parse has a chance of succeeding on partial output.
  try {
    JSON.parse(cleaned)
    return cleaned
  } catch {
    return repairJSON(cleaned)
  }
}

function repairJSON(partial: string): string {
  // Count unclosed braces/brackets and append the closers
  let inString = false
  let isEscaped = false
  const stack: Array<'{' | '['> = []

  for (const ch of partial) {
    if (isEscaped) {
      isEscaped = false
      continue
    }
    if (ch === '\\' && inString) {
      isEscaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === '{') stack.push('{')
    else if (ch === '[') stack.push('[')
    else if (ch === '}') stack.pop()
    else if (ch === ']') stack.pop()
  }

  // If we're mid-string or mid-value, trim to the last complete key-value
  let repaired = partial.trimEnd()
  // Remove a trailing incomplete value (dangling comma or partial string)
  repaired = repaired.replace(/,\s*$/, '').replace(/"[^"]*$/, '"...')

  // Close open structures in reverse
  for (let i = stack.length - 1; i >= 0; i--) {
    repaired += stack[i] === '{' ? '}' : ']'
  }

  return repaired
}

async function getUserGapContext(userId: string): Promise<string> {
  const recent = await ExerciseAttempt.find({ userId: new Types.ObjectId(userId) })
    .sort({ attemptedAt: -1 })
    .limit(60)
    .lean()

  if (recent.length === 0) return 'no history yet — generate a confidence-building well-rounded set'

  // Accuracy per exercise type
  const byType: Record<string, { correct: number; total: number }> = {}
  for (const a of recent) {
    const t = a.exerciseType
    if (!byType[t]) byType[t] = { correct: 0, total: 0 }
    byType[t].total++
    if (a.isCorrect) byType[t].correct++
  }

  const weakTypes = Object.entries(byType)
    .map(([type, s]) => ({ type, accuracy: s.correct / s.total }))
    .filter(({ accuracy }) => accuracy < 0.6)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3)

  // Specific words/phrases the student keeps getting wrong
  const recentWrong = recent
    .filter((a) => !a.isCorrect)
    .slice(0, 5)
    .map((a) => `"${a.correctAnswer}"`)

  const parts: string[] = []
  if (weakTypes.length > 0) {
    parts.push(
      `weak exercise types: ${weakTypes.map(({ type, accuracy }) => `${type} (${Math.round(accuracy * 100)}%)`).join(', ')}`,
    )
  }
  if (recentWrong.length > 0) {
    parts.push(`recently missed answers: ${recentWrong.join(', ')}`)
  }

  return parts.length > 0 ? parts.join(' | ') : 'performing well overall — increase challenge'
}

async function getRecentStageContext(
  stageId: string,
): Promise<{ topics: string[]; questions: string[] }> {
  const { ExerciseSet } = await import('../models/exercise-set.model.js')
  const recent = await ExerciseSet.find({ stageId: new Types.ObjectId(stageId) })
    .sort({ createdAt: -1 })
    .limit(20)
    .select('topic exercises')
    .lean()

  const topics = recent.map((s) => s.topic).filter(Boolean)
  // Sample a few questions from each set so the model knows what's been covered
  const questions = recent
    .flatMap((s) => s.exercises.slice(0, 2).map((e) => e.question))
    .filter(Boolean)
    .slice(0, 15)

  return { topics, questions }
}

function difficultyInstruction(difficulty: ExerciseDifficulty, cefrLevel: CefrLevel): string {
  if (difficulty === 'easy') {
    return `Use simple, common vocabulary. Short sentences. Perfect for someone just starting ${cefrLevel}.`
  }
  if (difficulty === 'medium') {
    return `Use moderate complexity. Mix familiar vocabulary with some new words. Require understanding of sentence structure.`
  }
  return `Use authentic, natural German. Include idiomatic expressions, longer sentences, and nuanced grammar. Challenge a solid ${cefrLevel} student.`
}

function parseExercises(
  raw: string,
  fallbackTopic: string,
): { topic: string; exercises: Exercise[] } {
  let parsed: { topic?: string; exercises: Array<Record<string, unknown>> }

  try {
    parsed = JSON.parse(extractJSON(raw))
  } catch {
    console.error('[llm] JSON parse failed. Raw output:\n', raw.slice(0, 500))
    throw new Error('Ollama returned invalid JSON')
  }

  if (!Array.isArray(parsed.exercises)) {
    throw new Error('Ollama response missing exercises array')
  }

  const validTypes = new Set([
    'multiple_choice',
    'fill_blank',
    'translate_de_en',
    'translate_en_de',
    'reading_comprehension',
    'speaking',
  ])

  const exercises: Exercise[] = parsed.exercises
    .filter((ex) => validTypes.has(ex.type as string) && ex.question && ex.answer)
    .map((ex) => ({
      id: uuidv4(),
      type: ex.type as Exercise['type'],
      question: String(ex.question),
      answer: String(ex.answer),
      acceptedAnswers:
        Array.isArray(ex.acceptedAnswers) && ex.acceptedAnswers.length > 0
          ? (ex.acceptedAnswers as string[]).map(String).filter(Boolean)
          : undefined,
      wrongFeedback: ex.wrongFeedback ? String(ex.wrongFeedback) : undefined,
      correctFeedback: ex.correctFeedback ? String(ex.correctFeedback) : undefined,
      options: Array.isArray(ex.options) ? (ex.options as string[]) : undefined,
      passage: ex.passage ? String(ex.passage) : undefined,
      hint: ex.hint ? String(ex.hint) : undefined,
      explanation: ex.explanation ? String(ex.explanation) : undefined,
    }))

  if (exercises.length === 0) throw new Error('No valid exercises parsed')

  return { topic: String(parsed.topic ?? fallbackTopic), exercises }
}

function validateExerciseSet(exercises: Exercise[]): void {
  const required = [
    'multiple_choice',
    'fill_blank',
    'translate_de_en',
    'translate_en_de',
    'reading_comprehension',
  ] as const
  const byType = new Map<string, Exercise[]>()
  for (const ex of exercises) {
    if (!byType.has(ex.type)) byType.set(ex.type, [])
    byType.get(ex.type)?.push(ex)
  }

  for (const type of required) {
    if (!byType.has(type)) throw new Error(`Missing required exercise type: ${type}`)
  }

  // MCQ must have exactly 4 options and the answer must be one of them
  for (const mcq of byType.get('multiple_choice') ?? []) {
    if (!mcq.options || mcq.options.length !== 4) {
      throw new Error('multiple_choice exercise must have exactly 4 options')
    }
    if (!mcq.options.includes(mcq.answer)) {
      throw new Error('multiple_choice answer must exactly match one of the options')
    }
  }

  // Reading comprehension must have a passage
  for (const rc of byType.get('reading_comprehension') ?? []) {
    if (!rc.passage) throw new Error('reading_comprehension exercise must have a passage')
  }

  // Fill blank must have ___ in the question
  for (const fb of byType.get('fill_blank') ?? []) {
    if (!fb.question.includes('___'))
      throw new Error('fill_blank exercise must contain ___ in the question')
  }
}

// ── Stage-aware exercise generation ───────────────────────────────────────

export async function generateExerciseSet(
  stageId: string,
  cefrLevel: CefrLevel,
  theme: string,
  difficulty: ExerciseDifficulty,
  userId?: string,
  jobId = 'manual',
): Promise<{ topic: string; exercises: Exercise[] }> {
  const { topics: recentTopics, questions: recentQuestions } = await getRecentStageContext(stageId)
  const gapContext = userId ? await getUserGapContext(userId) : 'generate a well-rounded set'

  const avoidTopics =
    recentTopics.length > 0
      ? `ALREADY COVERED TOPICS — do not repeat these:\n${recentTopics.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
      : ''

  const avoidQuestions =
    recentQuestions.length > 0
      ? `ALREADY USED QUESTIONS — do not reuse these:\n${recentQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : ''

  const prompt = `/nothink
Generate a German language exercise set. Output ONLY valid JSON, no other text.

THEME: ${theme}
LEVEL: ${cefrLevel}
DIFFICULTY: ${difficulty} — ${difficultyInstruction(difficulty, cefrLevel)}
STUDENT GAPS: ${gapContext}

${avoidTopics}
${avoidQuestions}

JSON format:
{
  "topic": "a specific fresh sub-topic within ${theme}, different from all avoided topics above",
  "exercises": [ ...exactly 5 exercises, one of each type below... ]
}

REQUIRED EXERCISE TYPES — include exactly one of each, in any order:

TYPE 1 — multiple_choice:
{ "type": "multiple_choice", "question": "German sentence or question", "options": ["correct answer", "wrong1", "wrong2", "wrong3"], "answer": "correct answer", "wrongFeedback": "English: why wrong options fail", "correctFeedback": "English: rule to remember", "explanation": "English grammar note" }
Rules: options must be an array of exactly 4 strings. answer must be copied exactly from one of the options.

TYPE 2 — fill_blank:
{ "type": "fill_blank", "question": "German sentence with ___ for the gap", "answer": "the missing word", "hint": "English hint", "wrongFeedback": "English: grammar rule for this word", "correctFeedback": "English: principle to remember" }
Rules: question must contain ___ (three underscores).

TYPE 3 — translate_de_en:
{ "type": "translate_de_en", "question": "A German sentence", "answer": "English translation", "acceptedAnswers": ["other valid English phrasing"], "wrongFeedback": "English: what was tricky", "correctFeedback": "English: vocabulary note" }

TYPE 4 — translate_en_de:
{ "type": "translate_en_de", "question": "An English sentence", "answer": "German translation", "acceptedAnswers": ["other valid German phrasing"], "wrongFeedback": "English: common mistake here", "correctFeedback": "English: grammar tip" }

TYPE 5 — reading_comprehension:
{ "type": "reading_comprehension", "passage": "3-4 sentence German text set in a real ${theme} situation", "question": "English comprehension question", "answer": "English answer", "acceptedAnswers": ["alternative phrasing"], "wrongFeedback": "English: what the passage says", "correctFeedback": "English: vocabulary or grammar insight" }
Rules: passage is required and must be in German.

All feedback, hints, and explanations must be in English. German only in questions, answers, passages, and acceptedAnswers for translate_en_de.`

  const raw = await ollamaGenerate({
    jobId,
    jobName: 'generate-exercise-set',
    jobData: { stageId, cefrLevel, theme, difficulty },
    prompt,
    temperature: 0.65,
    numPredict: 2000,
  })

  const { topic, exercises } = parseExercises(raw, theme)
  validateExerciseSet(exercises)
  return { topic, exercises }
}

// ── Stage-aware lesson generation ─────────────────────────────────────────

export async function generateStageLesson(
  stageId: string,
  cefrLevel: CefrLevel,
  theme: string,
  lessonIndex: number,
  jobId = 'manual',
): Promise<{
  title: string
  explanationMarkdown: string
  examples: Array<{ german: string; english: string; annotation?: string }>
  exercises: Exercise[]
}> {
  // Vary the lesson angle based on index so multiple lessons per stage aren't repetitive
  const angles = [
    'core vocabulary and phrases you will use every day',
    'practical grammar patterns in real situations',
    'cultural context and authentic usage',
  ]
  const angle = angles[lessonIndex % angles.length]

  // Pull recent lesson titles for this stage to avoid repetition
  const { Lesson } = await import('../models/lesson.model.js')
  const recentLessons = await Lesson.find({ stageId: new Types.ObjectId(stageId) })
    .sort({ orderInUnit: -1 })
    .limit(10)
    .select('title')
    .lean()
  const recentTitles = recentLessons.map((l) => l.title).filter(Boolean)
  const avoidTitles =
    recentTitles.length > 0
      ? `ALREADY CREATED LESSONS — do not repeat these topics:\n${recentTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
      : ''

  const prompt = `/nothink
Generate a German language lesson. Output ONLY valid JSON, no other text.

THEME: ${theme}
LEVEL: ${cefrLevel}
FOCUS: ${angle}

${avoidTitles}

JSON format:
{
  "title": "Short engaging lesson title, different from all avoided titles above",
  "explanationMarkdown": "2-4 paragraph explanation in English. Use **bold** for German key terms. Ground everything in real ${theme} situations.",
  "examples": [
    { "german": "German sentence", "english": "English translation", "annotation": "grammar or cultural note in English" },
    { "german": "...", "english": "...", "annotation": "..." },
    { "german": "...", "english": "...", "annotation": "..." }
  ],
  "exercises": [ ...exactly 5 exercises, one of each type below... ]
}

REQUIRED EXERCISE TYPES — include exactly one of each:

TYPE 1 — multiple_choice:
{ "type": "multiple_choice", "question": "German sentence or question", "options": ["correct answer", "wrong1", "wrong2", "wrong3"], "answer": "correct answer", "wrongFeedback": "English: why wrong options fail", "correctFeedback": "English: rule to remember", "explanation": "English grammar note" }
Rules: options = exactly 4 strings. answer must be copied exactly from one option.

TYPE 2 — fill_blank:
{ "type": "fill_blank", "question": "German sentence with ___ for the gap", "answer": "the missing word", "hint": "English hint", "wrongFeedback": "English: grammar rule", "correctFeedback": "English: principle" }
Rules: question must contain ___ (three underscores).

TYPE 3 — translate_de_en:
{ "type": "translate_de_en", "question": "A German sentence", "answer": "English translation", "acceptedAnswers": ["other valid phrasing"], "wrongFeedback": "English: what was tricky", "correctFeedback": "English: vocabulary note" }

TYPE 4 — translate_en_de:
{ "type": "translate_en_de", "question": "An English sentence", "answer": "German translation", "acceptedAnswers": ["other valid German phrasing"], "wrongFeedback": "English: common mistake", "correctFeedback": "English: grammar tip" }

TYPE 5 — reading_comprehension:
{ "type": "reading_comprehension", "passage": "3-4 sentence German text about a real ${theme} situation", "question": "English comprehension question", "answer": "English answer", "acceptedAnswers": ["alternative"], "wrongFeedback": "English: what the passage says", "correctFeedback": "English: insight" }
Rules: passage is required, must be in German.

All feedback, hints, explanation, and explanationMarkdown must be in English.`

  const raw = await ollamaGenerate({
    jobId,
    jobName: 'generate-stage-lesson',
    jobData: { stageId, cefrLevel, theme, lessonIndex },
    prompt,
    temperature: 0.65,
    numPredict: 2500,
  })

  const parsed = JSON.parse(extractJSON(raw))

  if (!parsed.title || !parsed.explanationMarkdown || !Array.isArray(parsed.exercises)) {
    throw new Error('Ollama returned invalid lesson structure')
  }

  const validTypes = new Set([
    'multiple_choice',
    'fill_blank',
    'translate_de_en',
    'translate_en_de',
    'reading_comprehension',
    'speaking',
  ])

  const exercises: Exercise[] = parsed.exercises
    .filter(
      (ex: Record<string, unknown>) =>
        validTypes.has(ex.type as string) && ex.question && ex.answer,
    )
    .map((ex: Record<string, unknown>) => ({
      id: uuidv4(),
      type: ex.type as Exercise['type'],
      question: String(ex.question),
      answer: String(ex.answer),
      acceptedAnswers:
        Array.isArray(ex.acceptedAnswers) && ex.acceptedAnswers.length > 0
          ? (ex.acceptedAnswers as string[]).map(String).filter(Boolean)
          : undefined,
      wrongFeedback: ex.wrongFeedback ? String(ex.wrongFeedback) : undefined,
      correctFeedback: ex.correctFeedback ? String(ex.correctFeedback) : undefined,
      options: Array.isArray(ex.options) ? (ex.options as string[]) : undefined,
      passage: ex.passage ? String(ex.passage) : undefined,
      hint: ex.hint ? String(ex.hint) : undefined,
      explanation: ex.explanation ? String(ex.explanation) : undefined,
    }))

  validateExerciseSet(exercises)

  return {
    title: String(parsed.title),
    explanationMarkdown: String(parsed.explanationMarkdown),
    examples: Array.isArray(parsed.examples)
      ? parsed.examples.map((e: Record<string, unknown>) => ({
          german: String(e.german ?? ''),
          english: String(e.english ?? ''),
          annotation: e.annotation ? String(e.annotation) : undefined,
        }))
      : [],
    exercises,
  }
}

// ── Legacy (used by old exercises.routes.ts, kept for backward compat) ─────

export async function generateExercises(
  userId: string,
): Promise<{ topic: string; cefrLevel: CefrLevel; exercises: Exercise[] }> {
  const user = await User.findById(userId)
  const CEFR: CefrLevel[] = ['A1', 'A1', 'A1.2', 'A1.2', 'A2', 'A2', 'B1']
  const cefrLevel = CEFR[Math.min(user?.currentUnitIndex ?? 0, CEFR.length - 1)]

  // Find current stage for this user to use as context
  const { UserStageProgress } = await import('../models/user-stage-progress.model.js')
  const { Stage } = await import('../models/stage.model.js')

  const latestProgress = await UserStageProgress.find({ userId: new Types.ObjectId(userId) })
    .sort({ stageId: -1 })
    .limit(1)
    .lean()

  let theme = 'everyday German situations'
  let stageId = ''

  if (latestProgress.length > 0) {
    const stage = await Stage.findById(latestProgress[0].stageId)
    if (stage) {
      theme = stage.theme
      stageId = stage._id.toString()
    }
  }

  const { topic, exercises } = await generateExerciseSet(
    stageId || 'legacy',
    cefrLevel,
    theme,
    'easy',
    userId,
  )
  return { topic, cefrLevel, exercises }
}

// Re-export for use in old lesson generation routes
export async function generateLesson(
  userId: string,
  unitId: string,
): Promise<{
  title: string
  explanationMarkdown: string
  examples: Array<{ german: string; english: string; annotation?: string }>
  exercises: Exercise[]
}> {
  const user = await User.findById(userId)
  const CEFR: CefrLevel[] = ['A1', 'A1', 'A1.2', 'A1.2', 'A2', 'A2', 'B1']
  const cefrLevel = CEFR[Math.min(user?.currentUnitIndex ?? 0, CEFR.length - 1)]

  const { Stage } = await import('../models/stage.model.js')
  const stage = await Stage.findOne({ cefrLevel }).sort({ order: 1 })
  const theme = stage?.theme ?? 'everyday German'

  return generateStageLesson(stage?._id.toString() ?? unitId, cefrLevel, theme, 0)
}
