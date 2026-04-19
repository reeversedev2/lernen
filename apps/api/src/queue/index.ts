import type { ExerciseDifficulty } from '@lernen/shared'
import { type Job, Queue, Worker } from 'bullmq'
import { Types } from 'mongoose'
import { config } from '../config/index.js'
import { type QueueEvent, queueEventBus } from './event-bus.js'

export { QueueEvent, queueEventBus } from './event-bus.js'

// ── Constants ──────────────────────────────────────────────────────────────
const EXERCISE_POOL_MIN = 1 // sets per stage — keep low on Pi; bump when hardware improves
const LESSON_POOL_MIN = 1 // lessons per stage

const connection = {
  host: config.REDIS_URL.replace('redis://', '').split(':')[0] || 'localhost',
  port: parseInt(config.REDIS_URL.split(':').pop() ?? '6379', 10),
}

export const llmJobQueue = new Queue('llm-jobs', { connection })

// Default options applied to every job added via the helpers below
const JOB_DEFAULTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 15_000 }, // 15s → 30s
  // Allow a job to stall (appear unresponsive) up to 3 times before giving up.
  // On a loaded Pi, generation takes 3–7 min and can miss heartbeats under CPU pressure.
  maxStalledCount: 3,
}

export const llmWorker = new Worker(
  'llm-jobs',
  async (job) => {
    const jobId = job.id ?? 'unknown'
    if (job.name === 'generate-exercise-set') {
      await handleGenerateExerciseSet(job.data as ExerciseSetJobData, jobId)
    }
    if (job.name === 'generate-stage-lesson') {
      await handleGenerateStageLesson(job.data as StageLessonJobData, jobId)
    }
    if (job.name === 'fill-all-stages') {
      await handleFillAllStages()
    }
    // Legacy fallback — keep handling old jobs that may still be in the queue
    if (job.name === 'generate-session') {
      await handleLegacyGenerateSession(job.data as { userId: string; sessionId: string })
    }
  },
  {
    connection,
    concurrency: 1,
    // Pi jobs take 3–7 min. Lock must outlive the longest expected job.
    // The worker auto-renews at lockDuration/2, so with 10 min lock it renews every 5 min.
    lockDuration: 10 * 60 * 1000, // 10 minutes
    stalledInterval: 60 * 1000, // check for stalled jobs every 60s (default: 30s)
    maxStalledCount: 3, // worker-level stall tolerance
  },
)

// ── Job data types ─────────────────────────────────────────────────────────

interface ExerciseSetJobData {
  stageId: string
  cefrLevel: string
  theme: string
  difficulty: ExerciseDifficulty
}

interface StageLessonJobData {
  stageId: string
  cefrLevel: string
  theme: string
  lessonIndex: number
}

// ── Job handlers ───────────────────────────────────────────────────────────

async function handleGenerateExerciseSet(
  { stageId, cefrLevel, theme, difficulty }: ExerciseSetJobData,
  jobId: string,
) {
  const { generateExerciseSet } = await import('../services/llm.service.js')
  const { ExerciseSet } = await import('../models/exercise-set.model.js')

  const { topic, exercises } = await generateExerciseSet(
    stageId,
    cefrLevel as Parameters<typeof generateExerciseSet>[1],
    theme,
    difficulty,
    undefined,
    jobId,
  )

  await ExerciseSet.create({
    stageId: new Types.ObjectId(stageId),
    cefrLevel,
    topic,
    difficulty,
    exercises,
  })

  console.log(
    `[llm-worker] ExerciseSet ready — stage: "${theme}" (${difficulty}) · topic: "${topic}"`,
  )
}

async function handleGenerateStageLesson(
  { stageId, cefrLevel, theme, lessonIndex }: StageLessonJobData,
  jobId: string,
) {
  const { generateStageLesson } = await import('../services/llm.service.js')
  const { Lesson } = await import('../models/lesson.model.js')

  const { title, explanationMarkdown, examples, exercises } = await generateStageLesson(
    stageId,
    cefrLevel as Parameters<typeof generateStageLesson>[1],
    theme,
    lessonIndex,
    jobId,
  )

  await Lesson.create({
    stageId: new Types.ObjectId(stageId),
    type: 'mixed',
    title,
    orderInUnit: 100 + lessonIndex,
    estimatedMinutes: 10,
    isAiGenerated: true,
    content: { explanation: { markdown: explanationMarkdown, examples }, exercises },
  })

  console.log(`[llm-worker] Lesson generated: "${title}" for stage "${theme}"`)
}

