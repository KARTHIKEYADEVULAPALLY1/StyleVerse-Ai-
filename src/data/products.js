const catalog = [
  ['Nimbus Rain Jacket', 'tentree', 'Jackets', '$218.00', '/products/representative-jacket.svg', 'https://www.tentree.com/products/mens-rain-jacket'],
  ['Juniper Zip Hoodie', 'tentree', 'Hoodies', '$98.00', '/products/representative-hoodie.svg', 'https://www.tentree.com/products/w-juniper-zip-hoodie'],
  ['Brewster Vest', 'tentree', 'Outerwear', '$188.00', '/products/representative-vest.svg', 'https://www.tentree.com/products/mens-puffer-vest-meteorite-black'],
  ['Palisade Full Zip', 'tentree', 'Fleece', '$98.00', '/products/representative-fleece.svg', 'https://www.tentree.com/products/recycled-microfleece-zip-meteorite-black'],
  ['Coastal Hybrid Hoodie', 'tentree', 'Hoodies', '$168.00', '/products/representative-hoodie.svg', 'https://www.tentree.com/products/cloud-shell-hybrid-hoodie-meteorite-black'],
  ['Livingston Jacket', 'tentree', 'Jackets', '$198.00', '/products/representative-jacket.svg', 'https://www.tentree.com/products/heavy-weight-flannel-long-jacket-midnight-blue-cabin-plaid'],
  ['Autumn Flora Crew', 'tentree', 'Sweatshirts', '$78.00', '/products/representative-sweatshirt.svg', 'https://www.tentree.com/products/autumn-flora-crew-meteorite-black-pale-oak'],
  ['Sombrio Clip Bag', 'tentree', 'Bags', '$30.00', '/products/representative-bag.svg', 'https://www.tentree.com/products/sombrio-clip-bag-golden-brown'],
  ['Bristow Fleck Beanie', 'tentree', 'Accessories', '$40.00', '/products/representative-accessory.svg', 'https://www.tentree.com/products/bristow-fleck-beanie-pale-oak-heather-fleck'],
  ['Kurt Juniper Patch Beanie', 'tentree', 'Accessories', '$35.00', '/products/representative-accessory.svg', 'https://www.tentree.com/products/kurt-juniper-patch-beanie-dark-forest-green-cork-patch'],
  ['Summit Reflection Crew', 'tentree', 'Sweatshirts', '$78.00', '/products/representative-sweatshirt.svg', 'https://www.tentree.com/products/summit-reflection-crew-dark-forest-green-blue-horizon'],
  ['Howson Hoodie', 'tentree', 'Hoodies', '$98.00', '/products/representative-hoodie.svg', 'https://www.tentree.com/products/howson-hoodie-dark-forest-green-pine-green'],
  ['Astir Polo', 'tentree', 'Tops', '$58.00', '/products/representative-top.svg', 'https://www.tentree.com/products/astir-polo-dark-forest-green-heather'],
  ['TreeBlend Baker Longsleeve', 'tentree', 'Tops', '$50.00', '/products/representative-top.svg', 'https://www.tentree.com/products/treeblend-baker-longsleeve-dark-forest-green-heather'],
  ['Creston Quilted Bag', 'tentree', 'Bags', '$78.00', '/products/representative-bag.svg', 'https://www.tentree.com/products/creston-quilted-bag-ashwood'],
]

export const products = catalog.map(([name, brand, category, price, image, productUrl], index) => ({
  id: index + 1,
  name,
  brand,
  category,
  price,
  originalPrice: price,
  rating: 4.4,
  image,
  store: brand,
  product_url: productUrl,
  colors: ['Representative'],
  sizes: ['S', 'M', 'L', 'XL']
}))

export const productCategories = ['All', ...new Set(products.map((product) => product.category))]
export const productBrands = ['All', ...new Set(products.map((product) => product.brand))]
export const priceOptions = [
  { label: 'All prices', value: null },
  { label: 'Under $50', value: 50 },
  { label: 'Under $100', value: 100 },
  { label: 'Under $200', value: 200 }
]

export const parsePrice = (value) => Number(String(value).replace(/[^\d.]/g, '')) || 0

export const filterProducts = (items, filters = {}) => {
  const { query = '', category = 'All', brand = 'All', maxPrice = null } = filters
  const normalizedQuery = query.trim().toLowerCase()
  return items.filter((product) => {
    const searchableText = `${product.name} ${product.brand} ${product.category} ${product.description || ''}`.toLowerCase()
    return (!normalizedQuery || searchableText.includes(normalizedQuery))
      && (category === 'All' || product.category === category)
      && (brand === 'All' || product.brand === brand)
      && (maxPrice === null || parsePrice(product.price) <= maxPrice)
  })
}

export const wishlistProductIds = [1, 2, 4]
export const getProductById = (id) => products.find((product) => product.id === id)
export const getWishlistProducts = () => wishlistProductIds.map((id) => getProductById(id)).filter(Boolean)
