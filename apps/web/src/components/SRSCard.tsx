import { checkAnswer, type SRSCardDTO } from '@lernen/shared'
import { ChevronDown, Mic, MicOff, RotateCcw, Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSpeechRecognition } from '../hooks/use-speech-recognition'
import { useTTS } from '../hooks/use-tts'
import { playCorrect } from '../lib/sounds'
import { cn } from '../lib/utils'

interface SRSCardProps {
  card: SRSCardDTO
  onRate: (rating: 0 | 1 | 2 | 3) => void
  isSubmitting?: boolean
}

// Card state machine
// prompt → listening → result → (done)
//       ↘ fallback → (done)
type CardState = 'prompt' | 'listening' | 'result' | 'fallback'

const ratingButtons = [
  {
    rating: 0 as const,
    label: 'Again',
    color: 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20',
  },
  {
    rating: 1 as const,
    label: 'Hard',
    color: 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20',
  },
  {
    rating: 2 as const,
    label: 'Good',
    color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20',
  },
  {
    rating: 3 as const,
    label: 'Easy',
    color: 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20',
  },
]

function autoRate(isCorrect: boolean, isTypo: boolean): 0 | 1 | 2 {
  if (isCorrect && !isTypo) return 2 // Good
  if (isTypo) return 1 // Hard
  return 0 // Again
}

