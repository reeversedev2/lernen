import { checkAnswer, type ExerciseDifficulty } from '@lernen/shared'
import type { FastifyInstance } from 'fastify'
import { Types } from 'mongoose'
import { authenticate } from '../middleware/authenticate.js'
import { ExerciseAttempt } from '../models/exercise-attempt.model.js'
import { ExerciseSet } from '../models/exercise-set.model.js'
import { Lesson } from '../models/lesson.model.js'
import { Stage } from '../models/stage.model.js'
import { UserExerciseHistory } from '../models/user-exercise-history.model.js'
import { UserLessonProgress } from '../models/user-lesson-progress.model.js'
import { UserStageProgress } from '../models/user-stage-progress.model.js'
import { topUpStagePool } from '../queue/index.js'
import { getTranslationFeedback } from '../services/languageTool.service.js'
import { updateSessionAfterLesson } from '../services/session.service.js'
import { awardXP, calculateLessonXP } from '../services/xp.service.js'

const PASS_THRESHOLD = 60 // score >= 60% counts as a pass

function getDifficulty(stars: number): ExerciseDifficulty {
  if (stars >= 2) return 'hard'
  if (stars >= 1) return 'medium'
  return 'easy'
}

function calcStars(passCount: number): 0 | 1 | 2 | 3 {
  return Math.min(3, passCount) as 0 | 1 | 2 | 3
}

// ── GET /api/stages ─────────────────────────────────────────────────────────

