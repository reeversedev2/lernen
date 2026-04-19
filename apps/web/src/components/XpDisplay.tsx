import { useQuery } from '@tanstack/react-query'
import { Zap } from 'lucide-react'
import type { DashboardResponse } from '../../../../packages/shared/src/types'
import { api } from '../lib/api'
import { cn, formatXP, getXPLevel } from '../lib/utils'
import { ProgressBar } from './ProgressBar'

interface XpDisplayProps {
  size?: 'sm' | 'md' | 'lg'
  showBar?: boolean
  className?: string
}

export function XpDisplay({ size = 'md', showBar = false, className }: XpDisplayProps) {
  // enabled: false — never fetches on its own, but subscribes to cache updates
  // so setQueryData calls (e.g. after completing exercises) update this instantly
  const { data: dashboardData } = useQuery<DashboardResponse>({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardResponse>('/dashboard').then((r) => r.data),
    enabled: false,
  })

  if (!dashboardData?.user) {
    return null
  }

  const { totalXp } = dashboardData.user

  const { level, currentXp, requiredXp, progress } = getXPLevel(totalXp)

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center gap-1.5">
        <Zap
          size={size === 'sm' ? 14 : size === 'md' ? 18 : 24}
          className="text-amber-400"
          fill="currentColor"
        />
        <span
          className={cn(
            'font-semibold text-amber-400',
            size === 'sm' && 'text-sm',
            size === 'md' && 'text-base',
            size === 'lg' && 'text-xl',
          )}
        >
          {formatXP(totalXp)} XP
        </span>
        <span
          className={cn(
            'text-slate-400',
            size === 'sm' && 'text-xs',
            size === 'md' && 'text-sm',
            size === 'lg' && 'text-base',
          )}
        >
          · Lv. {level}
        </span>
      </div>
      {showBar && (
        <div className="mt-1.5">
          <ProgressBar value={progress} max={100} color="amber" size="sm" />
          <p className="text-xs text-slate-500 mt-0.5">
            {currentXp} / {requiredXp} XP to level {level + 1}
          </p>
        </div>
      )}
    </div>
  )
}
