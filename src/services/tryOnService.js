const ROOT_URL = (import.meta.env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const API_BASE_URL = import.meta.env?.VITE_TRYON_API_URL || `${ROOT_URL}/api/try-on`

export const MAX_TRYON_FILE_SIZE_BYTES = 5 * 1024 * 1024
export const ALLOWED_TRYON_MIME_TYPES = ['image/jpeg', 'image/png']

export function validateTryOnFile(file) {
  if (!file) {
    return 'Please select an image to upload.'
  }

  if (!ALLOWED_TRYON_MIME_TYPES.includes(file.type)) {
    return 'Unsupported file type. Please upload a JPG or PNG image.'
  }

  if (file.size > MAX_TRYON_FILE_SIZE_BYTES) {
    return 'File is too large. Maximum upload size is 5 MB.'
  }

  return null
}

export async function uploadTryOnImage(file, { onProgress, timeout = 30000 } = {}) {
  const validationError = validateTryOnFile(file)
  if (validationError) {
    throw new Error(validationError)
  }

  const formData = new FormData()
  formData.append('file', file)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const timer = setTimeout(() => {
      xhr.abort()
      reject(new Error('Request timed out. Please try again.'))
    }, timeout)

    xhr.open('POST', `${API_BASE_URL}/upload`)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && typeof onProgress === 'function') {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }

    xhr.onload = () => {
      clearTimeout(timer)
      let data = null
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        data = null
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data)
        return
      }

      reject(new Error(data?.detail || 'Unable to upload image.'))
    }

    xhr.onerror = () => {
      clearTimeout(timer)
      reject(new Error('Network error. Unable to connect to the upload server.'))
    }

    xhr.ontimeout = () => {
      clearTimeout(timer)
      reject(new Error('Request timed out. Please try again.'))
    }

    xhr.send(formData)
  })
}

/**
 * Start virtual try-on processing for an uploaded image and a product.
 * @param {string} userImage - Upload ID or filename returned from /api/try-on/upload
 * @param {number|string} productId - Product ID from the catalog
 * @returns {Promise<Object>} Try-on process response
 */
export async function processTryOn(userImage, productId) {
  try {
    const response = await fetch(`${API_BASE_URL}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_image: userImage, product_id: Number(productId) }),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(data?.detail || `Try-on processing failed (${response.status})`)
    }

    return data
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error. Unable to connect to the try-on server.')
    }
    throw error
  }
}