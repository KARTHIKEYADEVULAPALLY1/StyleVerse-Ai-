import { ApiEndpoints } from '../config/api.js'
import { apiFetch } from './apiClient.js'

const API_BASE_URL = ApiEndpoints.stylist()

export async function recommendOutfit(payload) {
  return apiFetch('/recommend', {
    baseUrl: API_BASE_URL,
    method: 'POST',
    body: payload,
  })
}

