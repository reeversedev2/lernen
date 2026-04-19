import { useCallback, useEffect, useRef } from 'react'

function getGermanVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices()
  // Prefer a native German voice, fall back to any de-DE
  return (
    voices.find((v) => v.lang === 'de-DE' && !v.name.includes('Google')) ??
    voices.find((v) => v.lang.startsWith('de')) ??
    null
  )
}

export function useTTS() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Voices load asynchronously on some browsers — pre-warm
  useEffect(() => {
    if (typeof speechSynthesis === 'undefined') return
    speechSynthesis.getVoices()
    const handleVoicesChanged = () => speechSynthesis.getVoices()
    speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged)
    return () => speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged)
  }, [])

  const speak = useCallback((text: string, lang: 'de-DE' | 'en-US' = 'de-DE') => {
    if (typeof speechSynthesis === 'undefined') return
    speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = 0.85 // slightly slower — better for language learning
    utterance.pitch = 1

    if (lang === 'de-DE') {
      const voice = getGermanVoice()
      if (voice) utterance.voice = voice
    }

    utteranceRef.current = utterance
    speechSynthesis.speak(utterance)
  }, [])

  const cancel = useCallback(() => {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
  }, [])

  // Cancel on unmount
  useEffect(
    () => () => {
      cancel()
    },
    [cancel],
  )

  return { speak, cancel }
}
