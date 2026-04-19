import { Flame } from 'lucide-react'
import { cn } from '../lib/utils'

interface StreakDisplayProps {
  count: number
  freezesLeft?: number
  size?: 'sm' | 'md' | 'lg'
  showMessage?: boolean
  className?: string
}

export function StreakDisplay({
  count,
  freezesLeft,
  size = 'md',
  showMessage = false,
  className,
}: StreakDisplayProps) {
  const sizeConfig = {
    sm: { icon: 16, text: 'text-lg font-bold', container: 'gap-1' },
    md: { icon: 24, text: 'text-2xl font-bold', container: 'gap-2' },
    lg: { icon: 36, text: 'text-4xl font-bold', container: 'gap-2' },
  }

  const config = sizeConfig[size]
  const isActive = count > 0

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className={cn('flex items-center', config.container)}>
        <Flame
          size={config.icon}
          className={cn(
            'transition-colors',
            isActive
              ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
              : 'text-slate-600',
          )}
          fill={isActive ? 'currentColor' : 'none'}
        />
        <span className={cn(config.text, isActive ? 'text-amber-400' : 'text-slate-500')}>
          {count}
        </span>
      </div>
      {showMessage && (
        <p className="text-xs text-slate-400 mt-1">
          {count === 0 ? 'Start your streak!' : count < 7 ? 'Keep it up!' : "Don't break it!"}
        </p>
      )}
      {freezesLeft !== undefined && freezesLeft > 0 && (
        <p className="text-xs text-slate-500 mt-1">
          {freezesLeft} freeze{freezesLeft !== 1 ? 's' : ''} left
        </p>
      )}
    </div>
  )
}
