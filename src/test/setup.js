import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Set test environment variable for API base URL
if (typeof process !== 'undefined') {
  process.env.VITE_API_URL = 'http://localhost:8000'
}
if (typeof import.meta !== 'undefined' && import.meta.env) {
  import.meta.env.VITE_API_URL = 'http://localhost:8000'
}

// Global browser mocks for jsdom (use plain functions so vi.restoreAllMocks doesn't clear them)
window.scrollTo = function () {}

window.matchMedia = function (query) {
  return {
    matches: false,
    media: String(query || ''),
    onchange: null,
    addListener: function () {},
    removeListener: function () {},
    addEventListener: function () {},
    removeEventListener: function () {},
    dispatchEvent: function () {
      return false
    },
  }
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return []
  }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  window.localStorage.clear()
  vi.clearAllMocks()
})
