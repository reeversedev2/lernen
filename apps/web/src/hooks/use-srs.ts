import type { ReviewResponse, SRSCardDTO, SRSStatsResponse } from '@lernen/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api, getErrorMessage } from '../lib/api'
import { useAuthStore } from '../stores/auth.store'

export function useDueCards(limit = 20) {
  return useQuery({
    queryKey: ['srs', 'due', limit],
    queryFn: async () => {
      const response = await api.get<SRSCardDTO[]>(`/srs/due?limit=${limit}`)
      return response.data
    },
  })
}

export function useSRSStats() {
  return useQuery({
    queryKey: ['srs', 'stats'],
    queryFn: async () => {
      const response = await api.get<SRSStatsResponse>('/srs/stats')
      return response.data
    },
  })
}

export function useSubmitReview() {
  const queryClient = useQueryClient()
  const { updateUser, user } = useAuthStore()

  return useMutation({
    mutationFn: async (data: { cardId: string; rating: 0 | 1 | 2 | 3 }) => {
      const response = await api.post<ReviewResponse>('/srs/review', data)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['srs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })

      if (data.xpEarned > 0 && user) {
        updateUser({ totalXp: user.totalXp + data.xpEarned })
        if (data.newStatus === 'mastered') {
          toast.success(`Mastered! +${data.xpEarned} XP`, { icon: '⭐' })
        } else {
          toast.success(`+${data.xpEarned} XP`, { icon: '✨' })
        }
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error))
    },
  })
}
