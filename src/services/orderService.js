import { ApiEndpoints } from '../config/api.js'
import { apiFetch } from './apiClient.js'

const API_BASE_URL = ApiEndpoints.orders()

export async function createOrder(token) {
  return apiFetch('', { baseUrl: API_BASE_URL, token, method: 'POST' })
}

export async function fetchOrders(token) {
  return apiFetch('', { baseUrl: API_BASE_URL, token, method: 'GET' })
}

export async function fetchOrderById(token, orderId) {
  return apiFetch(`/${orderId}`, { baseUrl: API_BASE_URL, token, method: 'GET' })
}

