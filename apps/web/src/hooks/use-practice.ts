import type {
  CompleteSessionResponse,
  DashboardResponse,
  GenerateExercisesResponse,
  OllamaStatusResponse,
} from '@lernen/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api, getErrorMessage } from '../lib/api'

export function useOllamaStatus() {
  return useQuery({
    queryKey: ['ollama-status'],
    queryFn: async () => {
      const response = await api.get<OllamaStatusResponse>('/exercises/status')
      return response.data
    },
    refetchInterval: (query) => {
      const data = query.state.data
      // Stop polling once model is ready AND a session is pre-generated
      if (data?.ollamaStatus === 'ready' && data?.sessionStatus === 'pending') return false
      return 5000
    },
    staleTime: 0,
  })
}

export function useGenerateExercises() {
  return useMutation({
    mutationFn: async () => {
      const response = await api.post<GenerateExercisesResponse>('/exercises/generate')
      return response.data.session
    },
  })
}

export function useCompleteSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      sessionId: string
      answers: Array<{ exerciseId: string; answer: string; timeSpentMs: number }>
    }) => {
      const response = await api.post<CompleteSessionResponse>(
        `/exercises/${data.sessionId}/complete`,
        {
          answers: data.answers,
        },
      )
      return response.data
    },
    onSuccess: (data) => {
      if (data.xpEarned > 0) {
        queryClient.setQueryData<DashboardResponse>(['dashboard'], (old) => {
          if (!old) return old
          return { ...old, user: { ...old.user, totalXp: old.user.totalXp + data.xpEarned } }
        })
        toast.success(`Practice complete! +${data.xpEarned} XP`, { icon: '🤖' })
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })
}
