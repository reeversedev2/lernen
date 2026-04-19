import { cn } from '../lib/utils'

interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  color?: 'amber' | 'emerald' | 'blue' | 'slate'
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

export function ProgressBar({
  value,
  max = 100,
  className,
  color = 'amber',
  showLabel = false,
  size = 'md',
  animated = false,
}: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100))

  const colorClasses = {
    amber: 'bg-amber-400',
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    slate: 'bg-slate-500',
  }

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('w-full bg-slate-800 rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700 ease-out',
            colorClasses[color],
            animated && 'animate-pulse',
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1 text-xs text-slate-400">
          <span>{value}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  )
}
