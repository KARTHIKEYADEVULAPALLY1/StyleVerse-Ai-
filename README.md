<div align="center">

# ✨ StyleVerse AI ✨

### AI-Powered Fashion Discovery & E-Commerce Platform

![React](https://img.shields.io/badge/React-18.3-8B5CF6)
![Vite](https://img.shields.io/badge/Vite-5.4-00E5FF)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38BDF8)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)
![Python](https://img.shields.io/badge/Python-3.11-3776AB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)

**Search Once. Compare Everywhere. Try Before You Buy.**

</div>

---

## 📖 Overview

StyleVerse AI is a full-stack AI-powered fashion e-commerce platform that combines intelligent product discovery, personalized recommendations, and smart price comparison. The application features a modern React frontend with a FastAPI backend, delivering a premium fashion shopping experience.

---

## ✨ Current Features

### 🧠 AI Search
- Semantic product search using deterministic embeddings (MD5-hash based with synonym expansion)
- Natural language query support (e.g., "something elegant for a dinner")
- Filter by category, brand, and max price
- Trending search suggestions with rotating placeholders
- Debounced real-time search results

### 👗 Virtual Try-On (MVP/Stub)
- Upload a JPG/PNG photo (max 5 MB) with client-side validation
- Drag & drop or file picker upload with progress tracking
- Secure server-side image storage with magic-byte validation
- **Note:** Currently uses a stub processor — returns a "processing" status without generating an actual try-on image. The processor abstraction is ready for a real AI model.

### 🤖 AI Stylist
- Personalized outfit recommendations based on:
  - Style Profile (Streetwear, Minimalist, Formal, Bohemian, Athleisure, Vintage)
  - Occasion (Casual, Office, Date Night, Party, Wedding, Travel)
  - Color Palette (Neutrals, Earth Tones, Cool Blues, Bold & Bright, Monochrome)
  - Budget (₹1,000 – ₹10,000)
- Rule-based category/occasion/color matching against the product catalog

### 🪞 My Style Profile
- Aggregates your real activity (views, wishlist, cart, purchases) into a living style profile
- Derives favorite categories, brands, colors, preferred styles, and average price preference — strictly from actual interactions, never invented or self-claimed
- Weighted **Profile Strength** score (0–100): Purchases > Wishlists > Cart adds > Views
- Visual color swatches, price preference in ₹, and profile breakdown by intent
- Transparent privacy messaging linking to how StyleVerse learns your style

### 💰 Smart Price Comparison
- Multi-store price comparison (Ajio, Myntra, Amazon, Flipkart)
- Best price highlighting with savings calculation
- Store availability and rating display
- **Note:** Store offers are currently seeded/simulated, not live e-commerce data

### ❤️ Wishlist
- Add/remove products to a persistent wishlist
- Server-side storage tied to user account
- Wishlist state syncs across sessions

### 🛒 Cart & Orders
- Add products to cart with size selection
- Update quantities and remove items
- Place orders from cart
- Order history and order details
- Cart automatically clears after order placement

### 🔐 Authentication
- JWT-based authentication (signup, login, logout)
- Session persistence with token verification on page load
- Protected routes for wishlist, cart, and recommendations
- Demo account: `test@example.com` / `TestPassword123`

### 🎨 Fashion-Forward Design
- Custom fashion logo with animated gradient
- Pink/violet/cyan color palette
- Glass morphism effects with dark/light mode
- Smooth animations (Framer Motion)
- Magnetic buttons, tilt cards, glow effects
- Floating particles and cursor glow
- Fully responsive layout

---

## 🚀 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | Frontend framework |
| **Vite 5** | Build tool & dev server |
| **Tailwind CSS 3** | Utility-first styling |
| **Framer Motion** | Animations & transitions |
| **React Router 6** | Client-side routing |
| **Lucide React** | Icon library |

### Backend
| Technology | Purpose |
|------------|---------|
| **Python 3.11+** | Backend language |
| **FastAPI 0.115** | Web framework |
| **SQLAlchemy 2.0** | ORM |
| **Pydantic 2** | Data validation |
| **PyJWT** | JWT authentication |
| **Bcrypt** | Password hashing |

### Database
| Technology | Purpose |
|------------|---------|
| **PostgreSQL 16** | Production database |
| **SQLite** | Development fallback |
| **pgvector** | Vector search (optional) |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      React Frontend                         │
│  Components: Hero, AISearch, ProductDetails, VirtualTryOn,  │
│  AIStylist, Wishlist, Cart, Orders, Auth, Profile           │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST/JSON (CORS enabled)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      FastAPI Backend                         │
│  Routes: auth, products, recommendations, stylist,          │
│  try-on, wishlist, cart, orders                             │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Services Layer                          │
│  product_service (semantic search, seeding)                 │
│  price_service (multi-store comparison)                     │
│  recommendation_service (behavior-based scoring)            │
│  stylist_service (rule-based outfit matching)               │
│  try_on_service (image upload validation)                   │
│  virtual_try_on_service (processor abstraction)             │
│  auth_service (JWT) · cart_service · order_service          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database                                │
│  PostgreSQL (prod) / SQLite (dev)                           │
│  Tables: products, product_offers, users, wishlists,        │
│  carts, orders, order_items                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
StyleVerse-AI/
│
├── src/                          # React frontend
│   ├── components/
│   │   ├── ui/                   # Reusable UI primitives
│   │   ├── hero/                 # Hero section components
│   │   ├── AISearch.jsx          # AI-powered search
│   │   ├── AIStylist.jsx         # AI outfit recommendations
│   │   ├── VirtualTryOn.jsx      # Virtual try-on upload
│   │   ├── StyleProfile.jsx      # My Style Profile dashboard
│   │   ├── ProductDetails.jsx    # Product detail page
│   │   ├── PriceComparison.jsx   # Multi-store price comparison
│   │   ├── Wishlist.jsx          # User wishlist
│   │   ├── CartSection.jsx       # Shopping cart
│   │   ├── OrderConfirmation.jsx # Order confirmation
│   │   ├── LoginPage.jsx         # Login/Signup
│   │   └── ...                   # Other components
│   ├── context/                  # React contexts (Auth, Cart, Wishlist, Theme)
│   ├── data/                     # Static data & seed fallbacks
│   ├── services/                 # API service layer
│   ├── App.jsx                   # Main app with routing
│   └── main.jsx                  # Entry point
│
├── backend/                      # FastAPI backend
│   ├── app/
│   │   ├── models/               # SQLAlchemy models
│   │   ├── routes/               # API route handlers
│   │   ├── schemas/              # Pydantic schemas
│   │   └── services/             # Business logic services
│   ├── uploads/                  # User-uploaded try-on images (gitignored)
│   ├── requirements.txt
│   ├── seed.py                   # Database seeding script
│   └── .env.example              # Backend environment template
│
├── .env.example                  # Frontend environment template
├── .gitignore
├── package.json
└── README.md
```

---

## 📡 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/health` | Health check | No |
| POST | `/api/auth/signup` | Register a new user | No |
| POST | `/api/auth/login` | Login & get JWT | No |
| GET | `/api/auth/me` | Get current user profile | JWT |
| GET | `/api/style-profile` | Personalized style profile from real activity | JWT |
| GET | `/api/products` | List all products | No |
| GET | `/api/products/search?q=` | Semantic product search | No |
| GET | `/api/products/{id}` | Get product details | No |
| GET | `/api/products/{id}/prices` | Multi-store price comparison | No |
| GET | `/api/recommendations` | Personalized recommendations | JWT |
| POST | `/api/stylist/recommend` | AI outfit recommendations | No |
| POST | `/api/try-on/upload` | Upload try-on photo | No |
| POST | `/api/try-on/process` | Process virtual try-on (MVP stub) | No |
| GET | `/api/wishlist` | Get user wishlist | JWT |
| POST | `/api/wishlist/{product_id}` | Add to wishlist | JWT |
| DELETE | `/api/wishlist/{product_id}` | Remove from wishlist | JWT |
| GET | `/api/cart` | Get user cart | JWT |
| POST | `/api/cart` | Add item to cart | JWT |
| PATCH | `/api/cart/{product_id}` | Update cart item quantity | JWT |
| DELETE | `/api/cart/{product_id}` | Remove item from cart | JWT |
| POST | `/api/orders` | Create order from cart | JWT |
| GET | `/api/orders` | List user orders | JWT |
| GET | `/api/orders/{order_id}` | Get order details | JWT |

---

## 🚀 Setup

### Prerequisites

- **Node.js** (v18+)
- **Python** (3.11+)
- **PostgreSQL** (16+) — optional, SQLite fallback works for development

### 1. Clone the repository

```bash
git clone https://github.com/KARTHIKEYADEVULAPALLY1/StyleVerse-Ai-.git
cd StyleVerse-Ai-
```

### 2. Frontend Setup

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:5173/`

### 3. Backend Setup

```bash
cd backend

# Create a virtual environment (recommended)
python -m venv .venv

# Activate it
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Windows CMD:
.\.venv\Scripts\activate.bat
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy the environment template
copy .env.example .env   # Windows
cp .env.example .env     # macOS/Linux

# Update .env with your PostgreSQL settings (or leave defaults for SQLite)

# Start the backend server
python -m uvicorn app.main:app --reload
```

The backend will be available at `http://127.0.0.1:8000/`

### 4. Database Setup

**Option A: SQLite (default, zero-config)**

The application automatically falls back to SQLite (`styleverse_ai.db`) if no `DATABASE_URL` is set. Tables are created and products are seeded automatically on startup.

**Option B: PostgreSQL**

1. Create a database:
   ```sql
   CREATE DATABASE styleverse_ai;
   ```

2. Update `backend/.env`:
   ```
   POSTGRES_USER=your_user
   POSTGRES_PASSWORD=your_password
   POSTGRES_SERVER=localhost
   POSTGRES_PORT=5432
   POSTGRES_DB=styleverse_ai
   DATABASE_URL=postgresql://your_user:your_password@localhost:5432/styleverse_ai
   ```

3. The application auto-creates tables and seeds 10 products on startup.

---

## 🔧 Environment Variables

### Frontend (`.env` at project root)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_PRODUCTS_API_URL` | Products API base URL | `http://127.0.0.1:8000/api/products` |
| `VITE_AUTH_API_URL` | Auth API base URL | `http://127.0.0.1:8000/api/auth` |
| `VITE_WISHLIST_API_URL` | Wishlist API base URL | `http://127.0.0.1:8000/api/wishlist` |
| `VITE_CART_API_URL` | Cart API base URL | `http://127.0.0.1:8000/api/cart` |
| `VITE_ORDER_API_URL` | Orders API base URL | `http://127.0.0.1:8000/api/orders` |
| `VITE_RECOMMENDATIONS_API_URL` | Recommendations API base URL | `http://127.0.0.1:8000/api` |
| `VITE_STYLIST_API_URL` | Stylist API base URL | `http://127.0.0.1:8000/api/stylist` |
| `VITE_TRYON_API_URL` | Try-on API base URL | `http://127.0.0.1:8000/api/try-on` |

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_USER` | PostgreSQL username | `styleverse_user` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `change_me` |
| `POSTGRES_SERVER` | PostgreSQL host | `localhost` |
| `POSTGRES_PORT` | PostgreSQL port | `5432` |
| `POSTGRES_DB` | PostgreSQL database name | `styleverse_ai` |
| `DATABASE_URL` | Full database URL (overrides individual vars) | *(empty → SQLite)* |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:5173,http://127.0.0.1:5173` |
| `JWT_SECRET_KEY` | JWT signing secret | `change_me_to_a_strong_random_secret` |
| `JWT_ALGORITHM` | JWT signing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiry in minutes | `1440` |

---

## 🧪 Testing

### Backend Tests

The backend includes integration test scripts that verify API behavior:

```bash
cd backend

# Product API tests
python test_products_api.py

# Price comparison tests
python test_product_prices_api.py

# Recommendation tests
python test_recommendations_api.py

# Try-on upload tests
python test_try_on_upload.py

# Try-on process tests
python test_try_on_process.py
```

**Note:** Tests require the backend server to be running on `http://127.0.0.1:8000`.

### Test Coverage

| Test File | Covers |
|-----------|--------|
| `test_products_api.py` | Product listing, product details, 404 handling, OpenAPI schema |
| `test_product_prices_api.py` | Multi-store price comparison, best price, savings, out-of-stock exclusion |
| `test_recommendations_api.py` | Auth requirement, new-user fallback, purchased product exclusion |
| `test_try_on_upload.py` | Valid PNG/JPEG upload, invalid file rejection, oversized file rejection |
| `test_try_on_process.py` | Valid process request, invalid product 404, missing image 404, path traversal 400 |

---

## 📚 API Documentation

FastAPI automatically generates interactive Swagger documentation:

```
http://127.0.0.1:8000/docs
```

You can test all endpoints directly from the browser.

---

## ⚠️ Current Limitations

The following features are **not fully implemented** and should be treated as MVP/simulated:

1. **Virtual Try-On** — Uses a `StubVirtualTryOnProcessor` that returns a "processing" status. No actual try-on image is generated. The processor abstraction is ready for a real AI model integration.

2. **Price Comparison** — Store offers are seeded/simulated using fixed multipliers (Ajio 0.92×, Myntra 0.95×, Amazon 1.0×, Flipkart 1.05×). Not connected to live e-commerce data.

3. **AI Stylist** — Uses rule-based keyword/category scoring against the product catalog. Not powered by a large language model.

4. **Recommendations** — Uses behavior-based scoring (category/brand/style/price affinity from wishlist and order history). Not powered by a machine learning model.

5. **AI Search** — Uses deterministic MD5-hash semantic embeddings with cosine similarity. Not powered by a real embedding model (e.g., OpenAI, BERT).

6. **Auth Session** — Uses `sessionStorage` for JWT persistence, so sessions are cleared when the browser tab is closed.

---

## 🗺️ Roadmap

### Short-term
- [ ] Replace Virtual Try-On stub with a real AI model (e.g., Stable Diffusion Inpainting)
- [ ] Add result image field to try-on response schema
- [ ] Add background processing with status polling for long-running try-on inference

### Medium-term
- [ ] Integrate live price data from real e-commerce APIs
- [ ] Upgrade AI Stylist to use an LLM for natural language outfit generation
- [ ] Upgrade recommendations to use collaborative filtering or embedding-based models
- [ ] Add pagination to product listing and search results

### Long-term
- [ ] Production deployment (Vercel + Render/Railway)
- [ ] Add observability (logging, metrics, tracing)
- [ ] Add rate limiting and enhanced security
- [ ] Add CI/CD pipeline with automated tests
- [ ] Add email verification and password reset

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

---

<div align="center">

**Made with 💗 by Karthikeya Devulapally**

[![GitHub](https://img.shields.io/badge/GitHub-KARTHIKEYADEVULAPALLY1-181717?style=for-the-badge&logo=github)](https://github.com/KARTHIKEYADEVULAPALLY1)

</div>