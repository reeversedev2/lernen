import { EventEmitter } from 'node:events'

export type QueueEventType =
  | 'active'
  | 'completed'
  | 'failed'
  | 'stalled'
  | 'progress'
  | 'added'
  | 'ollama_start'
  | 'ollama_chunk'
  | 'ollama_done'

export interface QueueEvent {
  ts: number
  type: QueueEventType
  jobId: string
  jobName: string
  data: Record<string, unknown>
  // worker events
  durationMs?: number
  error?: string
  progress?: number
  // ollama streaming events
  model?: string
  prompt?: string
  chunk?: string // ollama_chunk: tokens so far (accumulated)
  tokenCount?: number // tokens generated so far
  tokensPerSec?: number // ollama_done
  promptTokens?: number // ollama_done
  totalTokens?: number // ollama_done
  totalMs?: number // ollama_done: wall-clock ms for the full generate
}

class QueueEventBus extends EventEmitter {}

export const queueEventBus = new QueueEventBus()
