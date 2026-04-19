import type { Exercise } from '@lernen/shared'
import { AlertCircle, CheckCircle, Lightbulb, Mic, MicOff, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { playCorrect } from '../lib/sounds'
import { cn } from '../lib/utils'

interface ExerciseRendererProps {
  exercise: Exercise
  onAnswer: (answer: string, timeSpentMs: number) => void
  showResult?: boolean
  isCorrect?: boolean
  isTypo?: boolean
  correctAnswer?: string
  wrongFeedback?: string
  correctFeedback?: string
  grammarNote?: string
}

export function ExerciseRenderer({
  exercise,
  onAnswer,
  showResult = false,
  isCorrect,
  isTypo = false,
  correctAnswer,
  wrongFeedback,
  correctFeedback,
  grammarNote,
}: ExerciseRendererProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const startTimeRef = useRef(Date.now())
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  // Web Speech API is not in TypeScript's standard lib — use a minimal structural type
  const recognitionRef = useRef<{ abort: () => void; stop: () => void } | null>(null)

  useEffect(() => {
    startTimeRef.current = Date.now()
    setSelected(null)
    setInputValue('')
    setShowHint(false)
    setTranscript('')
    setIsListening(false)
    recognitionRef.current?.abort()
  }, [])

  useEffect(() => {
    if (!showResult && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showResult])

  const handleSubmit = (answer: string) => {
    const timeSpentMs = Date.now() - startTimeRef.current
    playCorrect().catch(() => {})
    onAnswer(answer, timeSpentMs)
  }

  const handleMultipleChoice = (option: string) => {
    if (showResult) return
    setSelected(option)
    handleSubmit(option)
  }

  const handleInputSubmit = () => {
    if (!inputValue.trim() || showResult) return
    handleSubmit(inputValue.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleInputSubmit()
    }
  }

  const startListening = () => {
    type SpeechRecognitionCtor = new () => {
      lang: string
      interimResults: boolean
      maxAlternatives: number
      onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null
      onerror: (() => void) | null
      onend: (() => void) | null
      start: () => void
      abort: () => void
      stop: () => void
    }
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor
      webkitSpeechRecognition?: SpeechRecognitionCtor
    }
    const SpeechRecognitionCtor = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SpeechRecognitionCtor) return

    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'de-DE'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript
      setTranscript(result)
      setIsListening(false)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    setIsListening(true)
    recognition.start()
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  return (
    <div className="w-full">
      {/* Question */}
      <div className="mb-6">
        <p className="text-lg font-medium text-white leading-relaxed">{exercise.question}</p>
        {exercise.hint && !showResult && (
          <div className="mt-3">
            {!showHint ? (
              <button
                type="button"
                onClick={() => setShowHint(true)}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-amber-400 transition-colors"
              >
                <Lightbulb size={14} />
                Show hint
              </button>
            ) : (
              <p className="text-sm text-amber-400/80 italic flex items-start gap-1.5">
                <Lightbulb size={14} className="mt-0.5 shrink-0" />
                {exercise.hint}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Multiple choice */}
      {exercise.type === 'multiple_choice' && exercise.options && (
        <div className="grid grid-cols-2 gap-3">
          {exercise.options.map((option) => {
            const isSelected = selected === option
            const isCorrectOption = showResult && option === correctAnswer
            const isWrongSelected = showResult && isSelected && !isCorrect

            return (
              <button
                type="button"
                key={option}
                onClick={() => handleMultipleChoice(option)}
                disabled={showResult}
                className={cn(
                  'p-4 rounded-xl border text-left font-medium transition-all duration-150',
                  !showResult &&
                    'border-slate-700 bg-slate-800/50 text-white hover:border-amber-400/50 hover:bg-slate-800',
                  !showResult && isSelected && 'border-amber-400 bg-amber-400/10',
                  showResult &&
                    isCorrectOption &&
                    'border-emerald-500 bg-emerald-500/10 text-emerald-400',
                  showResult && isWrongSelected && 'border-red-500 bg-red-500/10 text-red-400',
                  showResult &&
                    !isCorrectOption &&
                    !isWrongSelected &&
                    'border-slate-800 bg-slate-800/30 text-slate-500',
                )}
              >
                {option}
                {showResult && isCorrectOption && (
                  <CheckCircle size={16} className="inline ml-2 text-emerald-400" />
                )}
                {showResult && isWrongSelected && (
                  <XCircle size={16} className="inline ml-2 text-red-400" />
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Fill blank */}
      {exercise.type === 'fill_blank' && (
        <div className="flex gap-3">
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={showResult}
            placeholder="Type your answer..."
            className={cn(
              'flex-1 px-4 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 outline-none transition-all',
              !showResult && 'border-slate-700 focus:border-amber-400',
              showResult && isCorrect && 'border-emerald-500 bg-emerald-500/10',
              showResult && !isCorrect && 'border-red-500 bg-red-500/10',
            )}
          />
          {!showResult && (
            <button
              type="button"
              onClick={handleInputSubmit}
              disabled={!inputValue.trim()}
              className="px-6 py-3 bg-amber-400 text-slate-950 rounded-xl font-semibold hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Check
            </button>
          )}
        </div>
      )}

      {/* Reading comprehension */}
      {exercise.type === 'reading_comprehension' && (
        <div className="space-y-4">
          {exercise.passage && (
            <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-xl">
              <p className="text-xs text-amber-400/80 uppercase tracking-wide font-medium mb-2">
                Lesen Sie den Text
              </p>
              <p className="text-slate-200 leading-relaxed">{exercise.passage}</p>
            </div>
          )}
          <div className="flex gap-3">
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={showResult}
              placeholder="Your answer..."
              className={cn(
                'flex-1 px-4 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 outline-none transition-all',
                !showResult && 'border-slate-700 focus:border-amber-400',
                showResult && isCorrect && 'border-emerald-500 bg-emerald-500/10',
                showResult && !isCorrect && 'border-red-500 bg-red-500/10',
              )}
            />
            {!showResult && (
              <button
                type="button"
                onClick={handleInputSubmit}
                disabled={!inputValue.trim()}
                className="px-6 py-3 bg-amber-400 text-slate-950 rounded-xl font-semibold hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Check
              </button>
            )}
          </div>
        </div>
      )}

      {/* Speaking */}
      {exercise.type === 'speaking' && (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-4 py-4">
            {!showResult && (
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                disabled={showResult}
                className={cn(
                  'w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 border-2',
                  isListening
                    ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-amber-400 hover:text-amber-400',
                )}
              >
                {isListening ? <MicOff size={32} /> : <Mic size={32} />}
              </button>
            )}
            <p className="text-sm text-slate-400">
              {isListening
                ? 'Listening... speak in German'
                : transcript
                  ? 'Tap mic to re-record'
                  : 'Tap the mic and speak in German'}
            </p>
            {transcript && (
              <div className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm">
                <span className="text-xs text-slate-500 block mb-1">You said:</span>
                {transcript}
              </div>
            )}
          </div>
          {transcript && !showResult && (
            <button
              type="button"
              onClick={() => handleSubmit(transcript)}
              className="w-full py-3 bg-amber-400 text-slate-950 rounded-xl font-semibold hover:bg-amber-500 transition-colors"
            >
              Submit Answer
            </button>
          )}
          {!(window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition &&
            !(window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition &&
            !showResult && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 text-center">
                  Speech recognition not supported. Type your answer:
                </p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type in German..."
                    className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleInputSubmit}
                    disabled={!inputValue.trim()}
                    className="px-6 py-3 bg-amber-400 text-slate-950 rounded-xl font-semibold hover:bg-amber-500 transition-colors disabled:opacity-50"
                  >
                    Check
                  </button>
                </div>
              </div>
            )}
        </div>
      )}

      {/* Translate */}
      {(exercise.type === 'translate_de_en' || exercise.type === 'translate_en_de') && (
        <div className="space-y-3">
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={showResult}
            placeholder="Type your translation..."
            rows={3}
            className={cn(
              'w-full px-4 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 outline-none resize-none transition-all',
              !showResult && 'border-slate-700 focus:border-amber-400',
              showResult && isCorrect && 'border-emerald-500 bg-emerald-500/10',
              showResult && !isCorrect && 'border-red-500 bg-red-500/10',
            )}
          />
          {!showResult && (
            <button
              type="button"
              onClick={handleInputSubmit}
              disabled={!inputValue.trim()}
              className="w-full py-3 bg-amber-400 text-slate-950 rounded-xl font-semibold hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Check Answer
            </button>
          )}
        </div>
      )}

      {/* Result feedback */}
      {showResult && (
        <div
          className={cn(
            'mt-4 p-4 rounded-xl border',
            isTypo
              ? 'bg-amber-500/10 border-amber-500/30'
              : isCorrect
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-red-500/10 border-red-500/30',
          )}
        >
          <div className="flex items-start gap-3">
            {isTypo ? (
              <AlertCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
            ) : isCorrect ? (
              <CheckCircle size={20} className="text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1.5">
              <p
                className={cn(
                  'font-semibold',
                  isTypo ? 'text-amber-400' : isCorrect ? 'text-emerald-400' : 'text-red-400',
                )}
              >
                {isTypo ? 'Watch your spelling!' : isCorrect ? 'Correct!' : 'Not quite right'}
              </p>

              {/* Correct spelling for typos */}
              {isTypo && correctAnswer && (
                <p className="text-sm text-slate-300">
                  Correct spelling: <span className="font-medium text-white">{correctAnswer}</span>
                </p>
              )}

              {/* Always show the correct answer */}
              {!isTypo && correctAnswer && (
                <p className="text-sm text-slate-300">
                  {isCorrect ? 'Perfect answer:' : 'Correct answer:'}{' '}
                  <span className="font-medium text-white">{correctAnswer}</span>
                </p>
              )}

              {/* Pre-generated pedagogical feedback */}
              {isCorrect && (correctFeedback ?? exercise.correctFeedback) && (
                <p className="text-sm text-slate-300 border-t border-slate-700/50 pt-1.5 mt-1.5">
                  {correctFeedback ?? exercise.correctFeedback}
                </p>
              )}
              {!isCorrect && !isTypo && (wrongFeedback ?? exercise.wrongFeedback) && (
                <p className="text-sm text-slate-300 border-t border-slate-700/50 pt-1.5 mt-1.5">
                  {wrongFeedback ?? exercise.wrongFeedback}
                </p>
              )}

              {/* LanguageTool grammar note for translation exercises */}
              {grammarNote && (
                <p className="text-sm text-amber-300/80 italic">Grammar note: {grammarNote}</p>
              )}

              {/* Fallback explanation */}
              {exercise.explanation &&
                !(wrongFeedback ?? exercise.wrongFeedback) &&
                !(correctFeedback ?? exercise.correctFeedback) && (
                  <p className="text-sm text-slate-400 border-t border-slate-700/50 pt-1.5 mt-1.5">
                    {exercise.explanation}
                  </p>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
