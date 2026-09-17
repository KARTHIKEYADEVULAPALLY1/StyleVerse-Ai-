import { ApiEndpoints } from '../config/api.js'
import { apiFetch } from './apiClient.js'

const API_BASE_URL = ApiEndpoints.recommendations()

export async function fetchRecommendations(token) {
  if (!token) {
    return []
  }

  const data = await apiFetch('', {
    baseUrl: API_BASE_URL,
    method: 'GET',
    token,
  })

  return Array.isArray(data) ? data : []
}

