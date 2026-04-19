import type { FastifyInstance } from 'fastify'
import { Types } from 'mongoose'
import { authenticate } from '../middleware/authenticate.js'
import { GrammarConcept } from '../models/grammar-concept.model.js'
import { Lesson } from '../models/lesson.model.js'
import { SRSCard } from '../models/srs-card.model.js'
import { User } from '../models/user.model.js'
import { UserLessonProgress } from '../models/user-lesson-progress.model.js'
import { getStreakHistory } from '../services/session.service.js'
import { getWeeklyXP } from '../services/xp.service.js'

export async function progressRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const userObjId = new Types.ObjectId(userId)

    const [user, allCards, totalGrammarConcepts, streakHistory, weeklyXpRaw] = await Promise.all([
      User.findById(userId),
      SRSCard.find({ userId: userObjId }),
      GrammarConcept.countDocuments(),
      getStreakHistory(userId),
      getWeeklyXP(userId),
    ])

    if (!user) {
      return reply.status(404).send({ error: 'Not Found', message: 'User not found' })
    }

    const vocabByLevel: Record<string, number> = {}
    let mastered = 0
    let learning = 0
    let newCards = 0

    for (const card of allCards) {
      if (card.status === 'mastered') mastered++
      else if (card.status === 'learning' || card.status === 'review') learning++
      else newCards++
    }

    const completedLessons = await UserLessonProgress.find({
      userId: userObjId,
      status: 'completed',
    }).populate<{ lessonId: { unitId: { cefrLevel: string } } }>({
      path: 'lessonId',
      populate: { path: 'unitId', select: 'cefrLevel' },
    })

    for (const lp of completedLessons) {
      const lesson = await Lesson.findById(lp.lessonId)
      if (!lesson) continue
      const vocabIds = lesson.content.vocabularyItemIds ?? []
      for (const _ of vocabIds) {
        const card = allCards.find((c) => c.vocabularyItemId.toString() === _.toString())
        if (card) {
          const level = 'A1'
          vocabByLevel[level] = (vocabByLevel[level] ?? 0) + 1
        }
      }
    }

    const xpByWeek = weeklyXpRaw.map((xp, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return { week: d.toISOString().split('T')[0], xp }
    })

    return {
      vocabularyStats: {
        total: allCards.length,
        mastered,
        learning,
        new: newCards,
        byLevel: vocabByLevel,
      },
      grammarProgress: {
        conceptsIntroduced: totalGrammarConcepts,
        totalConcepts: totalGrammarConcepts,
      },
      streakHistory,
      totalXp: user.totalXp,
      xpByWeek,
    }
  })
}
