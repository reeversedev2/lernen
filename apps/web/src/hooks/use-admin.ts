import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { adminApi } from '../lib/admin-api'
import { useAdminStore } from '../stores/admin.store'

export interface QueueLiveEvent {
  ts: number
  type:
    | 'active'
    | 'completed'
    | 'failed'
    | 'stalled'
    | 'progress'
    | 'added'
    | 'ollama_start'
    | 'ollama_chunk'
    | 'ollama_done'
  jobId: string
  jobName: string
  data: Record<string, unknown>
  // worker
  durationMs?: number
  error?: string
  progress?: number
  // ollama
  model?: string
  prompt?: string
  chunk?: string
  tokenCount?: number
  tokensPerSec?: number
  promptTokens?: number
  totalTokens?: number
  totalMs?: number
}

export function useQueueEvents(maxEvents = 200) {
  const [events, setEvents] = useState<QueueLiveEvent[]>([])
  const [connected, setConnected] = useState(false)
  const esRef = useRef<EventSource | null>(null)
  const credentials = useAdminStore((s) => s.credentials)

  const clear = useCallback(() => setEvents([]), [])

  useEffect(() => {
    if (!credentials) return

    // EventSource doesn't support custom headers — send credentials as query param
    // The API will accept Basic auth from either header or query for this route
    const url = `/api/admin/queue/events?auth=${encodeURIComponent(credentials)}`
    const es = new EventSource(url)
    esRef.current = es

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)

    es.onmessage = (e: MessageEvent<string>) => {
      try {
        const event = JSON.parse(e.data) as QueueLiveEvent
        setEvents((prev) => {
          const next = [event, ...prev]
          return next.length > maxEvents ? next.slice(0, maxEvents) : next
        })
      } catch {
        /* ignore malformed */
      }
    }

    return () => {
      es.close()
      setConnected(false)
    }
  }, [credentials, maxEvents])

  return { events, connected, clear }
}

export interface AdminOverview {
  users: { total: number; activeToday: number }
  content: { totalLessons: number; aiGeneratedLessons: number; pendingPracticeSessions: number }
  queue: {
    counts: Record<string, number>
    recentFailed: Array<{
      id: string
      name: string
      data: unknown
      error: string
      failedAt: number
    }>
  }
}

export interface AdminUser {
  id: string
  displayName: string
  email: string
  totalXp: number
  streakCount: number
  cefrLevel: string
  currentUnitIndex: number
  lessonsCompleted: number
  lastActive: string | null
  totalExercisesCompleted: number
  joinedAt: string | null
}

export interface QueueJob {
  id: string
  name: string
  data: Record<string, unknown>
  opts: Record<string, unknown> | null
  timestamp: number
  processedOn: number | null
  finishedOn: number | null
  attemptsMade: number
  failedReason: string | null
  stacktrace: string[]
  returnvalue: Record<string, unknown> | null
  delay: number | null
}

export interface AdminQueue {
  isPaused: boolean
  counts: Record<string, number>
  jobs: {
    waiting: QueueJob[]
    active: QueueJob[]
    failed: QueueJob[]
    delayed: QueueJob[]
    completed: QueueJob[]
  }
}

export interface AdminSystem {
  cpu: {
    usagePercent: number
    temperatureCelsius: number | null
    cores: number
    model: string
    loadAvg: { '1m': number; '5m': number; '15m': number }
  }
  memory: { totalGb: number; usedGb: number; freeGb: number; percent: number }
  disk: { totalGb: number; usedGb: number; percent: number } | null
  system: {
    platform: string
    arch: string
    hostname: string
    uptimeFormatted: string
    uptimeSeconds: number
  }
}

export function useAdminSystem() {
  return useQuery<AdminSystem>({
    queryKey: ['admin', 'system'],
    queryFn: async () => {
      const res = await adminApi.get('/system')
      return res.data
    },
    refetchInterval: 5000,
    retry: 1,
  })
}

export function useAdminOverview() {
  return useQuery<AdminOverview>({
    queryKey: ['admin', 'overview'],
    queryFn: async () => {
      const res = await adminApi.get('/overview')
      return res.data
    },
    refetchInterval: 15000,
  })
}

export function useAdminUsers() {
  return useQuery<AdminUser[]>({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const res = await adminApi.get('/users')
      return res.data
    },
    refetchInterval: 30000,
  })
}

export function useAdminQueue() {
  return useQuery<AdminQueue>({
    queryKey: ['admin', 'queue'],
    queryFn: async () => {
      const res = await adminApi.get('/queue')
      return res.data
    },
    refetchInterval: 60_000, // SSE events trigger immediate refetches; this is just a fallback
  })
}

