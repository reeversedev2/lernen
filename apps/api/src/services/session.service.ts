import { Types } from 'mongoose'
import { DailySession, type IDailySession } from '../models/daily-session.model.js'
import { User } from '../models/user.model.js'

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]
}

export async function getOrCreateTodaySession(userId: string): Promise<IDailySession> {
  const today = getTodayDateString()
  const userObjId = new Types.ObjectId(userId)

  let session = await DailySession.findOne({ userId: userObjId, sessionDate: today })
  if (!session) {
    session = await DailySession.create({
      userId: userObjId,
      sessionDate: today,
      startedAt: new Date(),
    })
  }

  return session
}

export async function updateSessionAfterReview(userId: string, xpEarned: number): Promise<void> {
  const today = getTodayDateString()
  const userObjId = new Types.ObjectId(userId)

  await DailySession.findOneAndUpdate(
    { userId: userObjId, sessionDate: today },
    {
      $inc: {
        srsCardsReviewed: 1,
        xpEarned: xpEarned,
      },
      $setOnInsert: { startedAt: new Date() },
    },
    { upsert: true, new: true },
  )

  await recalculateAndUpdateStreak(userId)
}

export async function updateSessionAfterLesson(
  userId: string,
  xpEarned: number,
  exerciseCount: number,
  _timeSpentSeconds?: number,
): Promise<void> {
  const today = getTodayDateString()
  const userObjId = new Types.ObjectId(userId)

  await DailySession.findOneAndUpdate(
    { userId: userObjId, sessionDate: today },
    {
      $inc: {
        exercisesCompleted: exerciseCount,
        xpEarned: xpEarned,
      },
      $setOnInsert: { startedAt: new Date() },
    },
    { upsert: true, new: true },
  )

  await recalculateAndUpdateStreak(userId)
}

async function recalculateAndUpdateStreak(userId: string): Promise<void> {
  const today = getTodayDateString()
  const userObjId = new Types.ObjectId(userId)

  const session = await DailySession.findOne({ userId: userObjId, sessionDate: today })
  if (!session) return

  const qualifies =
    session.totalMinutes >= 15 || session.srsCardsReviewed >= 10 || session.exercisesCompleted >= 1

  if (qualifies !== session.qualifiesForStreak) {
    session.qualifiesForStreak = qualifies
    await session.save()
  }

  if (!qualifies) return

  const user = await User.findById(userId)
  if (!user) return

  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)

  const lastActivity = user.streakLastActivityDate ? new Date(user.streakLastActivityDate) : null

  if (lastActivity) {
    lastActivity.setHours(0, 0, 0, 0)
    const diffDays = Math.round(
      (todayDate.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24),
    )

    if (diffDays === 0) {
      // Already counted today
      return
    } else if (diffDays === 1) {
      user.streakCount += 1
    } else {
      // Gap of 2+ days
      if (user.streakFreezeCount > 0) {
        user.streakFreezeCount -= 1
        user.streakCount += 1
      } else {
        user.streakCount = 1
      }
    }
  } else {
    user.streakCount = 1
  }

  user.streakLastActivityDate = new Date()
  await user.save()
}

export async function getTodaySessionSummary(userId: string) {
  const today = getTodayDateString()
  const session = await DailySession.findOne({
    userId: new Types.ObjectId(userId),
    sessionDate: today,
  })

  if (!session) return null

  return {
    totalMinutes: session.totalMinutes,
    xpEarned: session.xpEarned,
    srsCardsReviewed: session.srsCardsReviewed,
    exercisesCompleted: session.exercisesCompleted,
    qualifiesForStreak: session.qualifiesForStreak,
  }
}

export async function getStreakHistory(userId: string, days = 30) {
  const userObjId = new Types.ObjectId(userId)
  const sessions = await DailySession.find({ userId: userObjId })
    .sort({ sessionDate: -1 })
    .limit(days)

  return sessions.map((s) => ({
    date: s.sessionDate,
    qualified: s.qualifiesForStreak,
  }))
}