async function handleLegacyGenerateSession({
  userId,
  sessionId,
}: {
  userId: string
  sessionId: string
}) {
  const { generateExercises } = await import('../services/llm.service.js')
  const { GeneratedSession } = await import('../models/generated-session.model.js')

  try {
    const { topic, cefrLevel, exercises } = await generateExercises(userId)
    await GeneratedSession.findByIdAndUpdate(sessionId, {
      topic,
      cefrLevel,
      exercises,
      status: 'pending',
    })
  } catch (err) {
    await GeneratedSession.findByIdAndDelete(sessionId)
    throw err
  }
}

async function handleFillAllStages() {
  const { Stage } = await import('../models/stage.model.js')
  const { ExerciseSet } = await import('../models/exercise-set.model.js')
  const { Lesson } = await import('../models/lesson.model.js')

  const stages = await Stage.find({}).sort({ order: 1 }).lean()
  if (stages.length === 0) {
    console.log('[llm-worker] No stages found — skipping fill')
    return
  }

  let exerciseJobs = 0
  let lessonJobs = 0

  for (const stage of stages) {
    const sid = stage._id.toString()

    // Fill exercise pool — only easy initially; medium/hard when users reach those tiers
    const easyCount = await ExerciseSet.countDocuments({ stageId: stage._id, difficulty: 'easy' })
    const easyNeeded = Math.max(0, EXERCISE_POOL_MIN - easyCount)
    for (let i = 0; i < easyNeeded; i++) {
      await llmJobQueue.add(
        'generate-exercise-set',
        {
          stageId: sid,
          cefrLevel: stage.cefrLevel,
          theme: stage.theme,
          difficulty: 'easy',
        },
        JOB_DEFAULTS,
      )
      exerciseJobs++
    }

    // Fill lesson pool
    const lessonCount = await Lesson.countDocuments({ stageId: stage._id })
    const lessonsNeeded = Math.max(0, LESSON_POOL_MIN - lessonCount)
    for (let i = 0; i < lessonsNeeded; i++) {
      await llmJobQueue.add(
        'generate-stage-lesson',
        {
          stageId: sid,
          cefrLevel: stage.cefrLevel,
          theme: stage.theme,
          lessonIndex: lessonCount + i,
        },
        JOB_DEFAULTS,
      )
      lessonJobs++
    }
  }

  if (exerciseJobs > 0 || lessonJobs > 0) {
    console.log(`[llm-worker] Enqueued: ${exerciseJobs} exercise sets, ${lessonJobs} lessons`)
  } else {
    console.log('[llm-worker] All stage pools fully stocked — nothing to do')
  }
}

// ── Reactive: keep pools topped up after each completion ──────────────────

function emit(event: QueueEvent) {
  queueEventBus.emit('event', event)
}

llmWorker.on('active', (job: Job) => {
  emit({
    ts: Date.now(),
    type: 'active',
    jobId: job.id ?? '',
    jobName: job.name,
    data: job.data as Record<string, unknown>,
  })
})

llmWorker.on('completed', (job: Job) => {
  const durationMs =
    job.finishedOn && job.processedOn ? job.finishedOn - job.processedOn : undefined
  emit({
    ts: Date.now(),
    type: 'completed',
    jobId: job.id ?? '',
    jobName: job.name,
    data: job.data as Record<string, unknown>,
    durationMs,
  })

  void (async () => {
    try {
      if (job.name === 'generate-exercise-set') {
        const { stageId, cefrLevel, theme, difficulty } = job.data as ExerciseSetJobData
        await enqueueExerciseSetIfNeeded(stageId, cefrLevel, theme, difficulty)
      }
      if (job.name === 'generate-stage-lesson') {
        const { stageId, cefrLevel, theme, lessonIndex } = job.data as StageLessonJobData
        await enqueueStageLessonIfNeeded(stageId, cefrLevel, theme, lessonIndex + 1)
      }
    } catch (err) {
      console.error(`[llm-worker] Post-completion hook failed for "${job.name}":`, err)
    }
  })()
})

