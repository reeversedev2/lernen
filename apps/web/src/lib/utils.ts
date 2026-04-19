import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 10) return 'Guten Morgen'
  if (hour < 18) return 'Guten Tag'
  return 'Guten Abend'
}

export function formatXP(xp: number): string {
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}k`
  return xp.toString()
}

export function getXPLevel(totalXp: number): {
  level: number
  currentXp: number
  requiredXp: number
  progress: number
} {
  // Each level requires 200 more XP than the last: level 1 = 100, level 2 = 300, etc.
  let level = 1
  let xpForCurrentLevel = 0
  let xpForNextLevel = 200

  while (totalXp >= xpForNextLevel) {
    xpForCurrentLevel = xpForNextLevel
    level++
    xpForNextLevel += level * 200
  }

  const currentXp = totalXp - xpForCurrentLevel
  const requiredXp = xpForNextLevel - xpForCurrentLevel
  const progress = Math.round((currentXp / requiredXp) * 100)

  return { level, currentXp, requiredXp, progress }
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
// hmr-test Sun Apr  5 10:54:02 CEST 2026
