import { AlertCircle, ChevronDown, ChevronUp, Loader2, Search } from 'lucide-react'
import { useState } from 'react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { type AdminUser, useAdminUsers } from '../../hooks/use-admin'

type SortKey = keyof Pick<
  AdminUser,
  'displayName' | 'totalXp' | 'streakCount' | 'lessonsCompleted' | 'lastActive' | 'joinedAt'
>

export function AdminUsersPage() {
  const { data, isLoading, error } = useAdminUsers()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('totalXp')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const filtered = (data ?? [])
    .filter((u) => {
      const q = search.toLowerCase()
      return u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })

  return (
    <AdminLayout>
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Users</h1>
            <p className="text-slate-400 text-sm mt-1">
              {data ? `${data.length} registered` : 'Loading...'}
            </p>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:border-amber-400 transition-colors w-full sm:w-72"
            />
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
            Failed to load users
          </div>
        )}

        {data && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <Th
                      label="Name"
                      sortKey="displayName"
                      current={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Email</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Level</th>
                    <Th
                      label="XP"
                      sortKey="totalXp"
                      current={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <Th
                      label="Streak"
                      sortKey="streakCount"
                      current={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <Th
                      label="Lessons done"
                      sortKey="lessonsCompleted"
                      current={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <Th
                      label="Last active"
                      sortKey="lastActive"
                      current={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                    <Th
                      label="Joined"
                      sortKey="joinedAt"
                      current={sortKey}
                      dir={sortDir}
                      onSort={toggleSort}
                    />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-white font-medium">{user.displayName}</td>
                      <td className="px-4 py-3 text-slate-400">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-400/10 text-amber-400">
                          {user.cefrLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white font-mono">
                        {user.totalXp.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-white">{user.streakCount}🔥</td>
                      <td className="px-4 py-3 text-slate-300">{user.lessonsCompleted}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{user.lastActive ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

function Th({
  label,
  sortKey,
  current,
  dir,
  onSort,
}: {
  label: string
  sortKey: SortKey
  current: SortKey
  dir: 'asc' | 'desc'
  onSort: (k: SortKey) => void
}) {
  const active = current === sortKey
  return (
    <th className="text-left px-4 py-3 text-slate-500 font-medium">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 hover:text-white transition-colors"
      >
        {label}
        {active ? (
          dir === 'asc' ? (
            <ChevronUp size={14} className="text-amber-400" />
          ) : (
            <ChevronDown size={14} className="text-amber-400" />
          )
        ) : (
          <ChevronDown size={14} className="opacity-30" />
        )}
      </button>
    </th>
  )
}
