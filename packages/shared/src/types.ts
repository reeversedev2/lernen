export type CefrLevel = 'A1' | 'A1.2' | 'A2' | 'B1'
export type WordType =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'phrase'
  | 'conjunction'
  | 'preposition'
export type Article = 'der' | 'die' | 'das'
export type ExerciseType =
  | 'multiple_choice'
  | 'fill_blank'
  | 'translate_de_en'
  | 'translate_en_de'
  | 'reading_comprehension'
  | 'speaking'
export type SRSStatus = 'new' | 'learning' | 'review' | 'mastered'
export type LessonType = 'grammar' | 'vocabulary' | 'mixed'
export type LessonStatus = 'not_started' | 'in_progress' | 'completed'

export interface VerbForms {
  infinitive: string
  pastParticiple: string
  thirdPersonSingular: string
}

export interface Exercise {
  id: string
  type: ExerciseType
  question: string
  options?: string[]
  answer: string
  acceptedAnswers?: string[] // alternative phrasings that are also correct
  wrongFeedback?: string // shown when the answer is wrong — explains why
  correctFeedback?: string // shown even on correct answers — teaching moment
  hint?: string
  explanation?: string
  grammarConceptId?: string
  vocabularyItemId?: string
  passage?: string // reading_comprehension: the German text to read
}

export type GeneratedSessionStatus = 'generating' | 'pending' | 'completed'
export type ExerciseDifficulty = 'easy' | 'medium' | 'hard'

export interface GeneratedSessionDTO {
  _id: string
  userId: string
  topic: string
  cefrLevel: CefrLevel
  exercises: Exercise[]
  status: GeneratedSessionStatus
  score?: number
  xpEarned?: number
  createdAt: string
}

export type OllamaStatus = 'ready' | 'downloading' | 'unavailable'
export type SessionStatus = 'generating' | 'pending' | 'none'

export interface OllamaStatusResponse {
  ollamaStatus: OllamaStatus
  sessionStatus: SessionStatus
  model: string
}

export interface GenerateExercisesResponse {
  session: GeneratedSessionDTO
}

// ── Stage / Roadmap ──────────────────────────────────────────────────────────

export type StageWorld = 'Das Dorf' | 'Die Stadt' | 'Die Welt' | 'Das Leben'

export interface StageDTO {
  _id: string
  order: number
  theme: string
  emoji: string
  description: string
  cefrLevel: CefrLevel
  worldName: StageWorld
  unlockRequirement: number // order of prerequisite stage (0 = always unlocked)
}

export interface StageWithProgress extends StageDTO {
  isUnlocked: boolean
  isCurrent: boolean
  stars: 0 | 1 | 2 | 3
  totalCompletions: number
  averageScore: number
  lessonsTotal: number
  lessonsCompleted: number
  exerciseSetsAvailable: number // unseen sets for this user
}

export interface RoadmapResponse {
  stages: StageWithProgress[]
}

export interface StageDetailResponse {
  stage: StageDTO
  userProgress: {
    stars: 0 | 1 | 2 | 3
    totalCompletions: number
    averageScore: number
    masteredAt: string | null
  }
  lessons: Array<{
    _id: string
    title: string
    estimatedMinutes: number
    type: LessonType
    progressStatus: LessonStatus
    score: number
  }>
  practiceAvailable: boolean
  recentScores: number[]
}

export interface StageSessionDTO {
  historyId: string
  exerciseSetId: string
  exercises: Exercise[]
  topic: string
  cefrLevel: CefrLevel
  difficulty: ExerciseDifficulty
  stageId: string
}

export interface StageCompleteResponse {
  score: number
  xpEarned: number
  correctAnswers: number
  totalExercises: number
  stars: 0 | 1 | 2 | 3
  starsGained: number
  results: Array<{
    exerciseId: string
    isCorrect: boolean
    isTypo: boolean
    correctAnswer: string
    wrongFeedback?: string
    correctFeedback?: string
    grammarNote?: string
    explanation?: string
  }>
}

