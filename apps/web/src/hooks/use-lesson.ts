import type { DashboardResponse, LessonCompleteResponse, LessonDTO } from '@lernen/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api, getErrorMessage } from '../lib/api'

export function useLesson(id: string) {
  return useQuery({
    queryKey: ['lesson', id],
    queryFn: async () => {
      const response = await api.get<LessonDTO>(`/lessons/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useStartLesson() {
  return useMutation({
    mutationFn: async (lessonId: string) => {
      await api.post(`/lessons/${lessonId}/start`)
    },
  })
}

export function useCompleteLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      lessonId: string
      answers: Array<{ exerciseId: string; answer: string; timeSpentMs: number }>
    }) => {
      const response = await api.post<LessonCompleteResponse>(
        `/lessons/${data.lessonId}/complete`,
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
        toast.success(`Lesson complete! +${data.xpEarned} XP`, { icon: '🎉' })
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['curriculum'] })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })
}