export function useRetryFailed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await adminApi.post('/queue/retry-failed')
      return res.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] })
    },
  })
}

export function useClearFailed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await adminApi.delete('/queue/failed')
      return res.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] })
    },
  })
}

export function useDrainQueue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await adminApi.post('/queue/drain')
      return res.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] })
    },
  })
}

export function usePauseQueue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await adminApi.post('/queue/pause')
      return res.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] })
    },
  })
}

export function useResumeQueue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await adminApi.post('/queue/resume')
      return res.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] })
    },
  })
}

export function useRetryJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (jobId: string) => {
      const res = await adminApi.post(`/queue/jobs/${jobId}/retry`)
      return res.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] })
    },
  })
}

export function useRemoveJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (jobId: string) => {
      const res = await adminApi.delete(`/queue/jobs/${jobId}`)
      return res.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] })
    },
  })
}

export function useEnqueueJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, data }: { name: string; data: Record<string, unknown> }) => {
      const res = await adminApi.post('/queue/enqueue', { name, data })
      return res.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] })
    },
  })
}

export function useJobDetail(jobId: string | null) {
  return useQuery<QueueJob & { logs: string[] }>({
    queryKey: ['admin', 'queue', 'job', jobId],
    queryFn: async () => {
      const res = await adminApi.get(`/queue/jobs/${jobId}`)
      return res.data
    },
    enabled: !!jobId,
    refetchInterval: 3000,
  })
}

// ── Content Management ──────────────────────────────────────────────────────

export interface AdminStageContent {
  _id: string
  order: number
  theme: string
  emoji: string
  cefrLevel: string
  worldName: string
  lessonCount: number
  exerciseSetCount: number
}

export interface AdminExercise {
  id: string
  type: string
  question: string
  answer: string
  acceptedAnswers?: string[]
  wrongFeedback?: string
  correctFeedback?: string
  hint?: string
  explanation?: string
  options?: string[]
  passage?: string
}

export interface AdminLesson {
  _id: string
  title: string
  type: string
  orderInUnit: number
  estimatedMinutes: number
  isAiGenerated: boolean
  exerciseCount: number
  exercises: AdminExercise[]
}

export interface AdminExerciseSet {
  _id: string
  topic: string
  difficulty: string
  cefrLevel: string
  timesServed: number
  createdAt: string
  exerciseCount: number
  exercises: AdminExercise[]
}

export interface AdminStageDetail {
  stage: { _id: string; theme: string; emoji: string; cefrLevel: string }
  lessons: AdminLesson[]
  exerciseSets: AdminExerciseSet[]
}

export function useAdminContent() {
  return useQuery<AdminStageContent[]>({
    queryKey: ['admin', 'content'],
    queryFn: async () => {
      const res = await adminApi.get('/content')
      return res.data
    },
  })
}

export function useAdminStageContent(stageId: string | null) {
  return useQuery<AdminStageDetail>({
    queryKey: ['admin', 'content', 'stage', stageId],
    queryFn: async () => {
      const res = await adminApi.get(`/content/stages/${stageId}`)
      return res.data
    },
    enabled: !!stageId,
  })
}

export function useEditExercise(type: 'lesson' | 'exercise-set') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      parentId,
      exerciseId,
      patch,
    }: {
      parentId: string
      exerciseId: string
      patch: Partial<AdminExercise>
    }) => {
      const path =
        type === 'lesson'
          ? `/content/lessons/${parentId}/exercises/${exerciseId}`
          : `/content/exercise-sets/${parentId}/exercises/${exerciseId}`
      const res = await adminApi.patch(path, patch)
      return res.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'content'] })
    },
  })
}

export function useDeleteExercise(type: 'lesson' | 'exercise-set') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ parentId, exerciseId }: { parentId: string; exerciseId: string }) => {
      const path =
        type === 'lesson'
          ? `/content/lessons/${parentId}/exercises/${exerciseId}`
          : `/content/exercise-sets/${parentId}/exercises/${exerciseId}`
      await adminApi.delete(path)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'content'] })
    },
  })
}

export function useDeleteLesson() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (lessonId: string) => {
      await adminApi.delete(`/content/lessons/${lessonId}`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'content'] })
    },
  })
}

export function useDeleteExerciseSet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (setId: string) => {
      await adminApi.delete(`/content/exercise-sets/${setId}`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'content'] })
    },
  })
}

export function useWipeAllContent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await adminApi.delete('/content/all')
      return res.data as { deletedLessons: number; deletedExerciseSets: number }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'content'] })
    },
  })
}
