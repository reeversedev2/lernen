import type { StageWithProgress } from '@lernen/shared'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, Lock, Star } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { useRoadmap } from '../hooks/use-roadmap'

// ── World config ────────────────────────────────────────────────────────────

const WORLDS = {
  'Das Dorf': {
    label: 'Das Dorf',
    sublabel: 'A1 · The Village',
    emoji: '🏘️',
    gradient: 'from-amber-500/20 to-orange-600/10',
    border: 'border-amber-500/30',
    nodeBg: 'from-amber-500 to-orange-500',
    nodeGlow: 'shadow-amber-500/40',
    textColor: 'text-amber-400',
    bannerBg: 'bg-amber-500/10',
    connectorColor: '#f59e0b',
  },
  'Die Stadt': {
    label: 'Die Stadt',
    sublabel: 'A1.2 · The City',
    emoji: '🏙️',
    gradient: 'from-sky-500/20 to-cyan-600/10',
    border: 'border-sky-500/30',
    nodeBg: 'from-sky-500 to-cyan-500',
    nodeGlow: 'shadow-sky-500/40',
    textColor: 'text-sky-400',
    bannerBg: 'bg-sky-500/10',
    connectorColor: '#0ea5e9',
  },
  'Die Welt': {
    label: 'Die Welt',
    sublabel: 'A2 · The World',
    emoji: '🌍',
    gradient: 'from-violet-500/20 to-purple-600/10',
    border: 'border-violet-500/30',
    nodeBg: 'from-violet-500 to-purple-500',
    nodeGlow: 'shadow-violet-500/40',
    textColor: 'text-violet-400',
    bannerBg: 'bg-violet-500/10',
    connectorColor: '#8b5cf6',
  },
  'Das Leben': {
    label: 'Das Leben',
    sublabel: 'B1 · Real Life',
    emoji: '🗺️',
    gradient: 'from-emerald-500/20 to-green-600/10',
    border: 'border-emerald-500/30',
    nodeBg: 'from-emerald-500 to-green-500',
    nodeGlow: 'shadow-emerald-500/40',
    textColor: 'text-emerald-400',
    bannerBg: 'bg-emerald-500/10',
    connectorColor: '#10b981',
  },
} as const

type WorldName = keyof typeof WORLDS

// Winding path positions — cycle of 4 per world
const PATH_POSITIONS = [
  'justify-start pl-8',
  'justify-center',
  'justify-end pr-8',
  'justify-center',
]

// ── Component ────────────────────────────────────────────────────────────────

