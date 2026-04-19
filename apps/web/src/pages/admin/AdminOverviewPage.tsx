import {
  Activity,
  AlertCircle,
  BookOpen,
  CheckCircle,
  Clock,
  Cpu,
  HardDrive,
  Loader2,
  MemoryStick,
  Sparkles,
  Thermometer,
  Users,
} from 'lucide-react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { type AdminSystem, useAdminOverview, useAdminSystem } from '../../hooks/use-admin'

export function AdminOverviewPage() {
  const { data, isLoading, error } = useAdminOverview()
  const { data: sys, isLoading: sysLoading, isError: sysError } = useAdminSystem()

  return (
    <AdminLayout>
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          <p className="text-slate-400 text-sm mt-1">Platform health at a glance</p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={32} className="animate-spin text-amber-400" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <AlertCircle size={18} />
            Failed to load overview
          </div>
        )}

        {data && (
          <>
            {/* Users */}
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
                Users
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                <StatCard
                  label="Total users"
                  value={data.users.total.toLocaleString()}
                  icon={<Users size={18} className="text-blue-400" />}
                />
                <StatCard
                  label="Active today"
                  value={data.users.activeToday.toLocaleString()}
                  icon={<Activity size={18} className="text-emerald-400" />}
                  sub="with a session"
                />
              </div>
            </section>

            {/* Content */}
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
                Content
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  label="Total lessons"
                  value={data.content.totalLessons.toLocaleString()}
                  icon={<BookOpen size={18} className="text-amber-400" />}
                />
                <StatCard
                  label="AI-generated lessons"
                  value={data.content.aiGeneratedLessons.toLocaleString()}
                  icon={<Sparkles size={18} className="text-amber-400" />}
                  sub={`${Math.round((data.content.aiGeneratedLessons / Math.max(data.content.totalLessons, 1)) * 100)}% of total`}
                />
                <StatCard
                  label="Pending sessions"
                  value={data.content.pendingPracticeSessions.toLocaleString()}
                  icon={<CheckCircle size={18} className="text-emerald-400" />}
                  sub="ready to serve"
                />
              </div>
            </section>

            {/* Queue */}
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
                Queue
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                {(['waiting', 'active', 'delayed', 'completed', 'failed'] as const).map((state) => (
                  <StatCard
                    key={state}
                    label={state}
                    value={(data.queue.counts[state] ?? 0).toLocaleString()}
                    icon={
                      <Clock
                        size={18}
                        className={
                          state === 'failed'
                            ? 'text-red-400'
                            : state === 'active'
                              ? 'text-emerald-400'
                              : 'text-slate-400'
                        }
                      />
                    }
                  />
                ))}
              </div>
            </section>

            {/* Recent failures */}
            {data.queue.recentFailed.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
                  Recent failures
                </h2>
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="text-left px-4 py-3 text-slate-500 font-medium">Job</th>
                        <th className="text-left px-4 py-3 text-slate-500 font-medium">Error</th>
                        <th className="text-left px-4 py-3 text-slate-500 font-medium">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.queue.recentFailed.map((job) => (
                        <tr key={job.id} className="border-b border-slate-800 last:border-0">
                          <td className="px-4 py-3 text-white font-mono text-xs">{job.name}</td>
                          <td className="px-4 py-3 text-red-400 font-mono text-xs truncate max-w-xs">
                            {job.error}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                            {job.failedAt ? new Date(job.failedAt).toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        {/* Server */}
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
            Server
            {sys && (
              <span className="ml-2 normal-case text-slate-600 font-normal tracking-normal">
                {sys.system.hostname} · {sys.system.platform}/{sys.system.arch} · up{' '}
                {sys.system.uptimeFormatted}
              </span>
            )}
          </h2>
          {sys ? (
            <ServerMetrics sys={sys} />
          ) : sysLoading ? (
            <div className="flex items-center gap-2 text-slate-600 text-sm">
              <Loader2 size={14} className="animate-spin" /> Loading metrics…
            </div>
          ) : sysError ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <AlertCircle size={14} className="text-slate-600" />
              Server metrics unavailable — rebuild the container to enable this endpoint.
            </div>
          ) : null}
        </section>
      </div>
    </AdminLayout>
  )
}

// ── Server Metrics ────────────────────────────────────────────────────────────

function ServerMetrics({ sys }: { sys: AdminSystem }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left col: arc gauges */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex gap-8 items-center justify-around">
        <ArcGauge
          value={sys.cpu.usagePercent}
          max={100}
          label="CPU"
          unit="%"
          icon={<Cpu size={14} />}
          thresholds={{ warn: 60, danger: 85 }}
        />
        {sys.cpu.temperatureCelsius !== null ? (
          <ArcGauge
            value={sys.cpu.temperatureCelsius}
            max={90}
            label="Temp"
            unit="°C"
            icon={<Thermometer size={14} />}
            thresholds={{ warn: 55, danger: 70 }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-600">
            <Thermometer size={22} />
            <span className="text-xs">No sensor</span>
          </div>
        )}
      </div>

      {/* Right col: bars + load */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
        <BarMetric
          label="Memory"
          used={sys.memory.usedGb}
          total={sys.memory.totalGb}
          percent={sys.memory.percent}
          icon={<MemoryStick size={14} className="text-sky-400" />}
          color="bg-sky-500"
        />
        {sys.disk && (
          <BarMetric
            label="Disk"
            used={sys.disk.usedGb}
            total={sys.disk.totalGb}
            percent={sys.disk.percent}
            icon={<HardDrive size={14} className="text-violet-400" />}
            color="bg-violet-500"
          />
        )}
        <div>
          <p className="text-xs text-slate-500 mb-2">Load average</p>
          <div className="flex gap-3">
            {(['1m', '5m', '15m'] as const).map((k) => (
              <div key={k} className="flex-1 bg-slate-800 rounded-lg px-3 py-2 text-center">
                <p className="text-base font-bold text-white tabular-nums">{sys.cpu.loadAvg[k]}</p>
                <p className="text-xs text-slate-500">{k}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-600 truncate">
          {sys.cpu.cores} cores · {sys.cpu.model.split('@')[0].trim()}
        </p>
      </div>
    </div>
  )
}

// ── Arc Gauge ─────────────────────────────────────────────────────────────────

function ArcGauge({
  value,
  max,
  label,
  unit,
  icon,
  thresholds,
}: {
  value: number
  max: number
  label: string
  unit: string
  icon: React.ReactNode
  thresholds: { warn: number; danger: number }
}) {
  const pct = Math.min(value / max, 1)

  const color =
    value >= thresholds.danger
      ? '#ef4444' // red-500
      : value >= thresholds.warn
        ? '#f59e0b' // amber-400
        : '#10b981' // emerald-500

  // SVG arc: 200° sweep from 190° to 350° (bottom-left to bottom-right)
  const R = 40
  const cx = 56
  const cy = 60
  const startAngle = 200
  const sweepTotal = 140
  const sweepFill = sweepTotal * pct

  const toXY = (deg: number) => {
    const rad = (deg * Math.PI) / 180
    return { x: cx + R * Math.cos(rad), y: cy + R * Math.sin(rad) }
  }

  const startPt = toXY(startAngle)
  const endFull = toXY(startAngle + sweepTotal)
  const endFill = toXY(startAngle + sweepFill)

  const arcPath = (end: { x: number; y: number }, _sweep: number, large: boolean) =>
    `M ${startPt.x.toFixed(1)} ${startPt.y.toFixed(1)} A ${R} ${R} 0 ${large ? 1 : 0} 1 ${end.x.toFixed(1)} ${end.y.toFixed(1)}`

  const bgLarge = sweepTotal > 180
  const fillLarge = sweepFill > 180

  return (
    <div className="flex flex-col items-center gap-1">
      {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative progress arc */}
      <svg width={112} height={80} viewBox="0 0 112 80">
        {/* Track */}
        <path
          d={arcPath(endFull, sweepTotal, bgLarge)}
          fill="none"
          stroke="#1e293b"
          strokeWidth={10}
          strokeLinecap="round"
        />
        {/* Fill */}
        {pct > 0 && (
          <path
            d={arcPath(endFill, sweepFill, fillLarge)}
            fill="none"
            stroke={color}
            strokeWidth={10}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
          />
        )}
        {/* Value text */}
        <text
          x={cx}
          y={cy + 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={14}
          fontWeight="bold"
        >
          {Math.round(value)}
          {unit}
        </text>
      </svg>
      <div className="flex items-center gap-1 text-slate-400 text-xs">
        {icon}
        <span>{label}</span>
      </div>
    </div>
  )
}

// ── Bar Metric ────────────────────────────────────────────────────────────────

function BarMetric({
  label,
  used,
  total,
  percent,
  icon,
  color,
}: {
  label: string
  used: number
  total: number
  percent: number
  icon: React.ReactNode
  color: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          {icon}
          <span>{label}</span>
        </div>
        <span className="text-xs text-slate-400 tabular-nums">
          {used} / {total} GB
        </span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-slate-600 mt-1">{percent}% used</p>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string
  value: string
  sub?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}
