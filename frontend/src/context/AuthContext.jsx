import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  getCurrentUser,
  getStoredToken,
  removeToken,
  storeToken,
} from '../services/authService'

const AuthContext = createContext(null)
const USER_KEY = 'styleverse-user'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const readStoredUser = () => {
  try {
    const saved = window.sessionStorage.getItem(USER_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

const persistUser = (user) => {
  try {
    if (user) {
      window.sessionStorage.setItem(USER_KEY, JSON.stringify(user))
    } else {
      window.sessionStorage.removeItem(USER_KEY)
    }
  } catch {
    /* storage unavailable */
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStoredUser())
  const [token, setToken] = useState(() => getStoredToken())
  const [initialising, setInitialising] = useState(true)

  // On mount: verify stored JWT with /api/auth/me to restore session or clear stale data
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = getStoredToken()
      if (!storedToken) {
        setInitialising(false)
        return
      }

      try {
        const freshUser = await getCurrentUser(storedToken)
        setUser(freshUser)
        setToken(storedToken)
        persistUser(freshUser)
      } catch {
        // Token invalid or expired — clear everything
        removeToken()
        persistUser(null)
        setUser(null)
        setToken(null)
      } finally {
        setInitialising(false)
      }
    }

    verifySession()
  }, [])

  // ------------------------------------------------------------------
  // loginSuccess — called after successful /api/auth/login response
  // ------------------------------------------------------------------
  const loginSuccess = (accessToken, userData) => {
    const minimalUser = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      created_at: userData.created_at,
    }
    storeToken(accessToken)
    persistUser(minimalUser)
    setToken(accessToken)
    setUser(minimalUser)
  }

  // ------------------------------------------------------------------
  // signup — called after successful /api/auth/signup response
  // ------------------------------------------------------------------
  const signup = (accessToken, userData) => {
    loginSuccess(accessToken, userData)
  }

  // ------------------------------------------------------------------
  // logout — removes all auth state and token
  // ------------------------------------------------------------------
  const logout = () => {
    removeToken()
    persistUser(null)
    setToken(null)
    setUser(null)
  }

  // ------------------------------------------------------------------
  // Legacy local login (kept for compatibility; no longer used by UI)
  // ------------------------------------------------------------------
  const login = () => ({ success: false, message: 'Use the API login.' })

  const value = useMemo(
    () => ({
      user,
      token,
      initialising,
      isAuthenticated: Boolean(user) && Boolean(token),
      login,
      loginSuccess,
      signup,
      logout,
    }),
    [user, token, initialising]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
