import type { UserDTO } from '@lernen/shared'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  user: UserDTO | null
  accessToken: string | null
  isAuthenticated: boolean
  setUser: (user: UserDTO) => void
  setAccessToken: (token: string) => void
  login: (user: UserDTO, token: string) => void
  logout: () => void
  updateUser: (updates: Partial<UserDTO>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setUser: (user) => set({ user }),

      setAccessToken: (token) => set({ accessToken: token }),

      login: (user, token) =>
        set({
          user,
          accessToken: token,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'lernen-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
