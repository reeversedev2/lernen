import { Link } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle, Loader2, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { ProgressBar } from '../components/ProgressBar'
import { SRSCard } from '../components/SRSCard'
import { useDueCards, useSubmitReview } from '../hooks/use-srs'

export function ReviewPage() {
  const { data: cards, isLoading, refetch } = useDueCards(20)
  const { mutate: submitReview, isPending } = useSubmitReview()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [stats, setStats] = useState({ correct: 0, total: 0 })

  const handleRate = (rating: 0 | 1 | 2 | 3) => {
    if (!cards?.[currentIndex]) return

    const card = cards[currentIndex]
    submitReview(
      { cardId: card._id, rating },
      {
        onSuccess: () => {
          const isGoodRating = rating >= 2
          setStats((s) => ({
            correct: s.correct + (isGoodRating ? 1 : 0),
            total: s.total + 1,
          }))

          if (currentIndex < cards.length - 1) {
            setCurrentIndex((i) => i + 1)
          } else {
            setSessionComplete(true)
          }
        },
      },
    )
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setSessionComplete(false)
    setStats({ correct: 0, total: 0 })
    refetch()
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={36} className="animate-spin text-amber-400" />
        </div>
      </AppLayout>
    )
  }

  if (!cards || cards.length === 0) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh] px-6">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">All caught up!</h2>
            <p className="text-slate-400 mb-8">
              No cards are due for review right now. Great work staying on top of your vocabulary!
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 text-slate-950 rounded-xl font-semibold hover:bg-amber-500 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (sessionComplete) {
    const accuracy = Math.round((stats.correct / stats.total) * 100)

    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh] px-6">
          <div className="text-center w-full px-28">
            <div className="w-20 h-20 bg-amber-400/10 border border-amber-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} className="text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Session complete!</h2>
            <p className="text-slate-400 mb-6">You reviewed {stats.total} cards</p>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-emerald-400">{stats.correct}</p>
                  <p className="text-xs text-slate-400 mt-1">Correct</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-amber-400">{accuracy}%</p>
                  <p className="text-xs text-slate-400 mt-1">Accuracy</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleRestart}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-800 border border-slate-700 text-white rounded-xl font-medium hover:bg-slate-700 transition-colors"
              >
                <RotateCcw size={16} />
                Review more
              </button>
              <Link
                to="/dashboard"
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-400 text-slate-950 rounded-xl font-semibold hover:bg-amber-500 transition-colors"
              >
                Done
              </Link>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  const currentCard = cards[currentIndex]
  const progress = (currentIndex / cards.length) * 100

  return (
    <AppLayout>
      <div className="px-6 py-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            Exit
          </Link>
          <div className="text-center">
            <p className="text-sm text-slate-400">
              {currentIndex + 1} / {cards.length}
            </p>
          </div>
          <div className="w-16 text-right">
            <p className="text-sm font-medium text-amber-400">{stats.correct} correct</p>
          </div>
        </div>

        {/* Progress bar */}
        <ProgressBar value={progress} max={100} className="mb-8" />

        {/* Card */}
        <SRSCard
          key={currentCard._id}
          card={currentCard}
          onRate={handleRate}
          isSubmitting={isPending}
        />

        {/* Instructions */}
        <p className="text-center text-xs text-slate-600 mt-6">
          Speak the German word aloud — your answer is checked automatically
        </p>
      </div>
    </AppLayout>
  )
}
