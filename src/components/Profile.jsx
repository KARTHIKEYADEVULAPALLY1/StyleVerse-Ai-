import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Phone, MapPin, Camera, Save, Ruler, Shirt, Palette, Package, CreditCard, Settings } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Reveal from './ui/Reveal'
import MagneticButton from './ui/MagneticButton'

const bodyTypes = ['Slim', 'Athletic', 'Average', 'Curvy', 'Plus Size']
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const stylePreferences = ['Streetwear', 'Minimalist', 'Formal', 'Casual', 'Vintage', 'Athleisure']

const orderHistory = [
  { id: 'SV-2024-001', item: 'Oversized Graphic Hoodie', date: 'Dec 15, 2024', status: 'Delivered', price: '₹1,299' },
  { id: 'SV-2024-002', item: 'Classic White Sneakers', date: 'Dec 10, 2024', status: 'Shipped', price: '₹4,999' },
  { id: 'SV-2024-003', item: 'Minimalist Watch', date: 'Nov 28, 2024', status: 'Delivered', price: '₹8,999' }
]

export default function Profile() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [saved, setSaved] = useState(false)

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'payment', label: 'Payment', icon: CreditCard }
  ]

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <section id="profile" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-primary/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-12">
          <h2 className="font-display text-4xl sm:text-5xl font-normal tracking-tight">
            My <span className="text-shine">Profile</span>
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 font-light tracking-wide">
            Manage your account, preferences, and orders
          </p>
        </Reveal>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <Reveal direction="right">
            <div className="rounded-4xl glass dark:glass p-6">
              {/* Avatar */}
              <div className="text-center mb-6">
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center hover:bg-primary hover:text-white transition-colors">
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-display text-xl font-bold">{user?.name || 'Alex Johnson'}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email || '@alexj'}</p>
              </div>

              {/* Tabs */}
              <div className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-glow'
                        : 'hover:bg-white/10 dark:hover:bg-white/10'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Quick stats */}
              <div className="mt-6 pt-6 border-t border-white/10 dark:border-white/5">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="font-display text-lg font-bold gradient-text">12</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Orders</div>
                  </div>
                  <div>
                    <div className="font-display text-lg font-bold gradient-text">8</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Wishlist</div>
                  </div>
                  <div>
                    <div className="font-display text-lg font-bold gradient-text">3</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Reviews</div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Main Content */}
          <Reveal direction="left" delay={0.2} className="lg:col-span-3">
            <div className="rounded-4xl glass dark:glass p-8">
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h3 className="font-display text-xl font-bold mb-6">Personal Information</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          defaultValue={user?.name || 'Alex Johnson'}
                          key={user?.name || 'default-name'}
                          className="w-full pl-10 pr-4 py-3 rounded-xl glass dark:glass outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          defaultValue={user?.email || 'alex@example.com'}
                          key={user?.email || 'default-email'}
                          className="w-full pl-10 pr-4 py-3 rounded-xl glass dark:glass outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Phone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="tel"
                          defaultValue="+91 98765 43210"
                          className="w-full pl-10 pr-4 py-3 rounded-xl glass dark:glass outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Location</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          defaultValue="Mumbai, India"
                          className="w-full pl-10 pr-4 py-3 rounded-xl glass dark:glass outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                  <MagneticButton
                    onClick={handleSave}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold shadow-glow"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saved ? 'Saved!' : 'Save Changes'}
                  </MagneticButton>
                </div>
              )}

              {activeTab === 'orders' && (
                <div>
                  <h3 className="font-display text-xl font-bold mb-6">Order History</h3>
                  <div className="space-y-4">
                    {orderHistory.map((order, i) => (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center justify-between p-4 rounded-2xl glass dark:glass"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                            <Package className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-semibold">{order.item}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {order.id} · {order.date}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{order.price}</div>
                          <span className={`text-xs font-semibold ${
                            order.status === 'Delivered' ? 'text-green-500' : 'text-primary'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'preferences' && (
                <div className="space-y-8">
                  <h3 className="font-display text-xl font-bold mb-6">Style Preferences</h3>

                  {/* Body Type */}
                  <div>
                    <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-primary" />
                      Body Type
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {bodyTypes.map((type) => (
                        <button
                          key={type}
                          className={`px-4 py-2 rounded-full text-sm transition-all duration-300 ${
                            type === 'Athletic'
                              ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-glow'
                              : 'glass dark:glass hover:bg-white/10 dark:hover:bg-white/10'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Size */}
                  <div>
                    <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                      <Shirt className="w-4 h-4 text-primary" />
                      Preferred Size
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map((size) => (
                        <button
                          key={size}
                          className={`w-12 h-12 rounded-xl text-sm font-semibold transition-all duration-300 ${
                            size === 'M'
                              ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-glow'
                              : 'glass dark:glass hover:bg-white/10 dark:hover:bg-white/10'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Style Preferences */}
                  <div>
                    <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                      <Palette className="w-4 h-4 text-primary" />
                      Style Preferences
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {stylePreferences.map((style) => (
                        <button
                          key={style}
                          className={`px-4 py-2 rounded-full text-sm transition-all duration-300 ${
                            ['Streetwear', 'Minimalist'].includes(style)
                              ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-glow'
                              : 'glass dark:glass hover:bg-white/10 dark:hover:bg-white/10'
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  <MagneticButton
                    onClick={handleSave}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold shadow-glow"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saved ? 'Saved!' : 'Save Preferences'}
                  </MagneticButton>
                </div>
              )}

              {activeTab === 'payment' && (
                <div className="space-y-6">
                  <h3 className="font-display text-xl font-bold mb-6">Payment Methods</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-6 rounded-2xl glass dark:glass">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-8 rounded bg-gradient-to-r from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold">
                          VISA
                        </div>
                        <span className="text-xs text-green-500 font-semibold">Default</span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">•••• •••• •••• 4242</div>
                      <div className="text-sm font-medium mt-1">Alex Johnson</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">Expires 12/26</div>
                    </div>
                    <div className="p-6 rounded-2xl glass dark:glass">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-8 rounded bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white text-xs font-bold">
                          UPI
                        </div>
                        <span className="text-xs text-gray-500">Secondary</span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">alex@upi</div>
                      <div className="text-sm font-medium mt-1">Alex Johnson</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">Instant Transfer</div>
                    </div>
                  </div>
                  <MagneticButton className="px-6 py-3 rounded-2xl glass dark:glass font-semibold">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Add Payment Method
                  </MagneticButton>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}