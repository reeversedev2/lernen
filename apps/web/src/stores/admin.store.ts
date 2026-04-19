import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AdminState {
  credentials: string | null // base64 encoded "username:password"
  isAuthenticated: boolean
  login: (username: string, password: string) => void
  logout: () => void
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      credentials: null,
      isAuthenticated: false,

      login: (username, password) => {
        const credentials = btoa(`${username}:${password}`)
        set({ credentials, isAuthenticated: true })
      },

      logout: () => set({ credentials: null, isAuthenticated: false }),
    }),
    {
      name: 'lernen-admin',
      storage: {
        getItem: (name) => {
          const val = sessionStorage.getItem(name)
          return val ? JSON.parse(val) : null
        },
        setItem: (name, value) => sessionStorage.setItem(name, JSON.stringify(value)),
        removeItem: (name) => sessionStorage.removeItem(name),
      },
    },
  ),
)
