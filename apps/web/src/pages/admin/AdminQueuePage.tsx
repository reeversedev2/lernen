import { useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  Eraser,
  Loader2,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Terminal,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import {
  type QueueJob,
  type QueueLiveEvent,
  useAdminQueue,
  useClearFailed,
  useDrainQueue,
  useEnqueueJob,
  useJobDetail,
  usePauseQueue,
  useQueueEvents,
  useRemoveJob,
  useResumeQueue,
  useRetryFailed,
  useRetryJob,
} from '../../hooks/use-admin'

type TabKey = 'active' | 'waiting' | 'delayed' | 'failed' | 'completed'

const TAB_CONFIG: Record<TabKey, { label: string; color: string; dotColor: string }> = {
  active: { label: 'Active', color: 'text-emerald-400', dotColor: 'bg-emerald-400' },
  waiting: { label: 'Waiting', color: 'text-sky-400', dotColor: 'bg-sky-400' },
  delayed: { label: 'Delayed', color: 'text-amber-400', dotColor: 'bg-amber-400' },
  failed: { label: 'Failed', color: 'text-red-400', dotColor: 'bg-red-400' },
  completed: { label: 'Completed', color: 'text-slate-400', dotColor: 'bg-slate-500' },
}

export function AdminQueuePage() {
  const { data, isLoading, error } = useAdminQueue()
  const { mutate: retryFailed, isPending: isRetrying } = useRetryFailed()
  const { mutate: clearFailed, isPending: isClearing } = useClearFailed()
  const { mutate: drainQueue, isPending: isDraining } = useDrainQueue()
  const { mutate: pauseQueue, isPending: isPausing } = usePauseQueue()
  const { mutate: resumeQueue, isPending: isResuming } = useResumeQueue()

  const [activeTab, setActiveTab] = useState<TabKey>('failed')
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null)
  const [showEnqueue, setShowEnqueue] = useState(false)
  const { events, connected, clear } = useQueueEvents()
  const queryClient = useQueryClient()

  // Invalidate queue snapshot whenever a worker-level state change arrives via SSE
  const lastEventRef = useRef<QueueLiveEvent | null>(null)
  useEffect(() => {
    const latest = events[0]
    if (!latest || latest === lastEventRef.current) return
    lastEventRef.current = latest
    const isWorkerEvent = ['active', 'completed', 'failed', 'stalled'].includes(latest.type)
    if (isWorkerEvent) {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] })
    }
  }, [events, queryClient])

  const isPaused = data?.isPaused ?? false
  const counts = data?.counts ?? {}

  const toggleExpand = (id: string) => setExpandedJobId((prev) => (prev === id ? null : id))

  return (
    <AdminLayout>
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">Queue</h1>
              {data && (
                <span
                  className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border ${
                    isPaused
                      ? 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                      : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`}
                  />
                  {isPaused ? 'Paused' : 'Running'}
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm mt-1">BullMQ · live via SSE</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {data && (
              <>
                <button
                  type="button"
                  onClick={() => (isPaused ? resumeQueue() : pauseQueue())}
                  disabled={isPausing || isResuming}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-40"
                >
                  {isPausing || isResuming ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : isPaused ? (
                    <Play size={14} />
                  ) : (
                    <Pause size={14} />
                  )}
                  {isPaused ? 'Resume' : 'Pause'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowEnqueue(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
                >
                  <Plus size={14} />
                  Enqueue
                </button>

                {(counts.failed ?? 0) > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => retryFailed()}
                      disabled={isRetrying}
                      className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-40"
                    >
                      {isRetrying ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RefreshCw size={14} />
                      )}
                      Retry all
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Delete all failed jobs?')) clearFailed()
                      }}
                      disabled={isClearing}
                      className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-40"
                    >
                      {isClearing ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      Clear failed
                    </button>
                  </>
                )}

                {(counts.waiting ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Drain all waiting jobs?')) drainQueue()
                    }}
                    disabled={isDraining}
                    className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-40"
                  >
                    {isDraining ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    Drain waiting
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={32} className="animate-spin text-amber-400" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <AlertCircle size={18} />
            Failed to load queue
          </div>
        )}

        {data && (
          <>
            {/* Tab bar */}
            <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 overflow-x-auto">
              {(Object.keys(TAB_CONFIG) as TabKey[]).map((tab) => {
                const cfg = TAB_CONFIG[tab]
                const count = counts[tab] ?? 0
                const isActive = activeTab === tab
                return (
                  <button
                    type="button"
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <span>{cfg.label}</span>
                    {count > 0 && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                          isActive ? `${cfg.color} bg-current/10` : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Job list */}
            <JobList
              tab={activeTab}
              jobs={data.jobs[activeTab]}
              expandedJobId={expandedJobId}
              onToggle={toggleExpand}
            />
          </>
        )}

        {/* Ollama monitor + event log */}
        <OllamaMonitor events={events} connected={connected} />
        <LiveEventLog events={events} connected={connected} onClear={clear} />
      </div>

      {showEnqueue && <EnqueueModal onClose={() => setShowEnqueue(false)} />}
    </AdminLayout>
  )
}

// ── Job List ──────────────────────────────────────────────────────────────────

function JobList({
  tab,
  jobs,
  expandedJobId,
  onToggle,
}: {
  tab: TabKey
  jobs: QueueJob[]
  expandedJobId: string | null
  onToggle: (id: string) => void
}) {
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-600">
        <CheckCircle size={28} className="mb-3 opacity-40" />
        <p className="text-sm">No {TAB_CONFIG[tab].label.toLowerCase()} jobs</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {jobs.map((job) => (
        <JobRow
          key={job.id}
          job={job}
          tab={tab}
          isExpanded={expandedJobId === job.id}
          onToggle={() => onToggle(job.id)}
        />
      ))}
      {jobs.length >= 20 && (
        <p className="text-xs text-slate-600 text-center pt-2">
          Showing first {jobs.length} — use filters or API for more
        </p>
      )}
    </div>
  )
}

// ── Job Row ───────────────────────────────────────────────────────────────────

function JobRow({
  job,
  tab,
  isExpanded,
  onToggle,
}: {
  job: QueueJob
  tab: TabKey
  isExpanded: boolean
  onToggle: () => void
}) {
  const { mutate: retryJob, isPending: isRetrying } = useRetryJob()
  const { mutate: removeJob, isPending: isRemoving } = useRemoveJob()

  const when = (() => {
    if (tab === 'active' && job.processedOn) return `started ${relativeTime(job.processedOn)}`
    if (tab === 'completed' && job.finishedOn) {
      const dur =
        job.finishedOn && job.processedOn
          ? `${((job.finishedOn - job.processedOn) / 1000).toFixed(1)}s`
          : ''
      return `${relativeTime(job.finishedOn)}${dur ? ` · ${dur}` : ''}`
    }
    if (tab === 'failed' && job.finishedOn) return `failed ${relativeTime(job.finishedOn)}`
    if (tab === 'delayed' && job.delay) return `delayed ${(job.delay / 1000).toFixed(0)}s`
    return relativeTime(job.timestamp)
  })()

  return (
    <div
      className={`rounded-xl border transition-colors ${
        isExpanded
          ? 'bg-slate-900 border-slate-700'
          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Row header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer select-none"
          onClick={onToggle}
        >
          <span
            className={`text-slate-500 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>

          {/* Status dot */}
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${TAB_CONFIG[tab].dotColor} ${tab === 'active' ? 'animate-pulse' : ''}`}
          />

          {/* Name */}
          <span className="font-mono text-xs text-white font-medium flex-shrink-0">{job.name}</span>

          {/* Job data preview */}
          <span className="text-slate-500 font-mono text-xs truncate flex-1 min-w-0">
            {JSON.stringify(job.data)}
          </span>

          {/* Attempts badge for failed */}
          {tab === 'failed' && (
            <span className="text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full flex-shrink-0">
              {job.attemptsMade} attempt{job.attemptsMade !== 1 ? 's' : ''}
            </span>
          )}

          {/* Timestamp */}
          <span className="text-xs text-slate-600 flex-shrink-0">{when}</span>
        </button>

        {/* Per-job actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {(tab === 'failed' || tab === 'completed') && (
            <ActionButton onClick={() => retryJob(job.id)} disabled={isRetrying} title="Retry">
              {isRetrying ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={13} />
              )}
            </ActionButton>
          )}
          <ActionButton
            onClick={() => {
              if (confirm(`Remove job ${job.id}?`)) removeJob(job.id)
            }}
            disabled={isRemoving}
            title="Remove"
            danger
          >
            {isRemoving ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
          </ActionButton>
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && <JobDetail job={job} tab={tab} />}
    </div>
  )
}

// ── Job Detail ────────────────────────────────────────────────────────────────

function JobDetail({ job, tab }: { job: QueueJob; tab: TabKey }) {
  const { data: detail } = useJobDetail(job.id)
  const [copiedData, setCopiedData] = useState(false)

  const copyData = () => {
    void navigator.clipboard.writeText(JSON.stringify(detail ?? job, null, 2))
    setCopiedData(true)
    setTimeout(() => setCopiedData(false), 1500)
  }

  return (
    <div className="border-t border-slate-800 px-4 pb-4 pt-3 space-y-4">
      {/* Meta row */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500 font-mono">
        <span>
          id: <span className="text-slate-300">{job.id}</span>
        </span>
        {job.timestamp && (
          <span>
            queued:{' '}
            <span className="text-slate-300">{new Date(job.timestamp).toLocaleString()}</span>
          </span>
        )}
        {job.processedOn && (
          <span>
            started:{' '}
            <span className="text-slate-300">{new Date(job.processedOn).toLocaleString()}</span>
          </span>
        )}
        {job.finishedOn && (
          <span>
            finished:{' '}
            <span className="text-slate-300">{new Date(job.finishedOn).toLocaleString()}</span>
          </span>
        )}
        {job.finishedOn && job.processedOn && (
          <span>
            duration:{' '}
            <span className="text-slate-300">
              {((job.finishedOn - job.processedOn) / 1000).toFixed(2)}s
            </span>
          </span>
        )}
      </div>

      {/* Job data */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Input data</p>
          <button
            type="button"
            onClick={copyData}
            className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            {copiedData ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copiedData ? 'Copied' : 'Copy'}
          </button>
        </div>
        <CodeBlock value={JSON.stringify(job.data, null, 2)} />
      </div>

      {/* Return value */}
      {tab === 'completed' && job.returnvalue != null && (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
            Return value
          </p>
          <CodeBlock value={JSON.stringify(job.returnvalue, null, 2)} />
        </div>
      )}

      {/* Error */}
      {tab === 'failed' && job.failedReason && (
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle size={12} className="text-red-400" />
            <p className="text-xs font-medium text-red-400 uppercase tracking-wide">Error</p>
          </div>
          <div className="bg-red-950/40 border border-red-500/20 rounded-lg p-3 font-mono text-xs text-red-300 whitespace-pre-wrap break-all">
            {job.failedReason}
          </div>
        </div>
      )}

      {/* Stack trace */}
      {tab === 'failed' && job.stacktrace.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Terminal size={12} className="text-slate-500" />
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Stack trace
            </p>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-400 whitespace-pre-wrap break-all max-h-64 overflow-y-auto">
            {job.stacktrace.join('\n')}
          </div>
        </div>
      )}

      {/* Logs */}
      {detail?.logs && detail.logs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Terminal size={12} className="text-slate-500" />
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Job logs</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-400 space-y-0.5 max-h-48 overflow-y-auto">
            {detail.logs.map((line, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-slate-700 select-none">{String(i + 1).padStart(3)}</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Opts */}
      {job.opts && (
        <details className="group">
          <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-400 transition-colors flex items-center gap-1">
            <ArrowRight size={11} className="group-open:rotate-90 transition-transform" />
            Job options
          </summary>
          <div className="mt-2">
            <CodeBlock value={JSON.stringify(job.opts, null, 2)} />
          </div>
        </details>
      )}
    </div>
  )
}

// ── Ollama Monitor ────────────────────────────────────────────────────────────

function OllamaMonitor({ events, connected }: { events: QueueLiveEvent[]; connected: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // latest generation state derived from events
  const lastStart = events.find((e) => e.type === 'ollama_start')
  const lastChunk = events.find((e) => e.type === 'ollama_chunk' || e.type === 'ollama_done')
  const lastDone = events.find((e) => e.type === 'ollama_done')

  // If done jobId matches start jobId it's the same run; otherwise still generating
  const isGenerating =
    connected &&
    lastStart != null &&
    (lastDone == null ||
      lastDone.jobId !== lastStart.jobId ||
      (lastChunk?.jobId === lastStart.jobId && lastChunk.type !== 'ollama_done'))

  const activeChunk = events.find(
    (e) => (e.type === 'ollama_chunk' || e.type === 'ollama_done') && e.jobId === lastStart?.jobId,
  )

  // Scroll to bottom of streaming text
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  if (!lastStart && !lastDone) {
    return (
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div
            className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`}
          />
          <h2 className="text-xs font-semibold text-white uppercase tracking-widest">Ollama</h2>
          <span className="text-xs text-slate-600">
            · {connected ? 'listening' : 'disconnected'}
          </span>
        </div>
        <p className="text-slate-700 text-sm text-center py-8">No generation activity yet — idle</p>
      </div>
    )
  }

  const completedEvent = lastDone?.jobId === lastStart?.jobId ? lastDone : null

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-amber-400 animate-pulse' : completedEvent ? 'bg-emerald-400' : 'bg-slate-600'}`}
          />
          <h2 className="text-xs font-semibold text-white uppercase tracking-widest">Ollama</h2>
          {lastStart && (
            <span className="text-xs text-slate-500 font-mono">
              {lastStart.jobName} · job #{lastStart.jobId}
            </span>
          )}
          {isGenerating && lastChunk && (
            <span className="text-xs text-amber-400 font-mono tabular-nums">
              {lastChunk.tokenCount ?? 0} tokens
            </span>
          )}
        </div>
        {completedEvent && (
          <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
            <span>
              <span className="text-emerald-400">{completedEvent.tokensPerSec}</span> tok/s
            </span>
            <span>
              <span className="text-white">{completedEvent.totalTokens}</span> tokens
            </span>
            <span>
              <span className="text-slate-300">
                {((completedEvent.totalMs ?? 0) / 1000).toFixed(1)}s
              </span>{' '}
              total
            </span>
            <span className="text-slate-600">{completedEvent.promptTokens} prompt</span>
          </div>
        )}
      </div>

      {/* Two-column: prompt + streaming output */}
      <div className="grid grid-cols-2 divide-x divide-slate-800">
        {/* Prompt */}
        <div>
          <p className="px-4 pt-3 pb-1 text-xs font-medium text-slate-600 uppercase tracking-wide">
            Prompt sent
          </p>
          <pre className="px-4 pb-4 text-xs text-slate-500 whitespace-pre-wrap break-words h-56 overflow-y-auto font-mono leading-relaxed">
            {lastStart?.prompt ?? '—'}
          </pre>
        </div>

        {/* Streaming output */}
        <div>
          <p className="px-4 pt-3 pb-1 text-xs font-medium text-slate-600 uppercase tracking-wide">
            {isGenerating ? 'Generating…' : 'Output'}
          </p>
          <div
            ref={scrollRef}
            className="px-4 pb-4 text-xs text-slate-300 whitespace-pre-wrap break-words h-56 overflow-y-auto font-mono leading-relaxed"
          >
            {activeChunk?.chunk ?? <span className="text-slate-700">waiting for first token…</span>}
            {isGenerating && (
              <span className="inline-block w-1.5 h-3 bg-amber-400 ml-0.5 animate-pulse align-middle" />
            )}
          </div>
        </div>
      </div>

      {/* Stats bar — shown after completion */}
      {completedEvent && (
        <div className="border-t border-slate-800 px-4 py-2 flex items-center gap-6 text-xs font-mono">
          <span className="text-slate-600">
            model: <span className="text-slate-400">{completedEvent.model}</span>
          </span>
          <span className="text-slate-600">
            output: <span className="text-emerald-400">{completedEvent.tokenCount} tokens</span>
          </span>
          <span className="text-slate-600">
            speed: <span className="text-amber-400">{completedEvent.tokensPerSec} tok/s</span>
          </span>
          <span className="text-slate-600">
            total time:{' '}
            <span className="text-white">{((completedEvent.totalMs ?? 0) / 1000).toFixed(2)}s</span>
          </span>
          <span className="text-slate-600">
            prompt tokens: <span className="text-slate-400">{completedEvent.promptTokens}</span>
          </span>
        </div>
      )}
    </div>
  )
}

// ── Live Event Log ────────────────────────────────────────────────────────────

const EVENT_STYLES: Partial<
  Record<QueueLiveEvent['type'], { dot: string; label: string; text: string }>
> = {
  active: { dot: 'bg-amber-400 animate-pulse', label: 'ACTIVE', text: 'text-amber-400' },
  completed: { dot: 'bg-emerald-400', label: 'DONE', text: 'text-emerald-400' },
  failed: { dot: 'bg-red-500', label: 'FAILED', text: 'text-red-400' },
  stalled: { dot: 'bg-orange-500', label: 'STALLED', text: 'text-orange-400' },
  progress: { dot: 'bg-sky-400', label: 'PROGRESS', text: 'text-sky-400' },
  added: { dot: 'bg-slate-500', label: 'ADDED', text: 'text-slate-400' },
  ollama_start: { dot: 'bg-violet-400 animate-pulse', label: 'LLM START', text: 'text-violet-400' },
  ollama_chunk: { dot: 'bg-violet-500 animate-pulse', label: 'TOKEN', text: 'text-violet-500' },
  ollama_done: { dot: 'bg-violet-300', label: 'LLM DONE', text: 'text-violet-300' },
}

function LiveEventLog({
  events,
  connected,
  onClear,
}: {
  events: QueueLiveEvent[]
  connected: boolean
  onClear: () => void
}) {
  const filteredEvents = events

  const scrollRef = useRef<HTMLDivElement>(null)
  const [pinned, setPinned] = useState(true)

  useEffect(() => {
    if (pinned && scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [pinned])

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Radio size={14} className={connected ? 'text-emerald-400' : 'text-slate-600'} />
          <span className="text-xs font-semibold text-white">Live events</span>
          <span
            className={`flex items-center gap-1 text-xs ${connected ? 'text-emerald-400' : 'text-slate-600'}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}
            />
            {connected ? 'connected' : 'disconnected'}
          </span>
          {filteredEvents.length > 0 && (
            <span className="text-xs text-slate-600">{filteredEvents.length} events</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="w-3 h-3 accent-amber-500"
            />
            Auto-scroll
          </label>
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            <Eraser size={12} />
            Clear
          </button>
        </div>
      </div>

      {/* Log body */}
      <div ref={scrollRef} className="h-72 overflow-y-auto font-mono text-xs">
        {filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-700">
            {connected ? 'Waiting for events…' : 'Connecting…'}
          </div>
        ) : (
          <table className="w-full">
            <tbody>
              {filteredEvents.map((ev, i) => {
                const style = EVENT_STYLES[ev.type]
                if (!style) return null
                const time = new Date(ev.ts).toLocaleTimeString('en-GB', { hour12: false })
                const summary = (() => {
                  if (ev.type === 'completed' && ev.durationMs != null)
                    return `${(ev.durationMs / 1000).toFixed(2)}s · ${JSON.stringify(ev.data)}`
                  if (ev.type === 'failed') return ev.error ?? 'unknown error'
                  if (ev.type === 'progress' && ev.progress != null)
                    return `${ev.progress}% · ${JSON.stringify(ev.data)}`
                  if (ev.type === 'ollama_start')
                    return `model: ${ev.model} · ${JSON.stringify(ev.data)}`
                  if (ev.type === 'ollama_chunk')
                    return `${ev.tokenCount} tokens · ${(ev.chunk ?? '').slice(-120).replace(/\n/g, '↵')}`
                  if (ev.type === 'ollama_done')
                    return `${ev.tokensPerSec} tok/s · ${ev.totalTokens} tokens · ${((ev.totalMs ?? 0) / 1000).toFixed(1)}s`
                  return JSON.stringify(ev.data)
                })()

                return (
                  <tr
                    key={i}
                    className="border-b border-slate-900 hover:bg-slate-900/50 transition-colors"
                  >
                    <td className="px-3 py-1.5 text-slate-600 whitespace-nowrap w-20">{time}</td>
                    <td className="px-2 py-1.5 w-6">
                      <span className={`block w-2 h-2 rounded-full ${style.dot}`} />
                    </td>
                    <td className={`px-2 py-1.5 whitespace-nowrap w-24 font-bold ${style.text}`}>
                      {style.label}
                    </td>
                    <td className="px-2 py-1.5 text-slate-300 whitespace-nowrap w-48 truncate">
                      {ev.jobName}
                    </td>
                    <td className="px-2 py-1.5 text-slate-500 truncate max-w-0 w-full">
                      {summary}
                    </td>
                    <td className="px-3 py-1.5 text-slate-700 whitespace-nowrap text-right w-24">
                      #{ev.jobId}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Enqueue Modal ─────────────────────────────────────────────────────────────

const KNOWN_JOBS = [
  'generate-exercise-set',
  'generate-stage-lesson',
  'fill-all-stages',
  'generate-session',
]

function EnqueueModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('fill-all-stages')
  const [dataText, setDataText] = useState('{}')
  const [dataError, setDataError] = useState('')
  const { mutate: enqueue, isPending, isSuccess } = useEnqueueJob()

  const handleSubmit = () => {
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(dataText)
    } catch {
      setDataError('Invalid JSON')
      return
    }
    setDataError('')
    enqueue({ name, data: parsed }, { onSuccess: () => setTimeout(onClose, 600) })
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-white">Enqueue job</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label
              htmlFor="enqueue-job-name"
              className="text-xs text-slate-500 font-medium block mb-1.5"
            >
              Job name
            </label>
            <input
              id="enqueue-job-name"
              list="job-names"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
              placeholder="job-name"
            />
            <datalist id="job-names">
              {KNOWN_JOBS.map((j) => (
                <option key={j} value={j} />
              ))}
            </datalist>
          </div>

          <div>
            <label
              htmlFor="enqueue-job-data"
              className="text-xs text-slate-500 font-medium block mb-1.5"
            >
              Data (JSON)
            </label>
            <textarea
              id="enqueue-job-data"
              value={dataText}
              onChange={(e) => {
                setDataText(e.target.value)
                setDataError('')
              }}
              rows={6}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500 resize-none"
            />
            {dataError && <p className="text-xs text-red-400 mt-1">{dataError}</p>}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || isSuccess}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-slate-900 rounded-xl text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : isSuccess ? (
                <Check size={14} />
              ) : (
                <Zap size={14} />
              )}
              {isSuccess ? 'Queued!' : 'Enqueue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function CodeBlock({ value }: { value: string }) {
  return (
    <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
      {value}
    </pre>
  )
}

function ActionButton({
  onClick,
  disabled,
  title,
  danger,
  children,
}: {
  onClick: () => void
  disabled: boolean
  title: string
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
        danger
          ? 'text-red-500 hover:bg-red-500/10'
          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  )
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`
  return new Date(ts).toLocaleDateString()
}
