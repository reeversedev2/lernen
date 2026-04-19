import {
  checkAnswer,
  type Exercise,
  type StageCompleteResponse,
  type StageSessionDTO,
} from '@lernen/shared'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle,
  ChevronLeft,
  Loader2,
  Lock,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { ExerciseRenderer } from '../components/ExerciseRenderer'
import { AppLayout } from '../components/layout/AppLayout'
import {
  useCompleteStagePractice,
  useStageDetail,
  useStartStagePractice,
} from '../hooks/use-roadmap'

// ── World colours (mirrors RoadmapPage) ─────────────────────────────────────

const WORLD_STYLES = {
  'Das Dorf': {
    gradient: 'from-amber-600 via-orange-500 to-amber-700',
    accent: '#f59e0b',
    textAccent: 'text-amber-300',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  'Die Stadt': {
    gradient: 'from-sky-600 via-cyan-500 to-sky-700',
    accent: '#0ea5e9',
    textAccent: 'text-sky-300',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
  },
  'Die Welt': {
    gradient: 'from-violet-600 via-purple-500 to-violet-700',
    accent: '#8b5cf6',
    textAccent: 'text-violet-300',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
  },
  'Das Leben': {
    gradient: 'from-emerald-600 via-green-500 to-emerald-700',
    accent: '#10b981',
    textAccent: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
} as const

type FlowState =
  | { phase: 'detail' }
  | { phase: 'practice'; session: StageSessionDTO }
  | { phase: 'results'; result: StageCompleteResponse; session: StageSessionDTO }

// ── Page ──────────────────────────────────────────────────────────────────────

export function StagePage() {
  const { stageId } = useParams({ from: '/stages/$stageId' })
  const navigate = useNavigate()
  const { data, isLoading } = useStageDetail(stageId)
  const { mutate: startPractice, isPending: isStarting } = useStartStagePractice(stageId)
  const { mutate: completePractice, isPending: isCompleting } = useCompleteStagePractice(stageId)

  const [flow, setFlow] = useState<FlowState>({ phase: 'detail' })
  const [answers, setAnswers] = useState<Map<string, { answer: string; timeSpentMs: number }>>(
    new Map(),
  )
  const [currentExIndex, setCurrentExIndex] = useState(0)
  const [currentResult, setCurrentResult] = useState<{
    isCorrect: boolean
    isTypo: boolean
    correctAnswer: string
  } | null>(null)

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={36} className="animate-spin text-amber-400" />
        </div>
      </AppLayout>
    )
  }

  if (!data) return null

  const { stage, userProgress, lessons, practiceAvailable, recentScores } = data
  const style =
    WORLD_STYLES[stage.worldName as keyof typeof WORLD_STYLES] ?? WORLD_STYLES['Das Dorf']

  // ── Practice flow handlers ────────────────────────────────────────────────

  const handleStartPractice = () => {
    startPractice(undefined, {
      onSuccess: (session) => {
        setFlow({ phase: 'practice', session })
        setAnswers(new Map())
        setCurrentExIndex(0)
      },
    })
  }

  const handleAnswer = (exerciseId: string, answer: string, timeSpentMs: number) => {
    if (flow.phase !== 'practice') return
    const exercises = flow.session.exercises as Exercise[]
    const exercise = exercises[currentExIndex]
    const { isCorrect, isTypo } = checkAnswer(exercise.type, answer, exercise.answer)
    setAnswers((prev) => new Map(prev).set(exerciseId, { answer, timeSpentMs }))
    setCurrentResult({ isCorrect, isTypo, correctAnswer: exercise.answer })
  }

  const handleNext = () => {
    if (flow.phase !== 'practice') return
    const exercises = flow.session.exercises as Exercise[]
    setCurrentResult(null)
    if (currentExIndex < exercises.length - 1) {
      setCurrentExIndex((i) => i + 1)
    } else {
      // Submit
      const answerArray = exercises.map((ex) => ({
        exerciseId: ex.id,
        answer: answers.get(ex.id)?.answer ?? '',
        timeSpentMs: answers.get(ex.id)?.timeSpentMs ?? 0,
      }))
      completePractice(
        { historyId: flow.session.historyId, answers: answerArray },
        {
          onSuccess: (result) => setFlow({ phase: 'results', result, session: flow.session }),
        },
      )
    }
  }

  // ── Practice phase ────────────────────────────────────────────────────────

  if (flow.phase === 'practice') {
    const exercises = flow.session.exercises as Exercise[]
    const exercise = exercises[currentExIndex]
    const progress = (currentExIndex / exercises.length) * 100

    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-8">
            <button
              type="button"
              onClick={() => setFlow({ phase: 'detail' })}
              className="p-1.5 text-slate-400 hover:text-white"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: style.accent }}
              />
            </div>
            <span className="text-sm text-slate-500 shrink-0">
              {currentExIndex + 1} / {exercises.length}
            </span>
          </div>

          {/* Topic chip */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">{stage.emoji}</span>
            <span className="text-sm font-medium" style={{ color: style.accent }}>
              {flow.session.topic}
            </span>
          </div>

          <ExerciseRenderer
            exercise={exercise}
            onAnswer={(answer, timeSpentMs) => handleAnswer(exercise.id, answer, timeSpentMs)}
            showResult={!!currentResult}
            isCorrect={currentResult?.isCorrect}
            isTypo={currentResult?.isTypo}
            correctAnswer={currentResult?.correctAnswer}
            wrongFeedback={
              currentResult && !currentResult.isCorrect ? exercise.wrongFeedback : undefined
            }
            correctFeedback={currentResult?.isCorrect ? exercise.correctFeedback : undefined}
          />

          {currentResult && (
            <button
              type="button"
              onClick={handleNext}
              disabled={isCompleting}
              className="mt-6 w-full py-3.5 rounded-xl font-semibold text-base transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: style.accent, color: '#0f172a' }}
            >
              {isCompleting ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Scoring...
                </>
              ) : currentExIndex < exercises.length - 1 ? (
                <>
                  <ArrowRight size={18} /> Continue
                </>
              ) : (
                <>
                  <CheckCircle size={18} /> Finish
                </>
              )}
            </button>
          )}
        </div>
      </AppLayout>
    )
  }

  // ── Results phase ─────────────────────────────────────────────────────────

  if (flow.phase === 'results') {
    const { result } = flow
    const passed = result.score >= 60

    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
          {/* Score card */}
          <div className="text-center">
            <div className="text-6xl mb-3">{passed ? '🎉' : '💪'}</div>
            <h2 className="text-3xl font-bold text-white">{result.score}%</h2>
            <p className="text-slate-400 mt-1">
              {result.correctAnswers} / {result.totalExercises} correct
            </p>
          </div>

          {/* Stars gained */}
          {result.starsGained > 0 && (
            <div
              className={`flex items-center justify-center gap-3 py-4 rounded-2xl border ${style.border} ${style.bg}`}
            >
              <Trophy size={20} style={{ color: style.accent }} />
              <p className="font-semibold text-white">
                {result.starsGained === 1 ? 'Star earned!' : `${result.starsGained} stars earned!`}
              </p>
              <div className="flex gap-1">
                {Array.from({ length: result.stars }).map((_, i) => (
                  <Star key={i} size={16} fill={style.accent} style={{ color: style.accent }} />
                ))}
              </div>
            </div>
          )}

          {/* XP */}
          <div className="flex items-center justify-center gap-2 py-3 bg-amber-400/10 border border-amber-400/20 rounded-2xl">
            <span className="text-amber-400 font-bold text-lg">+{result.xpEarned} XP</span>
          </div>

          {/* Per-exercise breakdown */}
          <div className="space-y-2">
            {result.results.map((r, i) => (
              <div
                key={r.exerciseId}
                className={`flex items-start gap-3 p-3 rounded-xl border ${
                  r.isTypo
                    ? 'bg-amber-500/5 border-amber-500/20'
                    : r.isCorrect
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-red-500/5 border-red-500/20'
                }`}
              >
                {r.isTypo ? (
                  <AlertCircle size={18} className="text-amber-400 mt-0.5 shrink-0" />
                ) : r.isCorrect ? (
                  <CheckCircle size={18} className="text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <XCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${r.isTypo ? 'text-amber-300' : 'text-slate-300'}`}>
                    Exercise {i + 1}
                    {r.isTypo ? ' · Typo' : ''}
                  </p>
                  {r.isTypo && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Correct spelling: <span className="text-white">{r.correctAnswer}</span>
                    </p>
                  )}
                  {!r.isCorrect && !r.isTypo && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Correct: <span className="text-white">{r.correctAnswer}</span>
                    </p>
                  )}
                  {r.explanation && (
                    <p className="text-xs text-slate-500 mt-0.5 italic">{r.explanation}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleStartPractice}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-800 border border-slate-700 text-white rounded-xl font-medium hover:bg-slate-700 transition-colors"
            >
              <RotateCcw size={16} />
              Practice again
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: '/roadmap' })}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-colors"
              style={{ background: style.accent, color: '#0f172a' }}
            >
              Back to roadmap
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  // ── Detail phase (default) ────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        {/* Hero header */}
        <div className={`relative bg-gradient-to-br ${style.gradient} overflow-hidden`}>
          {/* Decorative floating emoji layer */}
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
            <span className="absolute top-4 left-6 text-5xl opacity-15 rotate-12">
              {stage.emoji}
            </span>
            <span className="absolute top-10 right-10 text-4xl opacity-10 -rotate-6">
              {stage.emoji}
            </span>
            <span className="absolute bottom-8 left-1/4 text-6xl opacity-10 rotate-3">
              {stage.emoji}
            </span>
            <span className="absolute bottom-4 right-8 text-3xl opacity-20 -rotate-12">
              {stage.emoji}
            </span>
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl opacity-5">
              {stage.emoji}
            </span>
          </div>

          {/* Back button */}
          <div className="relative z-10 pt-4 px-4">
            <Link
              to="/roadmap"
              className="inline-flex items-center gap-1 text-white/70 hover:text-white text-sm transition-colors"
            >
              <ChevronLeft size={16} />
              Roadmap
            </Link>
          </div>

          {/* Stage info */}
          <div className="relative z-10 px-6 pb-8 pt-4">
            <div className="flex items-start gap-4">
              <div
                className="w-16 h-16 flex items-center justify-center text-3xl shrink-0 rounded-2xl shadow-lg"
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
              >
                {stage.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-white/60 uppercase tracking-widest">
                    Stage {stage.order} · {stage.cefrLevel}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-white leading-tight">{stage.theme}</h1>
                <p className="text-white/70 text-sm mt-1 leading-relaxed">{stage.description}</p>
              </div>
            </div>

            {/* Stars */}
            <div className="flex items-center gap-2 mt-5">
              <div className="flex gap-1.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Star
                    key={i}
                    size={20}
                    className={i < userProgress.stars ? 'drop-shadow-sm' : 'opacity-30'}
                    fill={i < userProgress.stars ? '#fbbf24' : 'none'}
                    color={i < userProgress.stars ? '#fbbf24' : '#fff'}
                  />
                ))}
              </div>
              {userProgress.totalCompletions > 0 && (
                <span className="text-sm text-white/60">
                  {userProgress.totalCompletions} session
                  {userProgress.totalCompletions !== 1 ? 's' : ''} · {userProgress.averageScore}%
                  avg
                </span>
              )}
            </div>

            {/* Score sparkline */}
            {recentScores.length > 0 && (
              <div className="flex items-end gap-1 mt-3 h-8">
                {recentScores.map((score, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm opacity-70"
                    style={{
                      height: `${Math.max(20, score)}%`,
                      background: score >= 60 ? '#4ade80' : '#f87171',
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Practice CTA */}
          <PracticeCard
            practiceAvailable={practiceAvailable}
            isStarting={isStarting}
            onStart={handleStartPractice}
            style={style}
            stars={userProgress.stars}
          />

          {/* Lessons */}
          {lessons.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Lessons
              </h2>
              <div className="space-y-2">
                {lessons.map((lesson) => (
                  <Link
                    key={lesson._id}
                    to="/learn/$lessonId"
                    params={{ lessonId: lesson._id }}
                    className="flex items-center gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors group"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        lesson.progressStatus === 'completed'
                          ? 'bg-emerald-500/20'
                          : lesson.progressStatus === 'in_progress'
                            ? `${style.bg}`
                            : 'bg-slate-800'
                      }`}
                    >
                      {lesson.progressStatus === 'completed' ? (
                        <CheckCircle size={18} className="text-emerald-400" />
                      ) : (
                        <BookOpen
                          size={18}
                          style={{
                            color:
                              lesson.progressStatus === 'in_progress' ? style.accent : undefined,
                          }}
                          className={
                            lesson.progressStatus !== 'in_progress' ? 'text-slate-500' : ''
                          }
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{lesson.title}</p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {lesson.estimatedMinutes} min · {lesson.type}
                      </p>
                    </div>
                    {lesson.progressStatus === 'completed' && (
                      <span className="text-xs font-mono text-slate-500">{lesson.score}%</span>
                    )}
                    <ChevronLeft
                      size={16}
                      className="text-slate-600 group-hover:text-slate-400 rotate-180 shrink-0"
                    />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {lessons.length === 0 && (
            <div className={`p-4 rounded-xl border ${style.border} ${style.bg}`}>
              <div className="flex items-center gap-3">
                <Loader2
                  size={16}
                  style={{ color: style.accent }}
                  className="animate-spin shrink-0"
                />
                <div>
                  <p className="text-sm font-medium text-white">Lessons are being prepared</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your AI tutor is crafting lessons for this stage
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

// ── Practice Card ─────────────────────────────────────────────────────────────

function PracticeCard({
  practiceAvailable,
  isStarting,
  onStart,
  style,
  stars,
}: {
  practiceAvailable: boolean
  isStarting: boolean
  onStart: () => void
  style: (typeof WORLD_STYLES)[keyof typeof WORLD_STYLES]
  stars: number
}) {
  const difficultyLabel = stars >= 2 ? 'Hard' : stars >= 1 ? 'Medium' : 'Easy'

  return (
    <div className={`rounded-2xl border ${style.border} overflow-hidden`}>
      <div className={`px-5 py-4 ${style.bg}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={15} style={{ color: style.accent }} />
              <span
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: style.accent }}
              >
                AI Practice · {difficultyLabel}
              </span>
            </div>
            <p className="text-white font-semibold">5 themed exercises</p>
            <p className="text-slate-400 text-sm mt-0.5">
              {practiceAvailable
                ? 'A fresh set is ready for you'
                : 'Being prepared — check back shortly'}
            </p>
          </div>
          <button
            type="button"
            onClick={onStart}
            disabled={!practiceAvailable || isStarting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 shrink-0"
            style={practiceAvailable ? { background: style.accent, color: '#0f172a' } : {}}
          >
            {isStarting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : practiceAvailable ? (
              <>
                Start <ArrowRight size={14} />
              </>
            ) : (
              <>
                <Lock size={14} /> Soon
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
