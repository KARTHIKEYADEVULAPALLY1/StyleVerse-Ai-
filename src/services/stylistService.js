const API_BASE_URL = import.meta.env.VITE_STYLIST_API_URL || 'http://127.0.0.1:8000/api/stylist'

async function apiFetch(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(data?.detail || `Request failed (${response.status})`)
    }

    return data
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error. Unable to connect to the stylist service.')
    }
    throw error
  }
}

export async function recommendOutfit(payload) {
  return apiFetch('/recommend', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
