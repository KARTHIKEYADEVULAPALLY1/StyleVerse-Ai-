const API_BASE_URL = import.meta.env.VITE_RECOMMENDATIONS_API_URL || 'http://127.0.0.1:8000/api'

export async function fetchRecommendations(token) {
  if (!token) {
    return []
  }

  const response = await fetch(`${API_BASE_URL}/recommendations`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.detail || 'Unable to load recommendations.')
  }

  return Array.isArray(data) ? data : []
}
