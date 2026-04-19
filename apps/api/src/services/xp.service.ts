import { User } from '../models/user.model.js'

export async function awardXP(userId: string, amount: number): Promise<void> {
  if (amount <= 0) return
  await User.findByIdAndUpdate(userId, { $inc: { totalXp: amount } })
}

export function calculateLessonXP(score: number): number {
  if (score >= 80) return 50
  if (score >= 60) return 25
  return 0
}

export async function getWeeklyXP(userId: string): Promise<number[]> {
  const { DailySession } = await import('../models/daily-session.model.js')
  const { Types } = await import('mongoose')

  const days: number[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]

    const session = await DailySession.findOne({
      userId: new Types.ObjectId(userId),
      sessionDate: dateStr,
    })

    days.push(session?.xpEarned ?? 0)
  }

  return days
}
