import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { ToastProvider } from '../components/ui/Toast'
import { AUTH_UNAUTHORIZED_EVENT } from '../services/apiClient'
import * as authService from '../services/authService'

function TestConsumer() {
  const { user, token, isAuthenticated, initialising, loginSuccess, logout } = useAuth()

  if (initialising) return <div>Initialising...</div>

  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Unauthenticated'}</div>
      <div data-testid="user-name">{user?.name || 'No user'}</div>
      <div data-testid="token">{token || 'No token'}</div>
      <button
        onClick={() =>
          loginSuccess('mock-jwt-token-123', {
            id: 1,
            name: 'Test Fashionista',
            email: 'test@example.com',
            is_admin: false,
          })
        }
      >
        Log In
      </button>
      <button onClick={logout}>Log Out</button>
    </div>
  )
}

function renderWithProviders() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('initializes with unauthenticated state when no token is in storage', async () => {
    vi.spyOn(authService, 'getStoredToken').mockReturnValue(null)

    renderWithProviders()

    expect(await screen.findByTestId('auth-status')).toHaveTextContent('Unauthenticated')
    expect(screen.getByTestId('user-name')).toHaveTextContent('No user')
    expect(screen.getByTestId('token')).toHaveTextContent('No token')
  })

  it('handles loginSuccess and updates auth state', async () => {
    vi.spyOn(authService, 'getStoredToken').mockReturnValue(null)
    const storeTokenSpy = vi.spyOn(authService, 'storeToken')

    renderWithProviders()

    expect(await screen.findByTestId('auth-status')).toHaveTextContent('Unauthenticated')

    act(() => {
      screen.getByText('Log In').click()
    })

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
    expect(screen.getByTestId('user-name')).toHaveTextContent('Test Fashionista')
    expect(screen.getByTestId('token')).toHaveTextContent('mock-jwt-token-123')
    expect(storeTokenSpy).toHaveBeenCalledWith('mock-jwt-token-123')
  })

  it('handles logout and clears stored state', async () => {
    vi.spyOn(authService, 'getStoredToken').mockReturnValue(null)
    const removeTokenSpy = vi.spyOn(authService, 'removeToken')

    renderWithProviders()

    act(() => {
      screen.getByText('Log In').click()
    })
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')

    act(() => {
      screen.getByText('Log Out').click()
    })
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Unauthenticated')
    expect(screen.getByTestId('user-name')).toHaveTextContent('No user')
    expect(removeTokenSpy).toHaveBeenCalled()
  })

  it('resets auth on AUTH_UNAUTHORIZED_EVENT (401 response)', async () => {
    vi.spyOn(authService, 'getStoredToken').mockReturnValue(null)

    renderWithProviders()

    act(() => {
      screen.getByText('Log In').click()
    })
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')

    act(() => {
      window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT, { detail: { url: '/api/cart' } }))
    })

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Unauthenticated')
    expect(screen.getByTestId('token')).toHaveTextContent('No token')
  })

  it('restores user session on mount when valid stored token exists', async () => {
    vi.spyOn(authService, 'getStoredToken').mockReturnValue('stored-token-xyz')
    vi.spyOn(authService, 'getCurrentUser').mockResolvedValue({
      id: 42,
      name: 'Restored User',
      email: 'restored@example.com',
      is_admin: true,
    })

    renderWithProviders()

    expect(await screen.findByTestId('auth-status')).toHaveTextContent('Authenticated')
    expect(screen.getByTestId('user-name')).toHaveTextContent('Restored User')
    expect(screen.getByTestId('token')).toHaveTextContent('stored-token-xyz')
  })
})
