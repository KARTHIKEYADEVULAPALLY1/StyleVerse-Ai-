import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { CartProvider, useCart } from '../context/CartContext'
import { ToastProvider } from '../components/ui/Toast'
import * as cartService from '../services/cartService'
import * as analyticsService from '../services/analyticsService'

vi.mock('../services/cartService', () => ({
  fetchCart: vi.fn(),
  addCartItem: vi.fn(),
  updateCartItem: vi.fn(),
  removeCartItem: vi.fn(),
}))

vi.mock('../services/analyticsService', () => ({
  trackCartAdded: vi.fn(),
  trackCartRemoved: vi.fn(),
}))

function TestCartConsumer() {
  const {
    cartItems,
    totalItems,
    grandTotal,
    loading,
    error,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearLocalCart,
    clearCart,
  } = useCart()

  return (
    <div>
      <div data-testid="cart-count">{totalItems}</div>
      <div data-testid="grand-total">{grandTotal}</div>
      <div data-testid="cart-loading">{loading ? 'loading' : 'idle'}</div>
      <div data-testid="cart-error">{error || 'no-error'}</div>
      <ul data-testid="cart-list">
        {cartItems.map((item) => (
          <li key={`${item.productId}-${item.size}`} data-testid={`cart-item-${item.productId}`}>
            <span data-testid={`title-${item.productId}`}>{item.product?.title}</span>
            <span data-testid={`qty-${item.productId}`}>{item.quantity}</span>
            <span data-testid={`subtotal-${item.productId}`}>{item.subtotal}</span>
            <button
              onClick={() => updateQuantity(item.productId, item.size, 1)}
              data-testid={`inc-${item.productId}`}
            >
              +
            </button>
            <button
              onClick={() => updateQuantity(item.productId, item.size, -1)}
              data-testid={`dec-${item.productId}`}
            >
              -
            </button>
            <button
              onClick={() => removeFromCart(item.productId, item.size)}
              data-testid={`remove-${item.productId}`}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button
        onClick={() =>
          addToCart(
            { id: 42, title: 'Neon Bomber Jacket', price: '₹3,000' },
            'L',
            1
          )
        }
        data-testid="add-button"
      >
        Add Jacket
      </button>
      <button onClick={clearLocalCart} data-testid="clear-local-button">
        Clear Local
      </button>
      <button onClick={() => clearCart()} data-testid="clear-all-button">
        Clear All
      </button>
    </div>
  )
}

function renderCartWithProviders({ authValue = {} } = {}) {
  const defaultAuth = {
    user: { id: 1, email: 'shopper@styleverse.ai' },
    token: 'test-valid-jwt-token',
    isAuthenticated: true,
    loginSuccess: vi.fn(),
    logout: vi.fn(),
    ...authValue,
  }

  return render(
    <MemoryRouter>
      <ToastProvider>
        <AuthContext.Provider value={defaultAuth}>
          <CartProvider>
            <TestCartConsumer />
          </CartProvider>
        </AuthContext.Provider>
      </ToastProvider>
    </MemoryRouter>
  )
}

describe('CartContext & Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts with empty state and zero totals when user is not authenticated', async () => {
    renderCartWithProviders({
      authValue: { user: null, token: null, isAuthenticated: false },
    })

    expect(screen.getByTestId('cart-count').textContent).toBe('0')
    expect(screen.getByTestId('grand-total').textContent).toBe('0')
    expect(cartService.fetchCart).not.toHaveBeenCalled()
  })

  it('fetches cart on mount when authenticated and calculates totals correctly', async () => {
    const mockItems = [
      {
        id: 1,
        product_id: 10,
        selected_size: 'M',
        quantity: 2,
        product: { id: 10, title: 'Cyberpunk Hoodie', price: '₹1,500' },
      },
      {
        id: 2,
        product_id: 11,
        selected_size: 'S',
        quantity: 1,
        product: { id: 11, title: 'Tactical Cargo Pants', price: '₹2,000' },
      },
    ]
    cartService.fetchCart.mockResolvedValueOnce(mockItems)

    renderCartWithProviders()

    await waitFor(() => {
      expect(cartService.fetchCart).toHaveBeenCalledWith('test-valid-jwt-token')
    })

    await waitFor(() => {
      expect(screen.getByTestId('cart-count').textContent).toBe('3') // 2 + 1
      expect(screen.getByTestId('grand-total').textContent).toBe('5000') // (1500*2) + (2000*1)
    })

    expect(screen.getByTestId('title-10').textContent).toBe('Cyberpunk Hoodie')
    expect(screen.getByTestId('qty-10').textContent).toBe('2')
    expect(screen.getByTestId('subtotal-10').textContent).toBe('3000')
  })

  it('adds an item to cart and updates analytics and totals', async () => {
    const user = userEvent.setup()
    cartService.fetchCart.mockResolvedValueOnce([])
    const savedItem = {
      id: 99,
      product_id: 42,
      selected_size: 'L',
      quantity: 1,
      product: { id: 42, title: 'Neon Bomber Jacket', price: '₹3,000' },
    }
    cartService.addCartItem.mockResolvedValueOnce(savedItem)

    renderCartWithProviders()

    await waitFor(() => {
      expect(screen.getByTestId('cart-loading').textContent).toBe('idle')
    })

    await user.click(screen.getByTestId('add-button'))

    await waitFor(() => {
      expect(cartService.addCartItem).toHaveBeenCalledWith('test-valid-jwt-token', {
        product_id: 42,
        quantity: 1,
        selected_size: 'L',
      })
      expect(analyticsService.trackCartAdded).toHaveBeenCalledWith(42, {
        quantity: 1,
        size: 'L',
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('cart-count').textContent).toBe('1')
      expect(screen.getByTestId('grand-total').textContent).toBe('3000')
      expect(screen.getByTestId('title-42').textContent).toBe('Neon Bomber Jacket')
    })
  })

  it('updates item quantity and recalculates subtotals', async () => {
    const user = userEvent.setup()
    const mockItems = [
      {
        id: 1,
        product_id: 10,
        selected_size: 'M',
        quantity: 1,
        product: { id: 10, title: 'Cyberpunk Hoodie', price: '₹1,500' },
      },
    ]
    cartService.fetchCart.mockResolvedValueOnce(mockItems)
    cartService.updateCartItem.mockResolvedValueOnce({
      id: 1,
      product_id: 10,
      selected_size: 'M',
      quantity: 2,
      product: { id: 10, title: 'Cyberpunk Hoodie', price: '₹1,500' },
    })

    renderCartWithProviders()

    await waitFor(() => {
      expect(screen.getByTestId('cart-count').textContent).toBe('1')
    })

    await user.click(screen.getByTestId('inc-10'))

    await waitFor(() => {
      expect(cartService.updateCartItem).toHaveBeenCalledWith(
        'test-valid-jwt-token',
        10,
        { quantity: 2, selected_size: 'M' }
      )
    })

    await waitFor(() => {
      expect(screen.getByTestId('cart-count').textContent).toBe('2')
      expect(screen.getByTestId('grand-total').textContent).toBe('3000')
    })
  })

  it('removes item from cart and clears local state via clearLocalCart', async () => {
    const user = userEvent.setup()
    const mockItems = [
      {
        id: 1,
        product_id: 10,
        selected_size: 'M',
        quantity: 1,
        product: { id: 10, title: 'Cyberpunk Hoodie', price: '₹1,500' },
      },
    ]
    cartService.fetchCart.mockResolvedValueOnce(mockItems)
    cartService.removeCartItem.mockResolvedValueOnce({ success: true })

    renderCartWithProviders()

    await waitFor(() => {
      expect(screen.getByTestId('cart-count').textContent).toBe('1')
    })

    await user.click(screen.getByTestId('remove-10'))

    await waitFor(() => {
      expect(cartService.removeCartItem).toHaveBeenCalledWith(
        'test-valid-jwt-token',
        10,
        { selected_size: 'M' }
      )
      expect(analyticsService.trackCartRemoved).toHaveBeenCalledWith(10)
    })

    await waitFor(() => {
      expect(screen.getByTestId('cart-count').textContent).toBe('0')
      expect(screen.queryByTestId('cart-item-10')).not.toBeInTheDocument()
    })

    // Now test clearLocalCart
    await user.click(screen.getByTestId('clear-local-button'))
    expect(screen.getByTestId('cart-count').textContent).toBe('0')
    expect(screen.getByTestId('grand-total').textContent).toBe('0')
  })
})
