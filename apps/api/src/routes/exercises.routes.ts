import { checkAnswer } from '@lernen/shared'
import type { FastifyInstance } from 'fastify'
import { Types } from 'mongoose'
import { Ollama } from 'ollama'
import { config } from '../config/index.js'
import { authenticate } from '../middleware/authenticate.js'
import { ExerciseAttempt } from '../models/exercise-attempt.model.js'
import { GeneratedSession } from '../models/generated-session.model.js'
import { enqueueSessionGeneration } from '../queue/index.js'
import { getTranslationFeedback } from '../services/languageTool.service.js'
import { generateExercises } from '../services/llm.service.js'
import { updateSessionAfterLesson } from '../services/session.service.js'
import { awardXP, calculateLessonXP } from '../services/xp.service.js'

const ollama = new Ollama({ host: config.OLLAMA_URL })

function serializeSession(session: InstanceType<typeof GeneratedSession>) {
  return {
    _id: session._id.toString(),
    userId: session.userId.toString(),
    topic: session.topic,
    cefrLevel: session.cefrLevel,
    exercises: session.exercises,
    status: session.status,
    createdAt: (session.createdAt as Date).toISOString(),
  }
}

export async function exercisesRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/exercises/status — auth optional, returns ollama + session readiness
  fastify.get('/status', { preHandler: authenticate }, async (request, _reply) => {
    const { userId } = request.user as { userId: string }

    let ollamaStatus: 'ready' | 'downloading' | 'unavailable' = 'unavailable'
    try {
      const { models } = await ollama.list()
      ollamaStatus = models.some((m) => m.name.startsWith(config.OLLAMA_MODEL.split(':')[0]))
        ? 'ready'
        : 'downloading'
    } catch {
      ollamaStatus = 'unavailable'
    }

    const session = await GeneratedSession.findOne({
      userId: new Types.ObjectId(userId),
      status: { $in: ['generating', 'pending'] },
    }).select('status')

    const sessionStatus = session?.status ?? 'none'

    return { ollamaStatus, sessionStatus, model: config.OLLAMA_MODEL }
  })

  // POST /api/exercises/generate
  // Returns the pre-generated session if ready, otherwise generates synchronously (fallback)
  fastify.post('/generate', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request.user as { userId: string }

    // Serve pre-generated session instantly if available
    const ready = await GeneratedSession.findOne({
      userId: new Types.ObjectId(userId),
      status: 'pending',
    })
    if (ready) {
      // Kick off the next session generation in the background straight away
      enqueueSessionGeneration(userId).catch(() => {})
      return { session: serializeSession(ready) }
    }

    // Fallback: generate synchronously (happens on first ever use or if background job failed)
    try {
      const { topic, cefrLevel, exercises } = await generateExercises(userId)
      const session = await GeneratedSession.create({
        userId: new Types.ObjectId(userId),
        topic,
        cefrLevel,
        exercises,
        status: 'pending',
      })
      enqueueSessionGeneration(userId).catch(() => {})
      return { session: serializeSession(session) }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate exercises'
      fastify.log.error(error)
      return reply.status(502).send({ error: 'Generation Failed', message })
    }
  })

  // POST /api/exercises/:sessionId/complete
  // Scores and completes an AI practice session
  fastify.post('/:sessionId/complete', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { sessionId } = request.params as { sessionId: string }

    const body = request.body as {
      answers: Array<{ exerciseId: string; answer: string; timeSpentMs: number }>
    }

    if (!Array.isArray(body?.answers)) {
      return reply
        .status(400)
        .send({ error: 'Validation Error', message: 'answers array is required' })
    }

    const session = await GeneratedSession.findOne({
      _id: new Types.ObjectId(sessionId),
      userId: new Types.ObjectId(userId),
    })

    if (!session) {
      return reply.status(404).send({ error: 'Not Found', message: 'Session not found' })
    }

    if (session.status === 'completed') {
      return reply.status(400).send({ error: 'Bad Request', message: 'Session already completed' })
    }

    const answerMap = new Map(body.answers.map((a) => [a.exerciseId, a]))
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

    for (const exercise of session.exercises) {
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
        userId: new Types.ObjectId(userId),
        lessonId: session._id,
        exerciseId: exercise.id,
        exerciseType: exercise.type,
        userAnswer: submission.answer,
        correctAnswer: exercise.answer,
        isCorrect,
        timeSpentMs: submission.timeSpentMs,
      })
    }

    if (attempts.length > 0) {
      await ExerciseAttempt.insertMany(attempts)
    }

    const totalExercises = session.exercises.length
    const score = totalExercises > 0 ? Math.round((correctCount / totalExercises) * 100) : 0
    const xpEarned = calculateLessonXP(score)
    const _totalSeconds = body.answers.reduce((sum, a) => sum + Math.round(a.timeSpentMs / 1000), 0)

    session.status = 'completed'
    session.score = score
    session.xpEarned = xpEarned
    await session.save()

    await awardXP(userId, xpEarned)
    await updateSessionAfterLesson(userId, xpEarned, totalExercises)

    return { score, xpEarned, correctAnswers: correctCount, totalExercises, results }
  })
}
