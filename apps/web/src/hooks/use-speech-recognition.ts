import { useCallback, useEffect, useRef, useState } from 'react'

export type RecognitionStatus = 'idle' | 'listening' | 'done' | 'error' | 'unsupported'

interface UseSpeechRecognitionReturn {
  status: RecognitionStatus
  transcript: string
  start: () => void
  reset: () => void
  isSupported: boolean
  errorMessage: string | null
}

// Web Speech API types — not included in TypeScript's standard lib
interface SpeechAlternative {
  transcript: string
  confidence: number
}

interface SpeechResultList {
  0: SpeechAlternative[]
}

interface SpeechRecognitionResultEvent {
  results: SpeechResultList
}

interface SpeechRecognitionErrorEvent {
  error: string
}

interface SpeechRecognitionInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  abort: () => void
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance
}

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function useSpeechRecognition(lang = 'de-DE'): UseSpeechRecognitionReturn {
  const SpeechRecognition = getSpeechRecognition()
  const isSupported = !!SpeechRecognition

  const [status, setStatus] = useState<RecognitionStatus>(isSupported ? 'idle' : 'unsupported')
  const [transcript, setTranscript] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  const start = useCallback(() => {
    if (!SpeechRecognition) return

    recognitionRef.current?.abort()

    const recognition = new SpeechRecognition()
    recognition.lang = lang
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 3

    recognition.onstart = () => {
      setStatus('listening')
      setTranscript('')
      setErrorMessage(null)
    }

    recognition.onresult = (event: SpeechRecognitionResultEvent) => {
      const alternatives = Array.from(event.results[0])
      const best = alternatives.reduce((a, b) => (a.confidence >= b.confidence ? a : b))
      setTranscript(best.transcript.trim())
      setStatus('done')
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const messages: Record<string, string> = {
        'not-allowed': 'Microphone access denied',
        'no-speech': 'No speech detected — try again',
        network: 'Network error',
        'audio-capture': 'No microphone found',
      }
      setErrorMessage(messages[event.error] ?? 'Recognition failed')
      setStatus('error')
    }

    recognition.onend = () => {
      setStatus((prev) => (prev === 'listening' ? 'idle' : prev))
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [SpeechRecognition, lang])

  const reset = useCallback(() => {
    recognitionRef.current?.abort()
    setStatus('idle')
    setTranscript('')
    setErrorMessage(null)
  }, [])

  useEffect(
    () => () => {
      recognitionRef.current?.abort()
    },
    [],
  )

  return { status, transcript, start, reset, isSupported, errorMessage }
}