export function SRSCard({ card, onRate, isSubmitting = false }: SRSCardProps) {
  const [state, setState] = useState<CardState>('prompt')
  const [showOverride, setShowOverride] = useState(false)
  const vocab = card.vocabularyItem
  const { speak } = useTTS()
  const {
    status: micStatus,
    transcript,
    start: startListening,
    reset: resetMic,
    isSupported: micSupported,
    errorMessage,
  } = useSpeechRecognition('de-DE')

  const germanWord = vocab ? `${vocab.article ? `${vocab.article} ` : ''}${vocab.german}` : ''

  // When STT finishes, move to result state
  useEffect(() => {
    if (micStatus === 'done' && state === 'listening') {
      setState('result')
      if (germanWord) speak(germanWord)
      // Check inline so we can play sound immediately on correct
      const result = transcript
        ? checkAnswer(
            'translate_en_de',
            transcript,
            vocab?.german ?? '',
            vocab?.article ? [`${vocab.article} ${vocab.german}`] : undefined,
          )
        : null
      if (result?.isCorrect) playCorrect().catch(() => {})
    }
  }, [micStatus, state, germanWord, speak, transcript, vocab])

  if (!vocab) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-900 rounded-xl border border-slate-800">
        <p className="text-slate-500">Loading card...</p>
      </div>
    )
  }

  // Check spoken answer against German word (article optional)
  const spokenResult = transcript
    ? checkAnswer(
        'translate_en_de',
        transcript,
        vocab.german,
        vocab.article ? [`${vocab.article} ${vocab.german}`] : undefined,
      )
    : null

  const autoRating = spokenResult ? autoRate(spokenResult.isCorrect, spokenResult.isTypo) : null

  const handleRate = (rating: 0 | 1 | 2 | 3) => {
    setState('prompt')
    setShowOverride(false)
    resetMic()
    setTimeout(() => onRate(rating), 150)
  }

  const handleStartListening = () => {
    setState('listening')
    startListening()
  }

  const handleFallback = () => {
    resetMic()
    setState('fallback')
    // Play the German word when revealing manually
    if (germanWord) speak(germanWord)
  }

  const handleRetry = () => {
    resetMic()
    setState('prompt')
    setShowOverride(false)
  }

  // ── Prompt state ────────────────────────────────────────────────────────────
  if (state === 'prompt') {
    return (
      <div className="w-full max-w-lg mx-auto space-y-4">
        <div
          className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col items-center gap-6"
          style={{ minHeight: '280px' }}
        >
          <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">
            How do you say this in German?
          </p>
          <p className="text-4xl font-bold text-white text-center">{vocab.english}</p>
          {vocab.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center">
              {vocab.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-slate-800 text-slate-500 text-xs rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {micSupported ? (
            <button
              type="button"
              onClick={handleStartListening}
              className="flex items-center gap-3 px-8 py-4 bg-amber-400 text-slate-950 rounded-2xl font-bold text-lg hover:bg-amber-500 transition-colors shadow-lg shadow-amber-400/20"
            >
              <Mic size={22} />
              Tap and speak
            </button>
          ) : (
            <p className="text-sm text-slate-500">Microphone not available in this browser</p>
          )}
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={handleFallback}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors underline underline-offset-2"
          >
            I can't speak right now — show the answer
          </button>
        </div>
      </div>
    )
  }

  // ── Listening state ─────────────────────────────────────────────────────────
  if (state === 'listening') {
    return (
      <div className="w-full max-w-lg mx-auto space-y-4">
        <div
          className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col items-center gap-6"
          style={{ minHeight: '280px' }}
        >
          <p className="text-4xl font-bold text-white text-center">{vocab.english}</p>

          <div className="flex flex-col items-center gap-3">
            {/* Pulsing mic */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
              <div className="relative w-16 h-16 rounded-full bg-amber-400/10 border-2 border-amber-400/50 flex items-center justify-center">
                <Mic size={26} className="text-amber-400" />
              </div>
            </div>
            <p className="text-sm text-slate-400 animate-pulse">Listening…</p>
          </div>

          <button
            type="button"
            onClick={handleRetry}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // ── Result state ────────────────────────────────────────────────────────────
  if (state === 'result' && spokenResult && autoRating !== null) {
    const { isCorrect, isTypo } = spokenResult
    const rating = autoRating

    const resultConfig =
      isCorrect && !isTypo
        ? {
            label: 'Correct!',
            color: 'text-emerald-400',
            border: 'border-emerald-500/30',
            bg: 'bg-emerald-500/5',
          }
        : isTypo
          ? {
              label: 'Close!',
              color: 'text-amber-400',
              border: 'border-amber-500/30',
              bg: 'bg-amber-500/5',
            }
          : {
              label: 'Not quite',
              color: 'text-red-400',
              border: 'border-red-500/30',
              bg: 'bg-red-500/5',
            }

    return (
      <div className="w-full max-w-lg mx-auto space-y-3">
        <div
          className={cn(
            'border rounded-xl p-6 flex flex-col items-center gap-4',
            resultConfig.border,
            resultConfig.bg,
          )}
          style={{ minHeight: '280px' }}
        >
          <p className={cn('text-sm font-semibold uppercase tracking-widest', resultConfig.color)}>
            {resultConfig.label}
          </p>

          {/* What they said */}
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">You said</p>
            <p className="text-lg text-slate-300 italic">"{transcript}"</p>
          </div>

          {/* Correct answer */}
          <div className="text-center">
            <p className="text-xs text-slate-500 mb-1">Correct answer</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-2xl font-bold text-white">{germanWord}</p>
              <button
                type="button"
                onClick={() => speak(germanWord)}
                className="p-1.5 text-slate-500 hover:text-amber-400 transition-colors rounded-lg hover:bg-slate-800"
              >
                <Volume2 size={15} />
              </button>
            </div>
            {vocab.exampleGerman && (
              <p className="text-xs text-slate-500 mt-1 italic">{vocab.exampleGerman}</p>
            )}
          </div>

          {/* Auto-rated badge */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Auto-rated:</span>
            <span className={cn('font-semibold', ratingButtons[rating].color.split(' ')[2])}>
              {ratingButtons[rating].label}
            </span>
          </div>
        </div>

        {/* Actions */}
        {!showOverride ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-3 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              <RotateCcw size={14} />
              Retry
            </button>
            <button
              type="button"
              onClick={() => handleRate(rating)}
              disabled={isSubmitting}
              className="flex-1 py-3 bg-amber-400 text-slate-950 rounded-xl font-bold hover:bg-amber-500 transition-colors disabled:opacity-50"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={() => setShowOverride(true)}
              className="px-3 py-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl text-sm hover:bg-slate-700 transition-colors"
              title="Override rating"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 text-center">Override rating</p>
            <div className="grid grid-cols-4 gap-2">
              {ratingButtons.map(({ rating: r, label, color }) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => handleRate(r)}
                  disabled={isSubmitting}
                  className={cn(
                    'py-3 rounded-lg border font-medium text-sm transition-all',
                    color,
                    isSubmitting && 'opacity-50',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {(micStatus === 'error' || errorMessage) && (
          <p className="text-xs text-red-400 text-center">{errorMessage}</p>
        )}
      </div>
    )
  }

  // ── Fallback / manual state ──────────────────────────────────────────────────
  return (
    <div className="w-full max-w-lg mx-auto space-y-3">
      <div
        className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col items-center gap-4"
        style={{ minHeight: '280px' }}
      >
        <p className="text-xs text-slate-500 uppercase tracking-widest">Answer</p>

        <div className="flex items-center gap-2">
          {vocab.article && (
            <span className="text-lg font-medium text-amber-400">{vocab.article}</span>
          )}
          <span className="text-4xl font-bold text-white">{vocab.german}</span>
          <button
            type="button"
            onClick={() => speak(germanWord)}
            className="p-1.5 text-slate-500 hover:text-amber-400 transition-colors rounded-lg hover:bg-slate-800"
          >
            <Volume2 size={16} />
          </button>
        </div>

        {vocab.verbForms && (
          <p className="text-sm text-slate-400">
            {vocab.verbForms.thirdPersonSingular} · {vocab.verbForms.pastParticiple}
          </p>
        )}
        {vocab.pluralForm && <p className="text-sm text-slate-400">pl. {vocab.pluralForm}</p>}

        <div className="w-16 h-px bg-slate-700" />

        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <p className="text-sm text-amber-300 italic">{vocab.exampleGerman}</p>
            {vocab.exampleGerman && (
              <button
                type="button"
                onClick={() => speak(vocab.exampleGerman ?? '')}
                className="p-1 text-slate-600 hover:text-amber-400 transition-colors rounded"
              >
                <Volume2 size={12} />
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">{vocab.exampleEnglish}</p>
        </div>

        {vocab.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center">
            {vocab.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {ratingButtons.map(({ rating, label, color }) => (
          <button
            type="button"
            key={rating}
            onClick={() => handleRate(rating)}
            disabled={isSubmitting}
            className={cn(
              'py-3 px-4 rounded-lg border font-medium text-sm transition-all',
              color,
              isSubmitting && 'opacity-50 cursor-not-allowed',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {micSupported && (
        <div className="text-center">
          <button
            type="button"
            onClick={handleRetry}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors mx-auto"
          >
            <MicOff size={12} />
            Switch to speaking mode
          </button>
        </div>
      )}
    </div>
  )
}
