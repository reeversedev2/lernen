import { useEffect, useState } from 'react'

const FACTS = [
  {
    german: 'Drachenfutter',
    literal: '"Dragon food"',
    meaning:
      'A gift you give your partner to make up for something — because you are basically feeding the dragon.',
  },
  {
    german: 'Verschlimmbessern',
    literal: '"To worsen-improve"',
    meaning: 'Making something worse while genuinely trying to fix it. We have all been there.',
  },
  {
    german: 'Fingerspitzengefühl',
    literal: '"Fingertip feeling"',
    meaning:
      'Having a delicate touch or intuition for a situation. Literally feeling things with your fingertips.',
  },
  {
    german: 'Torschlusspanik',
    literal: '"Gate-closing panic"',
    meaning:
      'The anxiety that time is running out — like a city gate closing before you get through. A medieval FOMO.',
  },
  {
    german: 'Weltschmerz',
    literal: '"World pain"',
    meaning:
      'The sadness you feel when reality does not live up to how you wish the world could be.',
  },
  {
    german: 'Gemütlichkeit',
    literal: '"Cosiness"',
    meaning:
      'A warm, welcoming, comfortable feeling — think a fireplace, good friends, and hot Glühwein.',
  },
  {
    german: 'Schadenfreude',
    literal: '"Damage joy"',
    meaning:
      "Taking pleasure in someone else's misfortune. So universal it was borrowed directly into English.",
  },
  {
    german: 'Backpfeifengesicht',
    literal: '"Slap face"',
    meaning: 'A face that desperately needs a slap. Germans do not hold back.',
  },
  {
    german: 'Kabelsalat',
    literal: '"Cable salad"',
    meaning: 'That tangled mess of cables behind your TV. Someone in Germany named it perfectly.',
  },
  {
    german: 'Erklärungsnot',
    literal: '"Explanation emergency"',
    meaning:
      'When you are scrambling to explain yourself after being caught doing something you probably should not have.',
  },
]

interface LessonBrewingCardProps {
  onLessonReady: () => void
}

export function LessonBrewingCard({ onLessonReady }: LessonBrewingCardProps) {
  const [factIndex, setFactIndex] = useState(() => Math.floor(Math.random() * FACTS.length))
  const [visible, setVisible] = useState(true)
  const [dots, setDots] = useState('.')

  // Rotate facts every 6 seconds with a fade transition
  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setFactIndex((i) => (i + 1) % FACTS.length)
        setVisible(true)
      }, 400)
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  // Animate the dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '.' : `${d}.`))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Poll for a new lesson every 12 seconds
  useEffect(() => {
    const interval = setInterval(onLessonReady, 12000)
    return () => clearInterval(interval)
  }, [onLessonReady])

  const fact = FACTS[factIndex]

  return (
    <div className="rounded-2xl border border-amber-400/20 bg-linear-to-br from-amber-400/10 to-amber-500/5 p-6 overflow-hidden">
      <div className="flex items-start gap-4">
        {/* Pulsing icon */}
        <div className="relative shrink-0 mt-1">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center text-xl animate-pulse">
            ✨
          </div>
          <span className="absolute -bottom-1 -right-1 text-xs">🇩🇪</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-base">
            Dein nächster Kurs wird vorbereitet{dots}
          </p>
          <p className="text-slate-400 text-sm mt-0.5">
            Your AI tutor is crafting a personalised lesson
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-amber-400/10" />
        <span className="text-xs text-amber-400/60 font-medium tracking-widest uppercase">
          Wusstest du?
        </span>
        <div className="flex-1 h-px bg-amber-400/10" />
      </div>

      {/* Rotating fact */}
      <div
        className="transition-all duration-400"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(6px)',
        }}
      >
        <p className="text-2xl font-bold text-amber-300 mb-1">{fact.german}</p>
        <p className="text-slate-500 text-sm italic mb-2">{fact.literal}</p>
        <p className="text-slate-300 text-sm leading-relaxed">{fact.meaning}</p>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 mt-5">
        {FACTS.map((fact, i) => (
          <div
            key={fact.german}
            className="rounded-full transition-all duration-400"
            style={{
              width: i === factIndex ? '16px' : '6px',
              height: '6px',
              background: i === factIndex ? 'rgb(251 191 36)' : 'rgb(51 65 85)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
