import { ThemeProvider } from './context/ThemeContext'
import CursorGlow from './components/ui/CursorGlow'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import AISearch from './components/AISearch'
import TrendingProducts from './components/TrendingProducts'
import PriceComparison from './components/PriceComparison'
import VirtualTryOn from './components/VirtualTryOn'
import AIStylist from './components/AIStylist'
import Wishlist from './components/Wishlist'
import About from './components/About'
import Profile from './components/Profile'
import Footer from './components/Footer'

export default function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen relative">
        {/* Global effects */}
        <CursorGlow />
        <div className="noise-overlay" />

        {/* Main content */}
        <Navbar />
        <main className="relative z-10">
          <Hero />
          <AISearch />
          <TrendingProducts />
          <PriceComparison />
          <VirtualTryOn />
          <AIStylist />
          <Wishlist />
          <About />
          <Profile />
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  )
}