llmWorker.on('failed', (job: Job | undefined, error: Error) => {
  console.error(`[llm-worker] Job "${job?.name}" (${job?.id}) failed: ${error.message}`)
  emit({
    ts: Date.now(),
    type: 'failed',
    jobId: job?.id ?? '',
    jobName: job?.name ?? 'unknown',
    data: (job?.data ?? {}) as Record<string, unknown>,
    error: error.message,
  })
})

llmWorker.on('stalled', (jobId: string) => {
  emit({ ts: Date.now(), type: 'stalled', jobId, jobName: 'unknown', data: {} })
})

llmWorker.on('progress', (job: Job, progress) => {
  emit({
    ts: Date.now(),
    type: 'progress',
    jobId: job.id ?? '',
    jobName: job.name,
    data: job.data as Record<string, unknown>,
    progress: typeof progress === 'number' ? progress : undefined,
  })
})

// ── Public helpers ─────────────────────────────────────────────────────────

export async function enqueueExerciseSetIfNeeded(
  stageId: string,
  cefrLevel: string,
  theme: string,
  difficulty: ExerciseDifficulty,
): Promise<boolean> {
  const { ExerciseSet } = await import('../models/exercise-set.model.js')
  const count = await ExerciseSet.countDocuments({
    stageId: new Types.ObjectId(stageId),
    difficulty,
  })
  if (count >= EXERCISE_POOL_MIN) return false

  await llmJobQueue.add(
    'generate-exercise-set',
    { stageId, cefrLevel, theme, difficulty },
    JOB_DEFAULTS,
  )
  return true
}

export async function enqueueStageLessonIfNeeded(
  stageId: string,
  cefrLevel: string,
  theme: string,
  lessonIndex: number,
): Promise<boolean> {
  const { Lesson } = await import('../models/lesson.model.js')
  const count = await Lesson.countDocuments({ stageId: new Types.ObjectId(stageId) })
  if (count >= LESSON_POOL_MIN) return false

  await llmJobQueue.add(
    'generate-stage-lesson',
    { stageId, cefrLevel, theme, lessonIndex },
    JOB_DEFAULTS,
  )
  return true
}

// Trigger a top-up for a specific stage after a user completes practice
export async function topUpStagePool(
  stageId: string,
  cefrLevel: string,
  theme: string,
  difficulty: ExerciseDifficulty,
): Promise<void> {
  await enqueueExerciseSetIfNeeded(stageId, cefrLevel, theme, difficulty)
}

// ── Startup ────────────────────────────────────────────────────────────────

export async function initScheduledJobs() {
  console.log('[llm-worker] Running initial fill pass...')
  await handleFillAllStages()

  await llmJobQueue.add(
    'fill-all-stages',
    {},
    {
      repeat: { every: 2 * 60 * 60 * 1000 }, // 2h safety net
      jobId: 'fill-all-stages-cron',
    },
  )
  console.log('[llm-worker] Safety-net cron scheduled (every 2h)')
}

// ── Legacy exports (for routes that haven't migrated yet) ─────────────────

export async function enqueueSessionGeneration(userId: string): Promise<boolean> {
  const { GeneratedSession } = await import('../models/generated-session.model.js')
  const existing = await GeneratedSession.findOne({
    userId: new Types.ObjectId(userId),
    status: { $in: ['generating', 'pending'] },
  })
  if (existing) return false

  const placeholder = await GeneratedSession.create({
    userId: new Types.ObjectId(userId),
    topic: '',
    cefrLevel: 'A1',
    exercises: [],
    status: 'generating',
  })
  await llmJobQueue.add('generate-session', { userId, sessionId: placeholder._id.toString() })
  return true
}
