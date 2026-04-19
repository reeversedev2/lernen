import { execSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import os from 'node:os'
import { Job } from 'bullmq'
import type { FastifyInstance } from 'fastify'
import { Types } from 'mongoose'
import { adminAuth } from '../middleware/admin-auth.js'
import { DailySession } from '../models/daily-session.model.js'
import { ExerciseSet } from '../models/exercise-set.model.js'
import { GeneratedSession } from '../models/generated-session.model.js'
import { Lesson } from '../models/lesson.model.js'
import { Stage } from '../models/stage.model.js'
import { User } from '../models/user.model.js'
import { UserLessonProgress } from '../models/user-lesson-progress.model.js'
import { llmJobQueue, type QueueEvent, queueEventBus } from '../queue/index.js'

// ── System helpers ─────────────────────────────────────────────────────────

async function getCpuTemperature(): Promise<number | null> {
  // Raspberry Pi / Linux thermal zone
  try {
    const raw = await readFile('/sys/class/thermal/thermal_zone0/temp', 'utf-8')
    return Math.round(parseFloat(raw.trim()) / 100) / 10 // millidegrees → °C, 1dp
  } catch {
    return null
  }
}

async function getCpuUsage(): Promise<number> {
  const snapshot = () => os.cpus().map((c) => ({ ...c.times }))

  const start = snapshot()
  await new Promise((r) => setTimeout(r, 500))
  const end = snapshot()

  let idle = 0
  let total = 0
  for (let i = 0; i < start.length; i++) {
    const keys = Object.keys(start[i]) as Array<keyof (typeof start)[0]>
    const startSum = keys.reduce((s, k) => s + start[i][k], 0)
    const endSum = keys.reduce((s, k) => s + end[i][k], 0)
    idle += end[i].idle - start[i].idle
    total += endSum - startSum
  }
  return total === 0 ? 0 : Math.round(((total - idle) / total) * 100)
}

function getDiskUsage(): { totalGb: number; usedGb: number; percent: number } | null {
  try {
    // POSIX df: columns are Filesystem 1024-blocks Used Available Use% Mounted
    const out = execSync('df -Pk /', { encoding: 'utf-8', timeout: 3000 })
    const parts = out.trim().split('\n')[1].trim().split(/\s+/)
    const totalKb = parseInt(parts[1], 10)
    const usedKb = parseInt(parts[2], 10)
    const pct = parseInt(parts[4], 10) // already a percentage
    return {
      totalGb: parseFloat((totalKb / 1024 / 1024).toFixed(1)),
      usedGb: parseFloat((usedKb / 1024 / 1024).toFixed(1)),
      percent: Number.isNaN(pct) ? Math.round((usedKb / totalKb) * 100) : pct,
    }
  } catch {
    return null
  }
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  parts.push(`${m}m`)
  return parts.join(' ')
}

export async function adminRoutes(fastify: FastifyInstance): Promise<void> {
  // ── Overview ─────────────────────────────────────────────────────────────────

  fastify.get('/overview', { preHandler: adminAuth }, async () => {
    const today = new Date().toISOString().slice(0, 10)

    const [totalUsers, activeToday, totalLessons, aiLessons, pendingSessions, queueCounts] =
      await Promise.all([
        User.countDocuments({}),
        DailySession.countDocuments({ sessionDate: today }),
        Lesson.countDocuments({}),
        Lesson.countDocuments({ isAiGenerated: true }),
        GeneratedSession.countDocuments({ status: 'pending' }),
        llmJobQueue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed'),
      ])

    const [recentFailed] = await Promise.all([llmJobQueue.getJobs(['failed'], 0, 5)])

    return {
      users: { total: totalUsers, activeToday },
      content: {
        totalLessons,
        aiGeneratedLessons: aiLessons,
        pendingPracticeSessions: pendingSessions,
      },
      queue: {
        counts: queueCounts,
        recentFailed: recentFailed.map((j) => ({
          id: j.id,
          name: j.name,
          data: j.data,
          error: j.failedReason,
          failedAt: j.finishedOn,
        })),
      },
    }
  })

  // ── Users ─────────────────────────────────────────────────────────────────────

  fastify.get('/users', { preHandler: adminAuth }, async () => {
    const users = await User.find({})
      .sort({ createdAt: -1 })
      .select(
        'displayName email totalXp streakCount currentUnitIndex createdAt streakLastActivityDate',
      )
      .lean()

    const userIds = users.map((u) => u._id as Types.ObjectId)

    const [lessonCompletions, recentSessions] = await Promise.all([
      UserLessonProgress.aggregate([
        { $match: { userId: { $in: userIds }, status: 'completed' } },
        { $group: { _id: '$userId', completed: { $sum: 1 } } },
      ]),
      DailySession.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $sort: { sessionDate: -1 } },
        {
          $group: {
            _id: '$userId',
            lastActive: { $first: '$sessionDate' },
            totalExercises: { $sum: '$exercisesCompleted' },
            totalXpFromSessions: { $sum: '$xpEarned' },
          },
        },
      ]),
    ])

    const completionMap = new Map(lessonCompletions.map((r) => [r._id.toString(), r.completed]))
    const sessionMap = new Map(recentSessions.map((r) => [r._id.toString(), r]))

    const CEFR_LEVELS = ['A1', 'A1.2', 'A2', 'B1']

    return users.map((u) => {
      const uid = (u._id as Types.ObjectId).toString()
      const session = sessionMap.get(uid)
      return {
        id: uid,
        displayName: u.displayName,
        email: u.email,
        totalXp: u.totalXp,
        streakCount: u.streakCount,
        cefrLevel: CEFR_LEVELS[Math.min(u.currentUnitIndex, CEFR_LEVELS.length - 1)] ?? 'A1',
        currentUnitIndex: u.currentUnitIndex,
        lessonsCompleted: completionMap.get(uid) ?? 0,
        lastActive: session?.lastActive ?? null,
        totalExercisesCompleted: session?.totalExercises ?? 0,
        joinedAt: (u as { createdAt?: Date }).createdAt ?? null,
      }
    })
  })

  // ── Queue ─────────────────────────────────────────────────────────────────────

  // ── Queue: read ───────────────────────────────────────────────────────────────

  fastify.get('/queue', { preHandler: adminAuth }, async () => {
    const [counts, isPaused, waiting, active, failed, delayed, completed] = await Promise.all([
      llmJobQueue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed'),
      llmJobQueue.isPaused(),
      llmJobQueue.getJobs(['waiting'], 0, 50),
      llmJobQueue.getJobs(['active'], 0, 20),
      llmJobQueue.getJobs(['failed'], 0, 50),
      llmJobQueue.getJobs(['delayed'], 0, 20),
      llmJobQueue.getJobs(['completed'], 0, 20),
    ])

    const serializeJob = (j: Job) => ({
      id: j.id,
      name: j.name,
      data: j.data,
      opts: j.opts,
      timestamp: j.timestamp,
      processedOn: j.processedOn ?? null,
      finishedOn: j.finishedOn ?? null,
      attemptsMade: j.attemptsMade,
      failedReason: j.failedReason ?? null,
      stacktrace: j.stacktrace ?? [],
      returnvalue: j.returnvalue ?? null,
      delay: j.opts?.delay ?? null,
    })

    return {
      isPaused,
      counts,
      jobs: {
        waiting: waiting.map(serializeJob),
        active: active.map(serializeJob),
        failed: failed.map(serializeJob),
        delayed: delayed.map(serializeJob),
        completed: completed.map(serializeJob),
      },
    }
  })

  fastify.get('/queue/jobs/:jobId', { preHandler: adminAuth }, async (request, reply) => {
    const { jobId } = request.params as { jobId: string }
    const job = await Job.fromId(llmJobQueue, jobId)
    if (!job) return reply.status(404).send({ error: 'Not Found', message: 'Job not found' })
    const logs = await llmJobQueue.getJobLogs(jobId)
    return {
      id: job.id,
      name: job.name,
      data: job.data,
      opts: job.opts,
      timestamp: job.timestamp,
      processedOn: job.processedOn ?? null,
      finishedOn: job.finishedOn ?? null,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason ?? null,
      stacktrace: job.stacktrace ?? [],
      returnvalue: job.returnvalue ?? null,
      logs: logs.logs,
    }
  })

  // ── Queue: actions ────────────────────────────────────────────────────────────

  fastify.post('/queue/pause', { preHandler: adminAuth }, async () => {
    await llmJobQueue.pause()
    return { ok: true }
  })

  fastify.post('/queue/resume', { preHandler: adminAuth }, async () => {
    await llmJobQueue.resume()
    return { ok: true }
  })

  fastify.post('/queue/retry-failed', { preHandler: adminAuth }, async () => {
    const failed = await llmJobQueue.getJobs(['failed'], 0, 500)
    let retried = 0
    for (const job of failed) {
      await job.retry()
      retried++
    }
    return { retried }
  })

  fastify.delete('/queue/failed', { preHandler: adminAuth }, async () => {
    const failed = await llmJobQueue.getJobs(['failed'], 0, 500)
    await Promise.all(failed.map((j) => j.remove()))
    return { removed: failed.length }
  })

  fastify.post('/queue/drain', { preHandler: adminAuth }, async () => {
    await llmJobQueue.drain()
    return { ok: true }
  })

  // ── Queue: per-job ────────────────────────────────────────────────────────────

  fastify.post('/queue/jobs/:jobId/retry', { preHandler: adminAuth }, async (request, reply) => {
    const { jobId } = request.params as { jobId: string }
    const job = await Job.fromId(llmJobQueue, jobId)
    if (!job) return reply.status(404).send({ error: 'Not Found', message: 'Job not found' })
    await job.retry()
    return { ok: true }
  })

  fastify.delete('/queue/jobs/:jobId', { preHandler: adminAuth }, async (request, reply) => {
    const { jobId } = request.params as { jobId: string }
    const job = await Job.fromId(llmJobQueue, jobId)
    if (!job) return reply.status(404).send({ error: 'Not Found', message: 'Job not found' })
    await job.remove()
    return { ok: true }
  })

  fastify.post('/queue/enqueue', { preHandler: adminAuth }, async (request, reply) => {
    const { name, data } = request.body as { name?: string; data?: Record<string, unknown> }
    if (!name) return reply.status(400).send({ error: 'Bad Request', message: 'name is required' })
    const job = await llmJobQueue.add(name, data ?? {})
    return { id: job.id, name: job.name }
  })

  // ── Queue: SSE event stream ───────────────────────────────────────────────────

  fastify.get('/queue/events', { preHandler: adminAuth }, async (request, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache')
    reply.raw.setHeader('Connection', 'keep-alive')
    reply.raw.setHeader('X-Accel-Buffering', 'no') // disable nginx buffering
    reply.raw.flushHeaders()

    const send = (event: QueueEvent) => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`)
    }

    // Send a heartbeat every 20s to keep the connection alive through proxies
    const heartbeat = setInterval(() => {
      reply.raw.write(': heartbeat\n\n')
    }, 20_000)

    queueEventBus.on('event', send)

    request.raw.on('close', () => {
      clearInterval(heartbeat)
      queueEventBus.off('event', send)
    })

    // Never resolve — keep the stream open
    await new Promise<void>(() => {})
  })

  // ── System ────────────────────────────────────────────────────────────────────

  fastify.get('/system', { preHandler: adminAuth }, async () => {
    const [cpuTemp, cpuUsage] = await Promise.all([getCpuTemperature(), getCpuUsage()])

    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem

    const loadAvg = os.loadavg() // [1m, 5m, 15m]
    const uptime = os.uptime()
    const disk = getDiskUsage()

    return {
      cpu: {
        usagePercent: cpuUsage,
        temperatureCelsius: cpuTemp,
        cores: os.cpus().length,
        model: os.cpus()[0]?.model ?? 'unknown',
        loadAvg: {
          '1m': parseFloat(loadAvg[0].toFixed(2)),
          '5m': parseFloat(loadAvg[1].toFixed(2)),
          '15m': parseFloat(loadAvg[2].toFixed(2)),
        },
      },
      memory: {
        totalGb: parseFloat((totalMem / 1024 / 1024 / 1024).toFixed(2)),
        usedGb: parseFloat((usedMem / 1024 / 1024 / 1024).toFixed(2)),
        freeGb: parseFloat((freeMem / 1024 / 1024 / 1024).toFixed(2)),
        percent: Math.round((usedMem / totalMem) * 100),
      },
      disk,
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptimeFormatted: formatUptime(uptime),
        uptimeSeconds: Math.round(uptime),
      },
    }
  })

  // ── Content Management ────────────────────────────────────────────────────

  // GET /admin/content — all stages with lesson + exercise-set counts
  fastify.get('/content', { preHandler: adminAuth }, async () => {
    const stages = await Stage.find({}).sort({ order: 1 }).lean()
    const result = await Promise.all(
      stages.map(async (stage) => {
        const [lessonCount, exerciseSetCount] = await Promise.all([
          Lesson.countDocuments({ stageId: stage._id }),
          ExerciseSet.countDocuments({ stageId: stage._id }),
        ])
        return {
          _id: stage._id.toString(),
          order: stage.order,
          theme: stage.theme,
          emoji: stage.emoji,
          cefrLevel: stage.cefrLevel,
          worldName: stage.worldName,
          lessonCount,
          exerciseSetCount,
        }
      }),
    )
    return result
  })

  // GET /admin/content/stages/:stageId — stage detail with all lessons + exercise sets
  fastify.get('/content/stages/:stageId', { preHandler: adminAuth }, async (request, reply) => {
    const { stageId } = request.params as { stageId: string }
    const [stage, lessons, exerciseSets] = await Promise.all([
      Stage.findById(stageId).lean(),
      Lesson.find({ stageId: new Types.ObjectId(stageId) })
        .sort({ orderInUnit: 1 })
        .lean(),
      ExerciseSet.find({ stageId: new Types.ObjectId(stageId) })
        .sort({ createdAt: -1 })
        .lean(),
    ])
    if (!stage) return reply.status(404).send({ error: 'Not Found' })
    return {
      stage: {
        _id: stage._id.toString(),
        theme: stage.theme,
        emoji: stage.emoji,
        cefrLevel: stage.cefrLevel,
      },
      lessons: lessons.map((l) => ({
        _id: l._id.toString(),
        title: l.title,
        type: l.type,
        orderInUnit: l.orderInUnit,
        estimatedMinutes: l.estimatedMinutes,
        isAiGenerated: l.isAiGenerated ?? false,
        exerciseCount: l.content.exercises.length,
        exercises: l.content.exercises,
      })),
      exerciseSets: exerciseSets.map((s) => ({
        _id: s._id.toString(),
        topic: s.topic,
        difficulty: s.difficulty,
        cefrLevel: s.cefrLevel,
        timesServed: s.timesServed,
        createdAt: (s.createdAt as Date).toISOString(),
        exerciseCount: s.exercises.length,
        exercises: s.exercises,
      })),
    }
  })

  // PATCH /admin/content/lessons/:lessonId/exercises/:exerciseId — edit one exercise in a lesson
  fastify.patch(
    '/content/lessons/:lessonId/exercises/:exerciseId',
    { preHandler: adminAuth },
    async (request, reply) => {
      const { lessonId, exerciseId } = request.params as { lessonId: string; exerciseId: string }
      const patch = request.body as Record<string, unknown>

      const lesson = await Lesson.findById(lessonId)
      if (!lesson) return reply.status(404).send({ error: 'Not Found' })

      const idx = lesson.content.exercises.findIndex((e) => e.id === exerciseId)
      if (idx === -1) return reply.status(404).send({ error: 'Exercise not found' })

      const allowed = [
        'question',
        'answer',
        'acceptedAnswers',
        'wrongFeedback',
        'correctFeedback',
        'hint',
        'explanation',
        'options',
        'passage',
      ]
      for (const key of allowed) {
        if (key in patch)
          (lesson.content.exercises[idx] as unknown as Record<string, unknown>)[key] = patch[key]
      }
      lesson.markModified('content.exercises')
      await lesson.save()
      return lesson.content.exercises[idx]
    },
  )

  // DELETE /admin/content/lessons/:lessonId/exercises/:exerciseId — remove one exercise
  fastify.delete(
    '/content/lessons/:lessonId/exercises/:exerciseId',
    { preHandler: adminAuth },
    async (request, reply) => {
      const { lessonId, exerciseId } = request.params as { lessonId: string; exerciseId: string }
      const lesson = await Lesson.findById(lessonId)
      if (!lesson) return reply.status(404).send({ error: 'Not Found' })
      lesson.content.exercises = lesson.content.exercises.filter((e) => e.id !== exerciseId)
      lesson.markModified('content.exercises')
      await lesson.save()
      return { deleted: exerciseId }
    },
  )

  // DELETE /admin/content/lessons/:lessonId — delete whole lesson
  fastify.delete(
    '/content/lessons/:lessonId',
    { preHandler: adminAuth },
    async (request, reply) => {
      const { lessonId } = request.params as { lessonId: string }
      const result = await Lesson.deleteOne({ _id: new Types.ObjectId(lessonId) })
      if (result.deletedCount === 0) return reply.status(404).send({ error: 'Not Found' })
      return { deleted: lessonId }
    },
  )

  // PATCH /admin/content/exercise-sets/:setId/exercises/:exerciseId — edit one exercise in a set
  fastify.patch(
    '/content/exercise-sets/:setId/exercises/:exerciseId',
    { preHandler: adminAuth },
    async (request, reply) => {
      const { setId, exerciseId } = request.params as { setId: string; exerciseId: string }
      const patch = request.body as Record<string, unknown>

      const set = await ExerciseSet.findById(setId)
      if (!set) return reply.status(404).send({ error: 'Not Found' })

      const idx = set.exercises.findIndex((e) => e.id === exerciseId)
      if (idx === -1) return reply.status(404).send({ error: 'Exercise not found' })

      const allowed = [
        'question',
        'answer',
        'acceptedAnswers',
        'wrongFeedback',
        'correctFeedback',
        'hint',
        'explanation',
        'options',
        'passage',
      ]
      for (const key of allowed) {
        if (key in patch)
          (set.exercises[idx] as unknown as Record<string, unknown>)[key] = patch[key]
      }
      set.markModified('exercises')
      await set.save()
      return set.exercises[idx]
    },
  )

  // DELETE /admin/content/exercise-sets/:setId/exercises/:exerciseId — remove one exercise
  fastify.delete(
    '/content/exercise-sets/:setId/exercises/:exerciseId',
    { preHandler: adminAuth },
    async (request, reply) => {
      const { setId, exerciseId } = request.params as { setId: string; exerciseId: string }
      const set = await ExerciseSet.findById(setId)
      if (!set) return reply.status(404).send({ error: 'Not Found' })
      set.exercises = set.exercises.filter((e) => e.id !== exerciseId)
      set.markModified('exercises')
      await set.save()
      return { deleted: exerciseId }
    },
  )

  // DELETE /admin/content/exercise-sets/:setId — delete whole exercise set
  fastify.delete(
    '/content/exercise-sets/:setId',
    { preHandler: adminAuth },
    async (request, reply) => {
      const { setId } = request.params as { setId: string }
      const result = await ExerciseSet.deleteOne({ _id: new Types.ObjectId(setId) })
      if (result.deletedCount === 0) return reply.status(404).send({ error: 'Not Found' })
      return { deleted: setId }
    },
  )

  // DELETE /admin/content/all — wipe all AI-generated lessons and exercise sets
  fastify.delete('/content/all', { preHandler: adminAuth }, async () => {
    const [lessons, sets] = await Promise.all([
      Lesson.deleteMany({ isAiGenerated: true }),
      ExerciseSet.deleteMany({}),
    ])
    return { deletedLessons: lessons.deletedCount, deletedExerciseSets: sets.deletedCount }
  })
}
