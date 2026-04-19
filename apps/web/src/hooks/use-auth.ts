import type { AuthResponse } from '@lernen/shared'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api, getErrorMessage } from '../lib/api'
import { useAuthStore } from '../stores/auth.store'

export function useAuth() {
  return useAuthStore()
}

export function useLogin() {
  const { login } = useAuthStore()

  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await api.post<AuthResponse>('/auth/login', data)
      return response.data
    },
    onSuccess: (data) => {
      login(data.user, data.accessToken)
      toast.success('Welcome back!')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })
}

export function useRegister() {
  const { login } = useAuthStore()

  return useMutation({
    mutationFn: async (data: { email: string; password: string; displayName: string }) => {
      const response = await api.post<AuthResponse>('/auth/register', data)
      return response.data
    },
    onSuccess: (data) => {
      login(data.user, data.accessToken)
      toast.success('Account created! Welcome to lernen.')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })
}

export function useLogout() {
  const { logout } = useAuthStore()

  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout')
    },
    onSuccess: () => {
      logout()
    },
    onError: () => {
      logout()
    },
  })
}
