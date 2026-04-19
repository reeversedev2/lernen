import { Link } from '@tanstack/react-router'
import {
  BookOpen,
  ChevronRight,
  Loader2,
  Map as MapIcon,
  RotateCcw,
  Sparkles,
  Star,
  Target,
  TrendingUp,
} from 'lucide-react'
import { LessonBrewingCard } from '../components/LessonBrewingCard'
import { AppLayout } from '../components/layout/AppLayout'
import { ProgressBar } from '../components/ProgressBar'
import { StreakDisplay } from '../components/StreakDisplay'
import { XpDisplay } from '../components/XpDisplay'
import { useDashboard } from '../hooks/use-dashboard'
import { useOllamaStatus } from '../hooks/use-practice'
import { useRoadmap } from '../hooks/use-roadmap'
import { getGreeting } from '../lib/utils'

export function DashboardPage() {
  const { data, isLoading, refetch } = useDashboard()
  const { data: ollamaStatus } = useOllamaStatus()
  const { data: roadmap } = useRoadmap()
  const currentStage = roadmap?.stages.find((s) => s.isCurrent)

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full min-h-[60vh]">
          <Loader2 size={36} className="animate-spin text-amber-400" />
        </div>
      </AppLayout>
    )
  }

  if (!data) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full min-h-[60vh]">
          <p className="text-slate-400">Failed to load dashboard.</p>
        </div>
      </AppLayout>
    )
  }

  const { user, todaySession, streak, dueCardCount, nextLesson, weeklyXp } = data
  const greeting = getGreeting()
  const maxWeeklyXp = Math.max(...weeklyXp, 1)

  return (
    <AppLayout>
      <div className="px-6 py-8 max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {greeting}, {user.displayName.split(' ')[0]}!
            </h1>
            <p className="text-slate-400 mt-1">
              {todaySession?.exercisesCompleted
                ? 'Great progress today.'
                : "Let's get started today."}
            </p>
          </div>
          <XpDisplay size="md" showBar />
        </div>

        {/* Roadmap current stage CTA */}
        {currentStage && (
          <Link
            to="/stages/$stageId"
            params={{ stageId: currentStage._id }}
            className="flex items-center gap-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-colors group"
          >
            <div className="w-12 h-12 flex items-center justify-center text-2xl rounded-xl bg-slate-800 group-hover:scale-110 transition-transform shrink-0">
              {currentStage.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <MapIcon size={13} className="text-slate-500" />
                <span className="text-xs text-slate-500 uppercase tracking-widest font-medium">
                  {currentStage.worldName} · {currentStage.cefrLevel}
                </span>
              </div>
              <p className="text-white font-semibold text-sm truncate">{currentStage.theme}</p>
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Star
                    key={i}
                    size={11}
                    fill={i < currentStage.stars ? '#fbbf24' : 'none'}
                    className={i < currentStage.stars ? 'text-amber-400' : 'text-slate-600'}
                  />
                ))}
                {currentStage.exerciseSetsAvailable > 0 && (
                  <span className="text-xs text-emerald-400 ml-1.5">
                    {currentStage.exerciseSetsAvailable} practice set
                    {currentStage.exerciseSetsAvailable !== 1 ? 's' : ''} ready
                  </span>
                )}
              </div>
            </div>
            <ChevronRight
              size={18}
              className="text-slate-600 group-hover:text-slate-400 shrink-0"
            />
          </Link>
        )}

        {/* Main CTA */}
        {!nextLesson ? (
          <LessonBrewingCard onLessonReady={refetch} />
        ) : (
          <div className="bg-linear-to-br from-amber-400/10 to-amber-500/5 border border-amber-400/20 rounded-2xl p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">{nextLesson.title}</h2>
                <p className="text-slate-400 text-sm mt-1">
                  {`${nextLesson.estimatedMinutes} min · ${nextLesson.type}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {dueCardCount > 0 && (
                  <Link
                    to="/review"
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 border border-slate-700 text-white rounded-xl font-medium hover:bg-slate-700 transition-colors text-sm"
                  >
                    <RotateCcw size={16} />
                    Review {dueCardCount} cards
                  </Link>
                )}
                {ollamaStatus?.ollamaStatus === 'ready' &&
                  ollamaStatus?.sessionStatus === 'pending' && (
                    <Link
                      to="/practice"
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 border border-amber-400/30 text-amber-400 rounded-xl font-medium hover:bg-amber-400/10 transition-colors text-sm"
                    >
                      <Sparkles size={16} />
                      AI Practice
                    </Link>
                  )}
                {ollamaStatus &&
                  ollamaStatus.ollamaStatus !== 'unavailable' &&
                  ollamaStatus.sessionStatus !== 'pending' && (
                    <div
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 border border-slate-700 text-slate-500 rounded-xl text-sm cursor-default"
                      title={
                        ollamaStatus.ollamaStatus === 'downloading'
                          ? 'AI model is downloading — check docker logs lernen-ollama-pull-1'
                          : 'Preparing your next session...'
                      }
                    >
                      <Loader2 size={16} className="animate-spin" />
                      {ollamaStatus.ollamaStatus === 'downloading'
                        ? 'AI loading...'
                        : 'Preparing...'}
                    </div>
                  )}
                <Link
                  to="/learn/$lessonId"
                  params={{ lessonId: nextLesson._id }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-400 text-slate-950 rounded-xl font-semibold hover:bg-amber-500 transition-colors text-sm"
                >
                  <BookOpen size={16} />
                  {todaySession ? 'Continue Learning' : 'Start Lesson'}
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Day Streak"
            icon={<StreakDisplay count={streak.current} size="sm" />}
            sub={`${streak.freezesLeft} freeze${streak.freezesLeft !== 1 ? 's' : ''} left`}
          />
          <StatCard
            label="Total XP"
            value={user.totalXp.toLocaleString()}
            sub="experience points"
            icon={<Star size={20} className="text-amber-400" fill="currentColor" />}
          />
          <StatCard
            label="Due Today"
            value={dueCardCount.toString()}
            sub="flashcards"
            icon={<RotateCcw size={20} className="text-blue-400" />}
          />
          <StatCard
            label="Today's XP"
            value={(todaySession?.xpEarned ?? 0).toString()}
            sub={`${todaySession?.exercisesCompleted ?? 0} exercises`}
            icon={<Target size={20} className="text-emerald-400" />}
          />
        </div>

        {/* Weekly XP chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-amber-400" />
              Weekly XP
            </h3>
            <span className="text-slate-400 text-sm">Last 7 days</span>
          </div>
          <div className="flex items-end gap-2 h-24">
            {weeklyXp.map((xp, i) => {
              const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
              const today = new Date().getDay()
              const dayIndex = (today - 6 + i + 7) % 7
              const isToday = i === 6

              return (
                <div key={dayIndex} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex flex-col justify-end" style={{ height: '72px' }}>
                    <div
                      className={`w-full rounded-t-lg transition-all ${
                        isToday ? 'bg-amber-400' : 'bg-amber-400/30'
                      }`}
                      style={{
                        height: `${Math.max(4, (xp / maxWeeklyXp) * 72)}px`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">{days[dayIndex]}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Today's session */}
        {todaySession && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="font-semibold text-white mb-4">Today's Activity</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-amber-400">{todaySession.srsCardsReviewed}</p>
                <p className="text-xs text-slate-400 mt-1">Cards reviewed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">
                  {todaySession.exercisesCompleted}
                </p>
                <p className="text-xs text-slate-400 mt-1">Exercises done</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-400">{todaySession.xpEarned}</p>
                <p className="text-xs text-slate-400 mt-1">XP earned</p>
              </div>
            </div>
            {todaySession.qualifiesForStreak && (
              <div className="mt-4 p-3 bg-amber-400/10 border border-amber-400/20 rounded-xl text-center">
                <p className="text-sm text-amber-400 font-medium">
                  ✓ Today's session counts toward your streak!
                </p>
              </div>
            )}
            {!todaySession.qualifiesForStreak && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-2">
                  Streak progress (need 10+ cards OR 1+ exercise)
                </p>
                <ProgressBar
                  value={
                    Math.max(
                      todaySession.srsCardsReviewed / 10,
                      todaySession.exercisesCompleted > 0 ? 1 : 0,
                    ) * 100
                  }
                  max={100}
                  size="sm"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string
  value?: string
  sub?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        {icon && <div className="shrink-0">{icon}</div>}
      </div>
      {value && <p className="text-2xl font-bold text-white">{value}</p>}
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}
