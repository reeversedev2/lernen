import { SRSReviewSchema } from '@lernen/shared'
import type { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/authenticate.js'
import { getOrCreateTodaySession, updateSessionAfterReview } from '../services/session.service.js'
import {
  ensureSRSCardsForUser,
  getDueCards,
  getSRSStats,
  submitReview,
} from '../services/srs.service.js'
import { awardXP } from '../services/xp.service.js'

export async function srsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/due', { preHandler: authenticate }, async (request, _reply) => {
    const { userId } = request.user as { userId: string }
    const query = request.query as { limit?: string }
    const limit = Math.min(parseInt(query.limit ?? '20', 10), 50)

    await ensureSRSCardsForUser(userId)
    await getOrCreateTodaySession(userId)

    const cards = await getDueCards(userId, limit)

    return cards.map((card) => {
      const vocabItem = card.vocabularyItemId as unknown as Record<string, unknown>
      return {
        _id: card._id.toString(),
        userId: card.userId.toString(),
        vocabularyItemId:
          typeof vocabItem === 'object' && vocabItem._id
            ? vocabItem._id.toString()
            : card.vocabularyItemId.toString(),
        vocabularyItem:
          typeof vocabItem === 'object' && vocabItem._id
            ? {
                _id: (vocabItem._id as object).toString(),
                german: vocabItem.german,
                article: vocabItem.article,
                wordType: vocabItem.wordType,
                english: vocabItem.english,
                exampleGerman: vocabItem.exampleGerman,
                exampleEnglish: vocabItem.exampleEnglish,
                pluralForm: vocabItem.pluralForm,
                verbForms: vocabItem.verbForms,
                tags: vocabItem.tags,
                cefrLevel: vocabItem.cefrLevel,
                unitId: (vocabItem.unitId as object).toString(),
              }
            : null,
        intervalDays: card.intervalDays,
        easeFactor: card.easeFactor,
        repetitionCount: card.repetitionCount,
        dueDate: card.dueDate.toISOString(),
        status: card.status,
        lastReviewedAt: card.lastReviewedAt?.toISOString() ?? null,
        lastRating: card.lastRating,
      }
    })
  })

  fastify.post('/review', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const parsed = SRSReviewSchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: parsed.error.errors[0]?.message ?? 'Invalid input',
      })
    }

    const { card, xpEarned, newStatus } = await submitReview(
      userId,
      parsed.data.cardId,
      parsed.data.rating,
    )

    await Promise.all([awardXP(userId, xpEarned), updateSessionAfterReview(userId, xpEarned)])

    return {
      card: {
        _id: card._id.toString(),
        intervalDays: card.intervalDays,
        easeFactor: card.easeFactor,
        repetitionCount: card.repetitionCount,
        dueDate: card.dueDate.toISOString(),
        status: card.status,
        lastReviewedAt: card.lastReviewedAt?.toISOString() ?? null,
        lastRating: card.lastRating,
      },
      xpEarned,
      newStatus,
    }
  })

  fastify.get('/stats', { preHandler: authenticate }, async (request) => {
    const { userId } = request.user as { userId: string }
    return getSRSStats(userId)
  })
}
