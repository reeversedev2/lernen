import axios, { type AxiosError } from 'axios'
import { useAdminStore } from '../stores/admin.store'

export const adminApi = axios.create({
  baseURL: '/api/admin',
  headers: { 'Content-Type': 'application/json' },
})

adminApi.interceptors.request.use((config) => {
  const credentials = useAdminStore.getState().credentials
  if (credentials) {
    config.headers.Authorization = `Basic ${credentials}`
  }
  return config
})

adminApi.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAdminStore.getState().logout()
    }
    return Promise.reject(error)
  },
)

// Verify credentials against the API — throws on invalid
export async function verifyAdminCredentials(username: string, password: string): Promise<void> {
  const credentials = btoa(`${username}:${password}`)
  await axios.get('/api/admin/overview', {
    headers: { Authorization: `Basic ${credentials}` },
  })
}
