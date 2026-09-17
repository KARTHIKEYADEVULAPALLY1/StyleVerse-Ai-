import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProductCard from '../components/ui/ProductCard'
import { RouteLoadingFallback, AdminDashboardSkeleton } from '../components/ui/LoadingSkeletons'
import { AuthContext } from '../context/AuthContext'
import { CartContext } from '../context/CartContext'
import { WishlistContext } from '../context/WishlistContext'
import { ThemeContext } from '../context/ThemeContext'

function renderWithAllProviders(ui, {
  auth = { user: null, token: null, isAuthenticated: false, logout: vi.fn(), loginSuccess: vi.fn() },
  cart = { totalItems: 2, cartItems: [], addToCart: vi.fn(), removeFromCart: vi.fn() },
  wishlist = { wishlistProducts: [{ id: 101 }], isInWishlist: (id) => id === 101, toggleWishlist: vi.fn() },
  theme = { theme: 'dark', toggleTheme: vi.fn() }
} = {}) {
  return render(
    <MemoryRouter>
      <ThemeContext.Provider value={theme}>
        <AuthContext.Provider value={auth}>
          <WishlistContext.Provider value={wishlist}>
            <CartContext.Provider value={cart}>
              {ui}
            </CartContext.Provider>
          </WishlistContext.Provider>
        </AuthContext.Provider>
      </ThemeContext.Provider>
    </MemoryRouter>
  )
}

describe('Core Component Rendering', () => {
  describe('Navbar Component', () => {
    it('renders brand name and navigation items', () => {
      renderWithAllProviders(<Navbar />)

      // Brand name text
      const brandElements = screen.getAllByText(/STYLEVERSE/i)
      expect(brandElements.length).toBeGreaterThan(0)

      // Navigation links
      expect(screen.getByText('AI Search')).toBeInTheDocument()
      expect(screen.getByText('Virtual Try-On')).toBeInTheDocument()
      expect(screen.getByText('AI Stylist')).toBeInTheDocument()
      expect(screen.getByText('Discover')).toBeInTheDocument()
    })

    it('shows login button when user is unauthenticated', () => {
      renderWithAllProviders(<Navbar />, {
        auth: { user: null, token: null, isAuthenticated: false, logout: vi.fn() },
      })

      const loginButtons = screen.getAllByRole('button', { name: /log in/i })
      expect(loginButtons.length).toBeGreaterThan(0)
    })

    it('shows user name and sign out action when authenticated', () => {
      renderWithAllProviders(<Navbar />, {
        auth: {
          user: { id: 1, name: 'Elena Rostova', role: 'customer' },
          token: 'jwt-123',
          isAuthenticated: true,
          logout: vi.fn(),
        },
      })

      expect(screen.getByText(/Hi, Elena/i)).toBeInTheDocument()
      const logoutButtons = screen.getAllByRole('button', { name: /log out/i })
      expect(logoutButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Footer Component', () => {
    it('renders brand details and footer category headings', () => {
      render(
        <MemoryRouter>
          <Footer />
        </MemoryRouter>
      )

      expect(screen.getByText(/AI Fashion House/i)).toBeInTheDocument()
      expect(screen.getByText('Maison')).toBeInTheDocument()
      expect(screen.getByText('Company')).toBeInTheDocument()
      expect(screen.getByText('Support')).toBeInTheDocument()
      expect(screen.getByText(/world's first AI Fashion Operating System/i)).toBeInTheDocument()
    })
  })

  describe('ProductCard Component', () => {
    const mockProduct = {
      id: 42,
      name: 'Cyberpunk Trench Coat',
      brand: 'NeoTokyo',
      category: 'Outerwear',
      price: '₹4,999',
      originalPrice: '₹7,999',
      rating: 4.8,
      image: 'https://example.com/coat.jpg',
      tags: ['Cyberpunk', 'Futuristic'],
    }

    it('renders product details, formatted prices and discount badge', () => {
      renderWithAllProviders(<ProductCard product={mockProduct} />)

      expect(screen.getByText('Cyberpunk Trench Coat')).toBeInTheDocument()
      expect(screen.getByText('NeoTokyo')).toBeInTheDocument()
      expect(screen.getByText('₹4,999')).toBeInTheDocument()
      expect(screen.getByText('₹7,999')).toBeInTheDocument()
      expect(screen.getAllByText(/38% off/i).length).toBeGreaterThanOrEqual(1)
    })

    it('returns null gracefully when product is undefined', () => {
      const { container } = renderWithAllProviders(<ProductCard product={null} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('LoadingSkeletons Components', () => {
    it('renders RouteLoadingFallback without crashing', () => {
      const { container } = render(<RouteLoadingFallback />)
      expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('renders AdminDashboardSkeleton with custom title', () => {
      render(<AdminDashboardSkeleton title="Merchant Analytics Skeleton" />)
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
    })
  })
})
