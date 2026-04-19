import type { ProgressResponse } from '@lernen/shared'
import { useQuery } from '@tanstack/react-query'
import { Award, BarChart3, BookOpen, Flame, Loader2, Star } from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { ProgressBar } from '../components/ProgressBar'
import { api } from '../lib/api'

export function ProgressPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['progress'],
    queryFn: async () => {
      const response = await api.get<ProgressResponse>('/progress')
      return response.data
    },
  })

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={36} className="animate-spin text-amber-400" />
        </div>
      </AppLayout>
    )
  }

  if (!data) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-slate-400">Failed to load progress.</p>
        </div>
      </AppLayout>
    )
  }

  const { vocabularyStats, grammarProgress, streakHistory, totalXp, xpByWeek } = data
  const masteryPercent =
    vocabularyStats.total > 0
      ? Math.round((vocabularyStats.mastered / vocabularyStats.total) * 100)
      : 0

  // Last 30 days streak calendar
  const last30 = streakHistory.slice(0, 30).reverse()

  return (
    <AppLayout>
      <div className="px-6 py-8 max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Your Progress</h1>
          <p className="text-slate-400 mt-1">Track your German learning journey</p>
        </div>

        {/* XP & Level */}
        <div className="bg-gradient-to-br from-amber-400/10 to-amber-500/5 border border-amber-400/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Star size={24} className="text-amber-400" fill="currentColor" />
            <h2 className="text-lg font-semibold text-white">Total Experience</h2>
          </div>
          <p className="text-4xl font-bold text-amber-400 mb-1">{totalXp.toLocaleString()} XP</p>
          <p className="text-slate-400 text-sm">
            Keep earning XP by completing lessons and reviewing cards
          </p>
        </div>

        {/* Vocabulary stats */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <BookOpen size={20} className="text-amber-400" />
            <h2 className="font-semibold text-white">Vocabulary Mastery</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <VocabStat label="Total" value={vocabularyStats.total} color="text-white" />
            <VocabStat label="Mastered" value={vocabularyStats.mastered} color="text-emerald-400" />
            <VocabStat label="Learning" value={vocabularyStats.learning} color="text-amber-400" />
            <VocabStat label="New" value={vocabularyStats.new} color="text-blue-400" />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Mastery progress</span>
              <span className="text-white font-medium">{masteryPercent}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${masteryPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>0</span>
              <span>{vocabularyStats.total} words</span>
            </div>
          </div>
        </div>

        {/* Grammar progress */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Award size={20} className="text-amber-400" />
            <h2 className="font-semibold text-white">Grammar Concepts</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{grammarProgress.conceptsIntroduced}</p>
              <p className="text-xs text-slate-400 mt-1">Concepts learned</p>
            </div>
            <div className="flex-1">
              <ProgressBar
                value={grammarProgress.conceptsIntroduced}
                max={grammarProgress.totalConcepts}
                color="amber"
                size="lg"
                showLabel
              />
            </div>
          </div>
        </div>

        {/* Streak calendar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Flame size={20} className="text-amber-400" />
            <h2 className="font-semibold text-white">Streak History</h2>
          </div>
          {last30.length > 0 ? (
            <div className="grid grid-cols-10 gap-2">
              {last30.map((day) => (
                <div
                  key={day.date}
                  title={day.date}
                  className={`aspect-square rounded-md ${
                    day.qualified ? 'bg-amber-400/80' : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">
              No activity recorded yet. Start learning today!
            </p>
          )}
          <p className="text-xs text-slate-600 mt-3">Last 30 days — amber = qualified streak day</p>
        </div>

        {/* Weekly XP */}
        {xpByWeek.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 size={20} className="text-amber-400" />
              <h2 className="font-semibold text-white">XP This Week</h2>
            </div>
            <div className="space-y-3">
              {xpByWeek.slice(-7).map((entry) => (
                <div key={entry.week} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-20 shrink-0">
                    {new Date(entry.week).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <div className="flex-1">
                    <ProgressBar
                      value={entry.xp}
                      max={Math.max(...xpByWeek.map((e) => e.xp), 1)}
                      color="amber"
                      size="sm"
                    />
                  </div>
                  <span className="text-xs text-amber-400 font-medium w-16 text-right">
                    {entry.xp} XP
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function VocabStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
  )
}
