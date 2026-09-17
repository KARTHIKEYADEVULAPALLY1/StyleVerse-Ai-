import { ApiEndpoints } from '../config/api.js'
import { apiFetch } from './apiClient.js'

const API_BASE_URL = ApiEndpoints.wishlist()

export async function fetchWishlist(token) {
  return apiFetch('', { baseUrl: API_BASE_URL, token, method: 'GET' })
}

export async function addProductToWishlist(token, productId) {
  return apiFetch(`/${productId}`, { baseUrl: API_BASE_URL, token, method: 'POST' })
}

export async function removeProductFromWishlist(token, productId) {
  return apiFetch(`/${productId}`, { baseUrl: API_BASE_URL, token, method: 'DELETE' })
}