export async function stagesRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/', { preHandler: authenticate }, async (request) => {
    const { userId } = request.user as { userId: string }
    const userObjId = new Types.ObjectId(userId)

    const [stages, progressRecords] = await Promise.all([
      Stage.find({}).sort({ order: 1 }).lean(),
      UserStageProgress.find({ userId: userObjId }).lean(),
    ])

    const progressMap = new Map(progressRecords.map((p) => [p.stageId.toString(), p]))

    // Build a map of stageId → lesson stats
    const stageLessonCounts = await Lesson.aggregate([
      { $match: { stageId: { $exists: true, $ne: null } } },
      { $group: { _id: '$stageId', total: { $sum: 1 } } },
    ])
    const totalLessonsMap = new Map(
      stageLessonCounts.map((r) => [r._id.toString(), r.total as number]),
    )

    const completedLessonsAgg = await UserLessonProgress.aggregate([
      {
        $match: {
          userId: userObjId,
          status: 'completed',
          lessonId: {
            $in: (
              await Lesson.find({ stageId: { $exists: true } })
                .select('_id')
                .lean()
            ).map((l) => l._id),
          },
        },
      },
      {
        $lookup: { from: 'lessons', localField: 'lessonId', foreignField: '_id', as: 'lesson' },
      },
      { $unwind: '$lesson' },
      { $group: { _id: '$lesson.stageId', completed: { $sum: 1 } } },
    ])
    const completedLessonsMap = new Map(
      completedLessonsAgg.map((r) => [r._id?.toString(), r.completed as number]),
    )

    // Unseen exercise sets per stage (for user)
    const seenSetIds = (
      await UserExerciseHistory.find({ userId: userObjId }).select('exerciseSetId').lean()
    ).map((h) => h.exerciseSetId.toString())

    const unseenAgg = await ExerciseSet.aggregate([
      { $match: { _id: { $nin: seenSetIds.map((id) => new Types.ObjectId(id)) } } },
      { $group: { _id: '$stageId', count: { $sum: 1 } } },
    ])
    const unseenMap = new Map(unseenAgg.map((r) => [r._id.toString(), r.count as number]))

    // Build result
    let foundCurrent = false
    const result = stages.map((stage) => {
      const sid = stage._id.toString()
      const progress = progressMap.get(sid)
      const stars = calcStars(progress?.totalPassingCompletions ?? 0)

      // Unlock logic: stage 1 always unlocked; others unlock when previous stage has ≥ 1 pass
      let isUnlocked = stage.unlockRequirement === 0
      if (!isUnlocked) {
        const prereqStage = stages.find((s) => s.order === stage.unlockRequirement)
        if (prereqStage) {
          const prereqProgress = progressMap.get(prereqStage._id.toString())
          isUnlocked = (prereqProgress?.totalPassingCompletions ?? 0) >= 1
        }
      }

      const isCurrent = isUnlocked && stars < 3 && !foundCurrent
      if (isCurrent) foundCurrent = true

      return {
        _id: sid,
        order: stage.order,
        theme: stage.theme,
        emoji: stage.emoji,
        description: stage.description,
        cefrLevel: stage.cefrLevel,
        worldName: stage.worldName,
        unlockRequirement: stage.unlockRequirement,
        isUnlocked,
        isCurrent,
        stars,
        totalCompletions: progress?.totalCompletions ?? 0,
        averageScore: progress?.averageScore ?? 0,
        lessonsTotal: totalLessonsMap.get(sid) ?? 0,
        lessonsCompleted: completedLessonsMap.get(sid) ?? 0,
        exerciseSetsAvailable: unseenMap.get(sid) ?? 0,
      }
    })

    return { stages: result }
  })

  // ── GET /api/stages/:stageId ─────────────────────────────────────────────

  fastify.get('/:stageId', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { stageId } = request.params as { stageId: string }
    const userObjId = new Types.ObjectId(userId)

    const stage = await Stage.findById(stageId).lean()
    if (!stage) return reply.status(404).send({ error: 'Not Found', message: 'Stage not found' })

    const [progress, lessons] = await Promise.all([
      UserStageProgress.findOne({ userId: userObjId, stageId: new Types.ObjectId(stageId) }).lean(),
      Lesson.find({ stageId: new Types.ObjectId(stageId) })
        .sort({ orderInUnit: 1 })
        .lean(),
    ])

    const lessonProgressRecords = await UserLessonProgress.find({
      userId: userObjId,
      lessonId: { $in: lessons.map((l) => l._id) },
    }).lean()
    const lpMap = new Map(lessonProgressRecords.map((p) => [p.lessonId.toString(), p]))

    const stars = calcStars(progress?.totalPassingCompletions ?? 0)
    const difficulty = getDifficulty(stars)

    // Check if there's an unseen exercise set
    const seenSetIds = (
      await UserExerciseHistory.find({ userId: userObjId, stageId: new Types.ObjectId(stageId) })
        .select('exerciseSetId')
        .lean()
    ).map((h) => h.exerciseSetId.toString())

    const availableSet = await ExerciseSet.findOne({
      stageId: new Types.ObjectId(stageId),
      difficulty,
      _id: { $nin: seenSetIds.map((id) => new Types.ObjectId(id)) },
    }).lean()

    const recentScores = (
      await UserExerciseHistory.find({
        userId: userObjId,
        stageId: new Types.ObjectId(stageId),
        score: { $ne: null },
      })
        .sort({ completedAt: -1 })
        .limit(5)
        .lean()
    ).map((h) => h.score as number)

    return {
      stage: {
        _id: stage._id.toString(),
        order: stage.order,
        theme: stage.theme,
        emoji: stage.emoji,
        description: stage.description,
        cefrLevel: stage.cefrLevel,
        worldName: stage.worldName,
        unlockRequirement: stage.unlockRequirement,
      },
      userProgress: {
        stars,
        totalCompletions: progress?.totalCompletions ?? 0,
        averageScore: progress?.averageScore ?? 0,
        masteredAt: progress?.masteredAt?.toISOString() ?? null,
      },
      lessons: lessons.map((l) => {
        const lp = lpMap.get(l._id.toString())
        return {
          _id: l._id.toString(),
          title: l.title,
          estimatedMinutes: l.estimatedMinutes,
          type: l.type,
          progressStatus: lp?.status ?? 'not_started',
          score: lp?.score ?? 0,
        }
      }),
      practiceAvailable: !!availableSet,
      recentScores,
    }
  })

  // ── POST /api/stages/:stageId/practice ───────────────────────────────────

  fastify.post('/:stageId/practice', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request.user as { userId: string }
    const { stageId } = request.params as { stageId: string }
    const userObjId = new Types.ObjectId(userId)

    const stage = await Stage.findById(stageId).lean()
    if (!stage) return reply.status(404).send({ error: 'Not Found', message: 'Stage not found' })

    const progress = await UserStageProgress.findOne({
      userId: userObjId,
      stageId: new Types.ObjectId(stageId),
    }).lean()
    const stars = calcStars(progress?.totalPassingCompletions ?? 0)
    const difficulty = getDifficulty(stars)

    // Check for a due review first (failed sets scheduled for retry)
    const now = new Date()
    const dueReview = await UserExerciseHistory.findOne({
      userId: userObjId,
      stageId: new Types.ObjectId(stageId),
      reviewScheduledAt: { $lte: now },
      completedAt: { $ne: null },
    })
      .populate('exerciseSetId')
      .lean()

    if (dueReview?.exerciseSetId) {
      const set = dueReview.exerciseSetId as typeof dueReview.exerciseSetId & {
        exercises?: unknown[]
        topic?: string
        cefrLevel?: string
        difficulty?: string
      }
      // Create a fresh history entry for the retry
      const newHistory = await UserExerciseHistory.create({
        userId: userObjId,
        exerciseSetId: dueReview.exerciseSetId,
        stageId: new Types.ObjectId(stageId),
      })
      // Clear the old review schedule
      await UserExerciseHistory.findByIdAndUpdate(dueReview._id, {
        $unset: { reviewScheduledAt: 1 },
      })
      return {
        historyId: newHistory._id.toString(),
        exerciseSetId: (dueReview.exerciseSetId as { _id: Types.ObjectId })._id.toString(),
        exercises: (set as { exercises: unknown[] }).exercises,
        topic: (set as { topic: string }).topic,
        cefrLevel: (set as { cefrLevel: string }).cefrLevel,
        difficulty: (set as { difficulty: string }).difficulty,
        stageId,
        isReview: true,
      }
    }

    // Find unseen set at the right difficulty
    const seenSetIds = (
      await UserExerciseHistory.find({ userId: userObjId, stageId: new Types.ObjectId(stageId) })
        .select('exerciseSetId')
        .lean()
    ).map((h) => h.exerciseSetId.toString())

    const exerciseSet = await ExerciseSet.findOneAndUpdate(
      {
        stageId: new Types.ObjectId(stageId),
        difficulty,
        _id: { $nin: seenSetIds.map((id) => new Types.ObjectId(id)) },
      },
      { $inc: { timesServed: 1 } },
      { new: true },
    ).lean()

    if (!exerciseSet) {
      // Fallback: try any difficulty
      const anySet = await ExerciseSet.findOneAndUpdate(
        {
          stageId: new Types.ObjectId(stageId),
          _id: { $nin: seenSetIds.map((id) => new Types.ObjectId(id)) },
        },
        { $inc: { timesServed: 1 } },
        { new: true },
      ).lean()

      if (!anySet) {
        return reply.status(503).send({
          error: 'Not Ready',
          message: 'Exercise set is being prepared — please try again shortly.',
        })
      }

      const history = await UserExerciseHistory.create({
        userId: userObjId,
        exerciseSetId: anySet._id,
        stageId: new Types.ObjectId(stageId),
      })
      topUpStagePool(stageId, stage.cefrLevel, stage.theme, anySet.difficulty).catch(() => {})
      return {
        historyId: history._id.toString(),
        exerciseSetId: anySet._id.toString(),
        exercises: anySet.exercises,
        topic: anySet.topic,
        cefrLevel: anySet.cefrLevel,
        difficulty: anySet.difficulty,
        stageId,
      }
    }

    const history = await UserExerciseHistory.create({
      userId: userObjId,
      exerciseSetId: exerciseSet._id,
      stageId: new Types.ObjectId(stageId),
    })

    // Reactively top up the pool
    topUpStagePool(stageId, stage.cefrLevel, stage.theme, difficulty).catch(() => {})

    return {
      historyId: history._id.toString(),
      exerciseSetId: exerciseSet._id.toString(),
      exercises: exerciseSet.exercises,
      topic: exerciseSet.topic,
      cefrLevel: exerciseSet.cefrLevel,
      difficulty: exerciseSet.difficulty,
      stageId,
    }
  })

  // ── POST /api/stages/:stageId/practice/:historyId/complete ───────────────

  fastify.post(
    '/:stageId/practice/:historyId/complete',
    { preHandler: authenticate },
    async (request, reply) => {
      const { userId } = request.user as { userId: string }
      const { stageId, historyId } = request.params as { stageId: string; historyId: string }
      const body = request.body as {
        answers: Array<{ exerciseId: string; answer: string; timeSpentMs: number }>
      }

      if (!Array.isArray(body?.answers)) {
        return reply
          .status(400)
          .send({ error: 'Validation Error', message: 'answers array required' })
      }

      const userObjId = new Types.ObjectId(userId)

      const history = await UserExerciseHistory.findOne({
        _id: new Types.ObjectId(historyId),
        userId: userObjId,
      })
      if (!history)
        return reply.status(404).send({ error: 'Not Found', message: 'Session not found' })
      if (history.completedAt)
        return reply.status(400).send({ error: 'Bad Request', message: 'Already completed' })

      const exerciseSet = await ExerciseSet.findById(history.exerciseSetId)
      if (!exerciseSet)
        return reply.status(404).send({ error: 'Not Found', message: 'Exercise set not found' })

      // Score
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
      const failedIds: string[] = []
      const attempts = []

      const isTranslation = (t: string) => t === 'translate_de_en' || t === 'translate_en_de'

      for (const exercise of exerciseSet.exercises) {
        const submission = answerMap.get(exercise.id)
        if (!submission) continue

        const { isCorrect, isTypo } = checkAnswer(
          exercise.type,
          submission.answer,
          exercise.answer,
          exercise.acceptedAnswers,
        )
        if (isCorrect) {
          correctCount++
        } else {
          failedIds.push(exercise.id)
        }

        // For translation exercises that are wrong, check if the grammar is at least valid
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
          userId: userObjId,
          lessonId: history.exerciseSetId,
          exerciseId: exercise.id,
          exerciseType: exercise.type,
          userAnswer: submission.answer,
          correctAnswer: exercise.answer,
          isCorrect,
          timeSpentMs: submission.timeSpentMs,
        })
      }

      if (attempts.length > 0) await ExerciseAttempt.insertMany(attempts)

      const totalExercises = exerciseSet.exercises.length
      const score = totalExercises > 0 ? Math.round((correctCount / totalExercises) * 100) : 0
      const passed = score >= PASS_THRESHOLD
      const xpEarned = calculateLessonXP(score)
      const totalSeconds = body.answers.reduce(
        (sum, a) => sum + Math.round(a.timeSpentMs / 1000),
        0,
      )

      // Update history
      history.completedAt = new Date()
      history.score = score
      history.failedExerciseIds = failedIds
      if (!passed && failedIds.length > 0) {
        // Schedule a review ~24h later
        history.reviewScheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
      await history.save()

      // Update UserStageProgress
      const stageObjId = new Types.ObjectId(stageId)
      const existingProgress = await UserStageProgress.findOne({
        userId: userObjId,
        stageId: stageObjId,
      })

      if (existingProgress) {
        existingProgress.totalCompletions += 1
        if (passed) existingProgress.totalPassingCompletions += 1
        // Rolling average
        existingProgress.averageScore = Math.round(
          (existingProgress.averageScore * (existingProgress.totalCompletions - 1) + score) /
            existingProgress.totalCompletions,
        )
        const newStars = calcStars(existingProgress.totalPassingCompletions)
        existingProgress.stars = newStars
        if (newStars === 3 && !existingProgress.masteredAt) {
          existingProgress.masteredAt = new Date()
        }
        await existingProgress.save()

        // Unlock next stage progress record if just earned 1st star
        if (passed && existingProgress.totalPassingCompletions === 1) {
          const stage = await Stage.findById(stageId).lean()
          if (stage) {
            const nextStage = await Stage.findOne({ unlockRequirement: stage.order }).lean()
            if (nextStage) {
              await UserStageProgress.findOneAndUpdate(
                { userId: userObjId, stageId: nextStage._id },
                {
                  $setOnInsert: {
                    userId: userObjId,
                    stageId: nextStage._id,
                    unlockedAt: new Date(),
                  },
                },
                { upsert: true },
              )
            }
          }
        }
      } else {
        await UserStageProgress.create({
          userId: userObjId,
          stageId: stageObjId,
          totalCompletions: 1,
          totalPassingCompletions: passed ? 1 : 0,
          averageScore: score,
          stars: passed ? 1 : 0,
        })
        if (passed) {
          const stage = await Stage.findById(stageId).lean()
          if (stage) {
            const nextStage = await Stage.findOne({ unlockRequirement: stage.order }).lean()
            if (nextStage) {
              await UserStageProgress.findOneAndUpdate(
                { userId: userObjId, stageId: nextStage._id },
                {
                  $setOnInsert: {
                    userId: userObjId,
                    stageId: nextStage._id,
                    unlockedAt: new Date(),
                  },
                },
                { upsert: true },
              )
            }
          }
        }
      }

      await awardXP(userId, xpEarned)
      await updateSessionAfterLesson(userId, xpEarned, totalExercises, totalSeconds)

      const finalProgress = await UserStageProgress.findOne({
        userId: userObjId,
        stageId: stageObjId,
      }).lean()
      const newStars = calcStars(finalProgress?.totalPassingCompletions ?? 0)
      const prevStars = calcStars((finalProgress?.totalPassingCompletions ?? 0) - (passed ? 1 : 0))

      return {
        score,
        xpEarned,
        correctAnswers: correctCount,
        totalExercises,
        stars: newStars,
        starsGained: newStars - prevStars,
        results,
      }
    },
  )
}
