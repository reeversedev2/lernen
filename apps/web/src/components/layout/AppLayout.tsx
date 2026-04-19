import { Link, useRouterState } from '@tanstack/react-router'
import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  RotateCcw,
  X,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { useAuth, useLogout } from '../../hooks/use-auth'
import { useSRSStats } from '../../hooks/use-srs'
import { cn } from '../../lib/utils'
import { StreakDisplay } from '../StreakDisplay'
import { XpDisplay } from '../XpDisplay'

interface AppLayoutProps {
  children: ReactNode
}

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/roadmap', label: 'Roadmap', icon: MapIcon },
  { to: '/review', label: 'Review', icon: RotateCcw },
  { to: '/progress', label: 'Progress', icon: BarChart3 },
]

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth()
  const { mutate: logout } = useLogout()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: srsStats } = useSRSStats()

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-slate-800">
        <Link
          to="/dashboard"
          className="flex items-center gap-2"
          onClick={() => setMobileOpen(false)}
        >
          <span className="text-2xl font-bold text-white">
            lern<span className="text-amber-400">en</span>
          </span>
          <span className="text-lg">🇩🇪</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = currentPath === to || currentPath.startsWith(`${to}/`)
          const showBadge = to === '/review' && srsStats && srsStats.dueToday > 0

          return (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 group',
                isActive
                  ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800',
              )}
            >
              <Icon size={20} className="shrink-0" />
              <span className="font-medium">{label}</span>
              {showBadge && (
                <span className="ml-auto bg-amber-400 text-slate-950 text-xs font-bold px-2 py-0.5 rounded-full">
                  {srsStats.dueToday}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      {user && (
        <div className="px-4 py-6 border-t border-slate-800 space-y-4">
          <div className="flex items-center gap-3 px-4">
            <div className="w-9 h-9 bg-amber-400/20 border border-amber-400/30 rounded-full flex items-center justify-center shrink-0">
              <span className="text-amber-400 font-bold text-sm">
                {user.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white text-sm truncate">{user.displayName}</p>
              <XpDisplay size="sm" />
            </div>
          </div>
          <div className="flex items-center justify-between px-4">
            <StreakDisplay count={user.streakCount} size="sm" />
            <button
              type="button"
              onClick={() => logout()}
              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
              title="Log out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-slate-900 border-r border-slate-800 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setMobileOpen(false)
              }
            }}
            aria-label="Close sidebar"
          />
          <aside className="relative w-72 flex flex-col bg-slate-900 border-r border-slate-800 z-10">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-4 border-b border-slate-800 bg-slate-900">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 text-slate-400 hover:text-white"
          >
            <Menu size={22} />
          </button>
          <Link to="/dashboard" className="text-xl font-bold text-white">
            lern<span className="text-amber-400">en</span>
          </Link>
          <div className="w-auto">
            <XpDisplay size="sm" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
