import type {
  RoadmapResponse,
  StageCompleteResponse,
  StageDetailResponse,
  StageSessionDTO,
} from '@lernen/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useRoadmap() {
  return useQuery<RoadmapResponse>({
    queryKey: ['roadmap'],
    queryFn: async () => {
      const res = await api.get('/stages')
      return res.data
    },
  })
}

export function useStageDetail(stageId: string) {
  return useQuery<StageDetailResponse>({
    queryKey: ['stage', stageId],
    queryFn: async () => {
      const res = await api.get(`/stages/${stageId}`)
      return res.data
    },
    enabled: !!stageId,
  })
}

export function useStartStagePractice(stageId: string) {
  return useMutation<StageSessionDTO>({
    mutationFn: async () => {
      const res = await api.post(`/stages/${stageId}/practice`)
      return res.data
    },
  })
}

export function useCompleteStagePractice(stageId: string) {
  const queryClient = useQueryClient()
  return useMutation<
    StageCompleteResponse,
    Error,
    {
      historyId: string
      answers: Array<{ exerciseId: string; answer: string; timeSpentMs: number }>
    }
  >({
    mutationFn: async ({ historyId, answers }) => {
      const res = await api.post(`/stages/${stageId}/practice/${historyId}/complete`, { answers })
      return res.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['roadmap'] })
      void queryClient.invalidateQueries({ queryKey: ['stage', stageId] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
