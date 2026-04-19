import type { DashboardResponse } from '@lernen/shared'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get<DashboardResponse>('/dashboard')
      return response.data
    },
    // Poll every 12s when no next lesson so we catch it the moment BullMQ finishes
    refetchInterval: (query) => (query.state.data?.nextLesson === null ? 12000 : false),
  })
}

export function useCurriculum() {
  return useQuery({
    queryKey: ['curriculum'],
    queryFn: async () => {
      const response = await api.get('/curriculum')
      return response.data
    },
  })
}
