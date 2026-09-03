import { products, parsePrice } from '../data/products'

const ASSISTANT_API_URL = String(import.meta.env.VITE_ASSISTANT_API_URL || '').trim().replace(/\/+$/, '')
const REQUEST_TIMEOUT_MS = 8000

function fallbackReply(message) {
  const query = message.toLowerCase()
  const budgetMatch = query.match(/(?:under|below|less than|within)[^\d]{0,8}([\d,]+)/i)
  const budget = budgetMatch ? Number(budgetMatch[1].replace(/,/g, '')) : null
  const isWedding = /wedding|shaadi|marriage|ceremony/.test(query)
  const isCasual = /casual|everyday|college|weekend/.test(query)
  const isSneaker = /sneaker|shoe|footwear/.test(query)
  const isWhite = /white|off[-\s]?white/.test(query)

  let matches = products.filter((product) => {
    const text = `${product.name} ${product.category} ${product.colors.join(' ')}`.toLowerCase()
    return (!budget || parsePrice(product.price) <= budget) &&
      (!isSneaker || product.category === 'Sneakers') &&
      (!isWhite || text.includes('white')) &&
      (isWedding ? /formal|dress|jacket|blazer|accessor/i.test(text) : true)
  })

  if (isCasual && budget) {
    matches = products.filter((product) => parsePrice(product.price) <= budget && /hoodie|chino|tee|sneaker/i.test(product.name))
  }

  if (!matches.length && isSneaker && isWhite) {
    const whiteSneakers = products.find((product) => product.category === 'Sneakers')
    return `I found ${whiteSneakers.name} at ${whiteSneakers.price}. It is above a ₹${budget || '3,000'} budget, but it is the closest catalog match. Try raising the budget or asking for casual alternatives.`
  }

  if (!matches.length) {
    return 'I could not find an exact match in the demo catalog. Try a product, color, occasion, or budget such as “casual outfit under ₹3000” or “white sneakers”.'
  }

  const intro = isWedding
    ? 'For a wedding, I would start with polished layers and refined neutrals:'
    : isCasual
      ? `For a casual look${budget ? ` under ₹${budget.toLocaleString('en-IN')}` : ''}, try:`
      : isSneaker && isWhite
        ? 'For white sneakers, the closest catalog match is:'
        : 'Here are the closest catalog matches:'
  const items = matches.slice(0, 3).map((product) => `${product.name} (${product.price})`).join('; ')
  return `${intro} ${items}. Ask me to narrow this by color, occasion, or budget.`
}

async function requestBackend(message, history) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(ASSISTANT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
      signal: controller.signal,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(data?.detail || `Assistant service returned ${response.status}.`)
    }
    const reply = typeof data?.reply === 'string' ? data.reply.trim() : ''
    if (!reply) {
      throw new Error('The assistant returned an invalid response.')
    }
    return reply
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('The assistant took too long to respond. Please try again.')
    }
    if (error.name === 'TypeError') {
      throw new Error('The assistant is unavailable right now. Please try again shortly.')
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function askAssistant(message, history = []) {
  const trimmedMessage = String(message || '').trim()
  if (!trimmedMessage) {
    throw new Error('Please enter a fashion question first.')
  }
  return ASSISTANT_API_URL ? requestBackend(trimmedMessage, history) : fallbackReply(trimmedMessage)
}

export const isAssistantConnected = Boolean(ASSISTANT_API_URL)
