import type { ReactNode } from 'react'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">
            lern<span className="text-amber-400">en</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Master German, one word at a time.</p>
        </div>

        {children}
      </div>
    </div>
  )
}
