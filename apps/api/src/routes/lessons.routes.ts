import { checkAnswer, LessonCompleteSchema } from '@lernen/shared'
import type { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/authenticate.js'
import { ExerciseAttempt } from '../models/exercise-attempt.model.js'
import {
  completeLesson,
  getLessonById,
  getNextLesson,
  startLesson,
} from '../services/curriculum.service.js'
import { getTranslationFeedback } from '../services/languageTool.service.js'
import { getOrCreateTodaySession, updateSessionAfterLesson } from '../services/session.service.js'
import { awardXP, calculateLessonXP } from '../services/xp.service.js'

export async function lessonRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/next', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const lesson = await getNextLesson(userId)
    if (!lesson) {
      return reply.status(404).send({ error: 'Not Found', message: 'No more lessons available' })
    }
    return serializeLesson(lesson)
  })

  fastify.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const lesson = await getLessonById(id)
    if (!lesson) {
      return reply.status(404).send({ error: 'Not Found', message: 'Lesson not found' })
    }
    return serializeLesson(lesson)
  })

  fastify.post('/:id/start', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }

    const lesson = await getLessonById(id)
    if (!lesson) {
      return reply.status(404).send({ error: 'Not Found', message: 'Lesson not found' })
    }

    await getOrCreateTodaySession(userId)
    await startLesson(userId, id)

    return { success: true }
  })

  fastify.post('/:id/complete', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { id } = request.params as { id: string }

    const parsed = LessonCompleteSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: parsed.error.errors[0]?.message ?? 'Invalid input',
      })
    }

    const lesson = await getLessonById(id)
    if (!lesson) {
      return reply.status(404).send({ error: 'Not Found', message: 'Lesson not found' })
    }

    const exercises = lesson.content.exercises
    const answerMap = new Map(parsed.data.answers.map((a) => [a.exerciseId, a]))

    let correctCount = 0
    const results: Array<{
      exerciseId: string
      isCorrect: boolean
      isTypo: boolean
      correctAnswer: string
      wrongFeedback?: string
      correctFeedback?: string
      grammarNote?: string
      explanation?: string
    }> = []

    const attempts = []
    const isTranslation = (t: string) => t === 'translate_de_en' || t === 'translate_en_de'

    for (const exercise of exercises) {
      const submission = answerMap.get(exercise.id)
      if (!submission) continue

      const { isCorrect, isTypo } = checkAnswer(
        exercise.type,
        submission.answer,
        exercise.answer,
        exercise.acceptedAnswers,
      )

      if (isCorrect) correctCount++

      let grammarNote: string | undefined
      if (!isCorrect && isTranslation(exercise.type)) {
        const targetLang = exercise.type === 'translate_en_de' ? 'de-DE' : 'en-US'
        grammarNote = (await getTranslationFeedback(submission.answer, targetLang)) ?? undefined
      }

      results.push({
        exerciseId: exercise.id,
        isCorrect,
        isTypo,
        correctAnswer: exercise.answer,
        wrongFeedback: exercise.wrongFeedback,
        correctFeedback: exercise.correctFeedback,
        grammarNote,
        explanation: exercise.explanation,
      })

      attempts.push({
        userId,
        lessonId: id,
        exerciseId: exercise.id,
        exerciseType: exercise.type,
        grammarConceptId: exercise.grammarConceptId,
        vocabularyItemId: exercise.vocabularyItemId,
        userAnswer: submission.answer,
        correctAnswer: exercise.answer,
        isCorrect,
        timeSpentMs: submission.timeSpentMs,
      })
    }

    if (attempts.length > 0) {
      await ExerciseAttempt.insertMany(attempts)
    }

    const totalExercises = exercises.length
    const score = totalExercises > 0 ? Math.round((correctCount / totalExercises) * 100) : 0
    const xpEarned = calculateLessonXP(score)

    const totalSeconds = parsed.data.answers.reduce(
      (sum, a) => sum + Math.round(a.timeSpentMs / 1000),
      0,
    )

    await completeLesson(userId, id, score, totalSeconds)
    await awardXP(userId, xpEarned)
    await updateSessionAfterLesson(userId, xpEarned, totalExercises)

    // Stage pool is topped up reactively by the queue on completion

    return {
      score,
      xpEarned,
      correctAnswers: correctCount,
      totalExercises,
      results,
    }
  })
}

function serializeLesson(lesson: Awaited<ReturnType<typeof getLessonById>>) {
  if (!lesson) return null
  return {
    _id: lesson._id.toString(),
    stageId: lesson.stageId?.toString() ?? null,
    type: lesson.type,
    title: lesson.title,
    orderInUnit: lesson.orderInUnit,
    estimatedMinutes: lesson.estimatedMinutes,
    content: lesson.content,
  }
}