export interface CompleteSessionResponse {
  score: number
  xpEarned: number
  correctAnswers: number
  totalExercises: number
  results: Array<{
    exerciseId: string
    isCorrect: boolean
    isTypo: boolean
    correctAnswer: string
    wrongFeedback?: string
    correctFeedback?: string
    grammarNote?: string
    explanation?: string
  }>
}

export interface ExplanationExample {
  german: string
  english: string
  annotation?: string
}

export interface LessonContent {
  explanation?: {
    markdown: string
    examples: ExplanationExample[]
  }
  vocabularyItemIds?: string[]
  exercises: Exercise[]
}

// API Response types
export interface UserDTO {
  _id: string
  email: string
  displayName: string
  totalXp: number
  streakCount: number
  streakLastActivityDate: string | null
  streakFreezeCount: number
  currentUnitIndex: number
  dailyGoalMinutes: number
  createdAt: string
}

export interface VocabularyItemDTO {
  _id: string
  german: string
  article: Article | null
  wordType: WordType
  english: string
  exampleGerman: string
  exampleEnglish: string
  pluralForm?: string
  verbForms?: VerbForms
  tags: string[]
  cefrLevel: string
  frequencyRank?: number
  unitId: string
}

export interface GrammarConceptDTO {
  _id: string
  name: string
  cefrLevel: string
  explanationMarkdown: string
  ruleSummary: string
  examples: ExplanationExample[]
  unitId: string
}

export interface CurriculumUnitDTO {
  _id: string
  weekNumber: number
  cefrLevel: CefrLevel
  title: string
  description: string
  vocabularyTheme: string
  grammarFocus: string
  estimatedMinutes: number
  order: number
}

export interface LessonDTO {
  _id: string
  stageId?: string
  type: LessonType
  title: string
  orderInUnit: number
  estimatedMinutes: number
  content: LessonContent
}

export interface SRSCardDTO {
  _id: string
  userId: string
  vocabularyItemId: string
  vocabularyItem?: VocabularyItemDTO
  intervalDays: number
  easeFactor: number
  repetitionCount: number
  dueDate: string
  status: SRSStatus
  lastReviewedAt: string | null
  lastRating: number | null
}

export interface UserLessonProgressDTO {
  _id: string
  userId: string
  lessonId: string
  status: LessonStatus
  score: number
  completedAt: string | null
  timeSpentSeconds: number
  attemptCount: number
}

export interface DashboardResponse {
  user: UserDTO
  todaySession: {
    totalMinutes: number
    xpEarned: number
    srsCardsReviewed: number
    exercisesCompleted: number
    qualifiesForStreak: boolean
  } | null
  streak: {
    current: number
    freezesLeft: number
  }
  dueCardCount: number
  nextLesson: LessonDTO | null
  weeklyXp: number[]
}

export interface SRSStatsResponse {
  total: number
  mastered: number
  learning: number
  new: number
  dueToday: number
}

export interface ReviewResponse {
  card: SRSCardDTO
  xpEarned: number
  newStatus: SRSStatus
}

export interface LessonCompleteResponse {
  score: number
  xpEarned: number
  correctAnswers: number
  totalExercises: number
  results: Array<{
    exerciseId: string
    isCorrect: boolean
    correctAnswer: string
    explanation?: string
  }>
}

export interface CurriculumUnitWithProgress extends CurriculumUnitDTO {
  progress: {
    completedLessons: number
    totalLessons: number
    percentComplete: number
  }
  lessons: Array<LessonDTO & { progressStatus: LessonStatus; score: number }>
}

export interface ProgressResponse {
  vocabularyStats: {
    total: number
    mastered: number
    learning: number
    new: number
    byLevel: Record<string, number>
  }
  grammarProgress: {
    conceptsIntroduced: number
    totalConcepts: number
  }
  streakHistory: Array<{ date: string; qualified: boolean }>
  totalXp: number
  xpByWeek: Array<{ week: string; xp: number }>
}

export interface AuthResponse {
  accessToken: string
  user: UserDTO
}
