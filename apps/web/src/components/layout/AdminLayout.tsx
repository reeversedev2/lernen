import { Link, useRouterState } from '@tanstack/react-router'
import {
  BookOpen,
  LayoutDashboard,
  Library,
  ListChecks,
  LogOut,
  Menu,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useAdminStore } from '../../stores/admin.store'

const NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { to: '/admin/users', label: 'Users', icon: Users, exact: false },
  { to: '/admin/queue', label: 'Queue', icon: ListChecks, exact: false },
  { to: '/admin/content', label: 'Content', icon: Library, exact: false },
] as const

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const logout = useAdminStore((s) => s.logout)
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navLinks = (
    <nav className="flex-1 py-4 px-3 space-y-1">
      {NAV.map(({ to, label, icon: Icon, exact }) => {
        const isActive = exact ? currentPath === to : currentPath.startsWith(to)
        return (
          <Link
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-amber-400/10 text-amber-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        )
      })}
    </nav>
  )

  const signOut = (
    <div className="p-3 border-t border-slate-800">
      <button
        type="button"
        onClick={logout}
        className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
      >
        <LogOut size={16} />
        Sign out
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 border-r border-slate-800 flex-col">
        <div className="px-5 py-5 border-b border-slate-800 flex items-center gap-2.5">
          <BookOpen size={20} className="text-amber-400" />
          <span className="font-semibold text-white">lernen</span>
          <span className="text-xs text-slate-500 ml-auto">admin</span>
        </div>
        {navLinks}
        {signOut}
      </aside>

      {/* Mobile: top bar + slide-in drawer */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 py-3 bg-slate-950 border-b border-slate-800">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 text-slate-400 hover:text-white transition-colors"
        >
          <Menu size={20} />
        </button>
        <BookOpen size={18} className="text-amber-400" />
        <span className="font-semibold text-white text-sm">lernen</span>
        <span className="text-xs text-slate-500 ml-auto">admin</span>
      </div>

      {/* Mobile drawer backdrop */}
      {sidebarOpen && (
        // biome-ignore lint/a11y/noStaticElementInteractions: backdrop overlay dismiss pattern
        <div
          role="presentation"
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setSidebarOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-64 bg-slate-950 border-r border-slate-800 flex flex-col transform transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-5 border-b border-slate-800 flex items-center gap-2.5">
          <BookOpen size={20} className="text-amber-400" />
          <span className="font-semibold text-white">lernen</span>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="ml-auto p-1 text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        {navLinks}
        {signOut}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto md:pt-0 pt-[52px]">{children}</main>
    </div>
  )
}
