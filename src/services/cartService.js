import { ApiEndpoints } from '../config/api.js'
import { apiFetch } from './apiClient.js'

const API_BASE_URL = ApiEndpoints.cart()

export async function fetchCart(token) {
  return apiFetch('', { baseUrl: API_BASE_URL, token, method: 'GET' })
}

export async function addCartItem(token, payload) {
  return apiFetch('', {
    baseUrl: API_BASE_URL,
    token,
    method: 'POST',
    body: payload,
  })
}

export async function updateCartItem(token, productId, payload) {
  return apiFetch(`/${productId}`, {
    baseUrl: API_BASE_URL,
    token,
    method: 'PATCH',
    body: payload,
  })
}

export async function removeCartItem(token, productId, payload = {}) {
  return apiFetch(`/${productId}`, {
    baseUrl: API_BASE_URL,
    token,
    method: 'DELETE',
    body: payload,
  })
}