export function RoadmapPage() {
  const { data, isLoading } = useRoadmap()
  const currentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (currentRef.current) {
      currentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [])

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={36} className="animate-spin text-amber-400" />
        </div>
      </AppLayout>
    )
  }

  if (!data?.stages.length) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <p className="text-slate-400">Roadmap is being prepared...</p>
        </div>
      </AppLayout>
    )
  }

  // Group stages by world
  const worlds = Object.keys(WORLDS) as WorldName[]
  const stagesByWorld = worlds.map((worldName) => ({
    worldName,
    world: WORLDS[worldName],
    stages: data.stages.filter((s) => s.worldName === worldName),
  }))

  const currentStage = data.stages.find((s) => s.isCurrent)

  return (
    <AppLayout>
      <div className="px-4 pb-24 max-w-md mx-auto">
        {/* Page header */}
        <div className="pt-8 pb-6 text-center">
          <h1 className="text-2xl font-bold text-white">Your Journey</h1>
          <p className="text-slate-400 text-sm mt-1">
            {currentStage ? `Currently on: ${currentStage.theme}` : 'You have mastered all stages!'}
          </p>
        </div>

        {/* Worlds */}
        {stagesByWorld.map(({ worldName, world, stages }, worldIndex) => (
          <div key={worldName}>
            {/* World transition banner */}
            <WorldBanner world={world} worldName={worldName} isFirst={worldIndex === 0} />

            {/* Stage nodes */}
            <div className="py-2">
              {stages.map((stage, stageIndex) => {
                const positionClass = PATH_POSITIONS[stageIndex % PATH_POSITIONS.length]
                const isLast = stageIndex === stages.length - 1
                const isCurrent = stage._id === currentStage?._id

                return (
                  <div key={stage._id} ref={isCurrent ? currentRef : undefined}>
                    <div className={`flex ${positionClass}`}>
                      <StageNode stage={stage} world={world} isCurrent={isCurrent} />
                    </div>
                    {/* Connector */}
                    {!isLast && (
                      <Connector
                        fromPos={positionClass}
                        toPos={PATH_POSITIONS[(stageIndex + 1) % PATH_POSITIONS.length]}
                        color={stage.isUnlocked ? world.connectorColor : '#334155'}
                        dashed={!stage.isUnlocked}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* End banner */}
        <div className="mt-8 py-8 text-center border-t border-slate-800">
          <p className="text-3xl mb-2">🎉</p>
          <p className="text-white font-semibold">Fließend Deutsch</p>
          <p className="text-slate-500 text-sm">Complete all 24 stages to reach fluency</p>
        </div>
      </div>
    </AppLayout>
  )
}

// ── World Banner ─────────────────────────────────────────────────────────────

function WorldBanner({
  world,
  worldName,
  isFirst,
}: {
  world: (typeof WORLDS)[WorldName]
  worldName: WorldName
  isFirst: boolean
}) {
  return (
    <div className={`relative my-6 ${isFirst ? 'mt-0' : ''}`}>
      {/* Horizontal rule with world label */}
      <div className="flex items-center gap-4">
        <div className={`flex-1 h-px bg-gradient-to-r ${world.gradient} opacity-60`} />
        <div
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border ${world.border} ${world.bannerBg}`}
        >
          <span className="text-2xl">{world.emoji}</span>
          <div>
            <p className={`text-sm font-bold ${world.textColor}`}>{worldName}</p>
            <p className="text-xs text-slate-500">{world.sublabel}</p>
          </div>
        </div>
        <div className={`flex-1 h-px bg-gradient-to-l ${world.gradient} opacity-60`} />
      </div>
    </div>
  )
}

// ── Stage Node ───────────────────────────────────────────────────────────────

function StageNode({
  stage,
  world,
  isCurrent,
}: {
  stage: StageWithProgress
  world: (typeof WORLDS)[WorldName]
  isCurrent: boolean
}) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (stage.isUnlocked) {
      navigate({ to: '/stages/$stageId', params: { stageId: stage._id } })
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!stage.isUnlocked}
      className={`relative flex flex-col items-center gap-2 group ${stage.isUnlocked ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {/* Current stage label */}
      {isCurrent && (
        <div
          className={`px-3 py-1 rounded-full text-xs font-bold ${world.textColor} bg-current/10 border border-current/20 animate-bounce`}
          style={{
            backgroundColor: `${world.connectorColor}15`,
            borderColor: `${world.connectorColor}30`,
            color: world.connectorColor,
          }}
        >
          → HERE
        </div>
      )}

      {/* Hex node */}
      <div className="relative">
        {/* Glow ring for current */}
        {isCurrent && (
          <div
            className={`absolute inset-0 rounded-full blur-lg opacity-60 animate-pulse scale-125`}
            style={{ background: world.connectorColor }}
          />
        )}

        <div
          className={`
            relative w-20 h-20 flex items-center justify-center text-3xl
            transition-all duration-200
            ${
              stage.isUnlocked
                ? `bg-gradient-to-br ${world.nodeBg} shadow-lg ${world.nodeGlow} group-hover:scale-110 group-hover:shadow-xl`
                : 'bg-slate-800 opacity-50'
            }
          `}
          style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
        >
          {stage.isUnlocked ? (
            <span>{stage.emoji}</span>
          ) : (
            <Lock size={22} className="text-slate-500" />
          )}
        </div>

        {/* Star badge */}
        {stage.stars > 0 && (
          <div className="absolute -bottom-1 -right-1 flex">
            <StarBadge count={stage.stars} color={world.connectorColor} />
          </div>
        )}

        {/* Mastered check */}
        {stage.stars === 3 && (
          <div
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: world.connectorColor, color: '#0f172a' }}
          >
            ✓
          </div>
        )}
      </div>

      {/* Label */}
      <div className="text-center w-28">
        <p
          className={`text-xs font-semibold leading-tight ${stage.isUnlocked ? 'text-white' : 'text-slate-600'}`}
        >
          {stage.theme}
        </p>
        {stage.isUnlocked && stage.exerciseSetsAvailable > 0 && !isCurrent && (
          <p className="text-xs mt-0.5" style={{ color: world.connectorColor }}>
            {stage.exerciseSetsAvailable} ready
          </p>
        )}
      </div>
    </button>
  )
}

// ── Star Badge ────────────────────────────────────────────────────────────────

function StarBadge({ count, color }: { count: number; color: string }) {
  return (
    <div
      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold"
      style={{ background: color, color: '#0f172a' }}
    >
      <Star size={9} fill="currentColor" />
      <span>{count}</span>
    </div>
  )
}

// ── Connector ─────────────────────────────────────────────────────────────────

function Connector({
  fromPos,
  toPos,
  color,
  dashed,
}: {
  fromPos: string
  toPos: string
  color: string
  dashed: boolean
}) {
  // Determine x alignment from/to
  const getAlign = (pos: string) => {
    if (pos.includes('justify-start')) return 'left'
    if (pos.includes('justify-end')) return 'right'
    return 'center'
  }
  const from = getAlign(fromPos)
  const to = getAlign(toPos)

  // Build a simple curved connector using an SVG
  const width = 320
  const height = 56
  const xMap = { left: 56, center: 160, right: 264 }
  const x1 = xMap[from]
  const x2 = xMap[to]
  const y1 = 4
  const y2 = height - 4

  const d = `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`

  return (
    <div className="flex justify-center pointer-events-none -my-1">
      {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative connector line between roadmap nodes */}
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
        <path
          d={d}
          stroke={color}
          strokeWidth={dashed ? 2 : 3}
          strokeDasharray={dashed ? '6 4' : undefined}
          strokeLinecap="round"
          opacity={dashed ? 0.3 : 0.7}
        />
        {/* Arrow head */}
        {!dashed && <circle cx={x2} cy={y2} r={4} fill={color} opacity={0.7} />}
      </svg>
    </div>
  )
}
