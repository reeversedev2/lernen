import type { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/authenticate.js'
import { User } from '../models/user.model.js'
import { getNextLesson } from '../services/curriculum.service.js'
import { getTodaySessionSummary } from '../services/session.service.js'
import { getSRSStats } from '../services/srs.service.js'
import { getWeeklyXP } from '../services/xp.service.js'

export async function dashboardRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request.user as { userId: string }

    const [user, todaySession, srsStats, nextLesson, weeklyXp] = await Promise.all([
      User.findById(userId),
      getTodaySessionSummary(userId),
      getSRSStats(userId),
      getNextLesson(userId),
      getWeeklyXP(userId),
    ])

    if (!user) {
      return reply.status(404).send({ error: 'Not Found', message: 'User not found' })
    }

    return {
      user: {
        _id: user._id.toString(),
        email: user.email,
        displayName: user.displayName,
        totalXp: user.totalXp,
        streakCount: user.streakCount,
        streakLastActivityDate: user.streakLastActivityDate?.toISOString() ?? null,
        streakFreezeCount: user.streakFreezeCount,
        currentUnitIndex: user.currentUnitIndex,
        dailyGoalMinutes: user.dailyGoalMinutes,
        createdAt: user.createdAt.toISOString(),
      },
      todaySession,
      streak: {
        current: user.streakCount,
        freezesLeft: user.streakFreezeCount,
      },
      dueCardCount: srsStats.dueToday,
      nextLesson: nextLesson
        ? {
            _id: nextLesson._id.toString(),
            stageId: nextLesson.stageId?.toString() ?? null,
            type: nextLesson.type,
            title: nextLesson.title,
            orderInUnit: nextLesson.orderInUnit,
            estimatedMinutes: nextLesson.estimatedMinutes,
            content: nextLesson.content,
          }
        : null,
      weeklyXp,
    }
  })
}
