const API_BASE_URL = import.meta.env.VITE_TRYON_API_URL || 'http://127.0.0.1:8000/api/try-on'

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

export async function uploadTryOnImage(file, { onProgress } = {}) {
  const validationError = validateTryOnFile(file)
  if (validationError) {
    throw new Error(validationError)
  }

  const formData = new FormData()
  formData.append('file', file)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE_URL}/upload`)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && typeof onProgress === 'function') {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }

    xhr.onload = () => {
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
      reject(new Error('Network error. Unable to connect to the upload server.'))
    }

    xhr.send(formData)
  })
}
