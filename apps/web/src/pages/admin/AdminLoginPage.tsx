import { useNavigate } from '@tanstack/react-router'
import { BookOpen, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { verifyAdminCredentials } from '../../lib/admin-api'
import { useAdminStore } from '../../stores/admin.store'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const login = useAdminStore((s) => s.login)
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsPending(true)
    try {
      await verifyAdminCredentials(form.username, form.password)
      login(form.username, form.password)
      navigate({ to: '/admin' })
    } catch {
      setError('Invalid credentials')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <BookOpen size={24} className="text-amber-400" />
          <span className="text-xl font-bold text-white">lernen</span>
          <span className="text-sm text-slate-500">/ admin</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <h1 className="text-xl font-bold text-white mb-1">Admin access</h1>
          <p className="text-slate-400 text-sm mb-6">Sign in with your admin credentials.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-username"
                className="block text-sm font-medium text-slate-300 mb-1.5"
              >
                Username
              </label>
              <input
                id="admin-username"
                type="text"
                required
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                placeholder="admin"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-sm font-medium text-slate-300 mb-1.5"
              >
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 outline-none focus:border-amber-400 transition-colors"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 bg-amber-400 text-slate-950 rounded-xl font-semibold hover:bg-amber-500 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
