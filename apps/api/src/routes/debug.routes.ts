import type { FastifyInstance } from 'fastify'
import { Types } from 'mongoose'
import { authenticate } from '../middleware/authenticate.js'
import { GeneratedSession } from '../models/generated-session.model.js'
import { Lesson } from '../models/lesson.model.js'
import { UserLessonProgress } from '../models/user-lesson-progress.model.js'
import { llmJobQueue } from '../queue/index.js'

export async function debugRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', { preHandler: authenticate }, async (request) => {
    const { userId } = request.user as { userId: string }

    // ── Queue stats ──────────────────────────────────────────────────────────
    const counts = await llmJobQueue.getJobCounts(
      'waiting',
      'active',
      'delayed',
      'completed',
      'failed',
    )

    const [waiting, active, failed] = await Promise.all([
      llmJobQueue.getJobs(['waiting'], 0, 10),
      llmJobQueue.getJobs(['active'], 0, 5),
      llmJobQueue.getJobs(['failed'], 0, 5),
    ])

    // ── Sessions for this user ───────────────────────────────────────────────
    const sessions = await GeneratedSession.find({
      userId: new Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('status topic cefrLevel createdAt exercises')
      .lean()

    // ── Lesson buffer for this user ──────────────────────────────────────────
    const totalLessons = await Lesson.countDocuments({})
    const aiLessons = await Lesson.countDocuments({ isAiGenerated: true })
    const completedLessons = await UserLessonProgress.countDocuments({
      userId: new Types.ObjectId(userId),
      status: 'completed',
    })

    return {
      queue: {
        counts,
        waiting: waiting.map((j) => ({
          id: j.id,
          name: j.name,
          data: j.data,
          addedAt: j.timestamp,
        })),
        active: active.map((j) => ({
          id: j.id,
          name: j.name,
          data: j.data,
          startedAt: j.processedOn,
        })),
        recentFailed: failed.map((j) => ({
          id: j.id,
          name: j.name,
          data: j.data,
          error: j.failedReason,
          failedAt: j.finishedOn,
        })),
      },
      sessions: {
        forCurrentUser: sessions.map((s) => ({
          id: s._id.toString(),
          status: s.status,
          topic: s.topic || '(generating...)',
          exerciseCount: s.exercises?.length ?? 0,
          createdAt: s.createdAt,
        })),
      },
      lessons: {
        total: totalLessons,
        aiGenerated: aiLessons,
        completedByUser: completedLessons,
        remainingForUser: totalLessons - completedLessons,
      },
    }
  })
}
