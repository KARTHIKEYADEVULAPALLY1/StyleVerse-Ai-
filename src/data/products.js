export const products = [
  {
    id: 1,
    name: 'Oversized Graphic Hoodie',
    brand: 'H&M',
    category: 'Hoodies',
    price: '₹1,299',
    originalPrice: '₹2,499',
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80',
    store: 'H&M',
    colors: ['Black', 'Gray', 'Cream'],
    sizes: ['S', 'M', 'L', 'XL']
  },
  {
    id: 2,
    name: 'Classic White Sneakers',
    brand: 'Nike',
    category: 'Sneakers',
    price: '₹4,999',
    originalPrice: '₹6,999',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
    store: 'Nike',
    colors: ['White', 'Off White', 'Black'],
    sizes: ['6', '7', '8', '9', '10']
  },
  {
    id: 3,
    name: 'Korean Streetwear Jacket',
    brand: 'Zara',
    category: 'Jackets',
    price: '₹3,499',
    originalPrice: '₹5,999',
    rating: 4.3,
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&q=80',
    store: 'Zara',
    colors: ['Olive', 'Black', 'Stone'],
    sizes: ['S', 'M', 'L', 'XL']
  },
  {
    id: 4,
    name: 'Minimalist Watch',
    brand: 'Daniel Wellington',
    category: 'Accessories',
    price: '₹8,999',
    originalPrice: '₹12,999',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&q=80',
    store: 'Daniel Wellington',
    colors: ['Silver', 'Black', 'Gold'],
    sizes: ['One Size']
  },
  {
    id: 5,
    name: 'Slim Fit Chinos',
    brand: 'Uniqlo',
    category: 'Pants',
    price: '₹1,999',
    originalPrice: '₹3,499',
    rating: 4.4,
    image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&q=80',
    store: 'Uniqlo',
    colors: ['Sand', 'Navy', 'Charcoal'],
    sizes: ['S', 'M', 'L', 'XL']
  },
  {
    id: 6,
    name: 'Leather Crossbody Bag',
    brand: 'Fossil',
    category: 'Bags',
    price: '₹5,499',
    originalPrice: '₹7,999',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80',
    store: 'Fossil',
    colors: ['Tan', 'Black', 'Espresso'],
    sizes: ['One Size']
  }
]

export const productCategories = ['All', ...new Set(products.map((product) => product.category))]
export const productBrands = ['All', ...new Set(products.map((product) => product.brand))]
export const priceOptions = [
  { label: 'All prices', value: null },
  { label: 'Under ₹2,000', value: 2000 },
  { label: 'Under ₹5,000', value: 5000 },
  { label: 'Under ₹10,000', value: 10000 }
]

export const parsePrice = (value) => Number(String(value).replace(/[^\d]/g, '')) || 0

export const filterProducts = (items, filters = {}) => {
  const { query = '', category = 'All', brand = 'All', maxPrice = null } = filters
  const normalizedQuery = query.trim().toLowerCase()

  return items.filter((product) => {
    const searchableText = `${product.name} ${product.brand} ${product.category} ${product.description || ''}`.toLowerCase()
    const queryMatches = !normalizedQuery || searchableText.includes(normalizedQuery)
    const categoryMatches = category === 'All' || product.category === category
    const brandMatches = brand === 'All' || product.brand === brand
    const priceMatches = maxPrice === null || parsePrice(product.price) <= maxPrice

    return queryMatches && categoryMatches && brandMatches && priceMatches
  })
}

export const wishlistProductIds = [1, 2, 4]

export const getProductById = (id) => products.find((product) => product.id === id)

export const getWishlistProducts = () =>
  wishlistProductIds.map((id) => getProductById(id)).filter(Boolean)
