# STYLEVERSE AI — MASTER PROJECT CONTEXT

> Permanent project context and memory for StyleVerse AI.
> Generated from full-stack architectural audit and ground-truth code verification.
> Strictly excludes secrets, real keys, and passwords.

---

## 1. Project Overview

- **Project Name:** StyleVerse AI
- **Tagline:** AI Fashion Operating System
- **Repository Path:** `c:\Users\karth\Downloads\StyleVerse  AI`
- **Architecture:** Decoupled Client-Server SPA Architecture
- **Frontend Stack:** React 18.3.1, Vite 5.4.11, Tailwind CSS 3.4.15, Framer Motion 11.11.17, Three.js 0.170.0, Lucide React 0.454.0, React Router DOM 7.18.2
- **Backend Stack:** FastAPI 0.115.0, Uvicorn 0.30.6, SQLAlchemy 2.0.35, Pydantic 2, Python 3.11.9
- **Database Support:** PostgreSQL 16 (production target with pgvector extension support) / SQLite (development & local testing fallback)
- **Deployment Targets:** Frontend on Vercel (static SPA bundle), Backend on Render (Web Service), Database on Render PostgreSQL / Supabase / Neon

---

## 2. Project Goal

StyleVerse AI unifies fragmented online fashion shopping into an intelligent, end-to-end operating system. Traditional fashion discovery forces users to switch between disconnected platforms to search, compare prices, get styling advice, test fit, and track wishlist items.

StyleVerse AI solves this by integrating:
1. **Multi-Store Discovery & Price Comparison:** Cross-retailer aggregation (Amazon, Myntra, Ajio, Flipkart, Etsy) displaying real-time best prices and direct outbound merchant links.
2. **Deterministic & Semantic Fashion Search:** Token-normalized 64-dimensional semantic embeddings with synonym expansion for natural language queries (e.g. "beach party linen outfit").
3. **Automated AI Stylist:** Dynamic budget-constrained outfit builder that solves a knapsack problem across wardrobe roles (top, bottom, shoes, accessory) matching occasion, style, and color palettes.
4. **Virtual Try-On Pipeline:** Multi-stage image upload, validation, torso segmentation, garment compositing, and result serving via Pillow without third-party GPU costs.
5. **Behavior-Driven Style Profiling:** Zero-cold-start preference modeling that dynamically computes affinity scores from user views, wishlist toggles, searches, and cart interactions.
6. **Unified Commerce:** Synchronized server-side wishlist and multi-item shopping cart.

---

## 3. Current Features

| Feature | Status | Evidence |
|---|---|---|
| User Authentication | ✅ WORKING | JWT issuance (`/api/auth/signup`, `/api/auth/login`, `/api/auth/me`), bcrypt hashing, `AuthContext` state synchronization, automatic session expiry toast. |
| Product Catalog Browsing | ✅ WORKING | Paginated product queries (`/api/products`), category, brand, and price filters in `TrendingProducts.jsx`. |
| Product Details Page | ✅ WORKING | Dynamic route `/product/:id`, sizes selection, live price comparison matrix, related items carousel. |
| Semantic & Keyword Search | ✅ WORKING | `/api/products/search` and `/api/discovery`, 64-dim vector cosine similarity with SQL fallback. |
| Personalized Recommendations | ✅ WORKING | `/api/recommendations` ranking catalog items using style affinity, interaction weights, and category overlap. |
| Server-Synced Wishlist | ✅ WORKING | `/api/wishlist` endpoints with optimistic UI updates in `WishlistContext.jsx`. |
| Server-Synced Cart | ✅ WORKING | `/api/cart` endpoints with size-specific quantity modifiers in `CartContext.jsx`. |
| Price Comparison Matrix | ✅ WORKING | `/api/products/{id}/prices`, calculation of lowest offer, savings, and merchant links. |
| Merchant Outbound Redirects | ✅ WORKING | `/api/redirect/{offer_id}` and `/api/products/{id}/offers/{offer_id}/visit` tracking clicks with `sv_sid` cookies and open-redirect protection. |
| AI Stylist & Outfit Builder | ✅ WORKING (Heuristic) | `/api/stylist/recommend` performing taxonomy scoring, color alias mapping, and recursive knapsack search. |
| Virtual Try-On Pipeline | ✅ WORKING (2D Pillow) | Multi-stage image validation (`/api/try-on/upload`), torso segmentation, garment masking, alpha blending (`/api/try-on/process`). |
| Style Profile & Onboarding | ✅ WORKING | `/api/preferences` (onboarding quiz) and `/api/style-profile` (event-weighted activity analysis). |
| Admin Merchant Dashboard | ✅ WORKING | `/admin/merchants` with sync controls, feed tester, interval scheduling, and status pills. |
| Admin Catalog Quality | ✅ WORKING | `/admin/catalog` with missing-price/image checks, duplicate detection, and category filtering. |
| Admin Click Analytics | ✅ WORKING | `/admin/analytics` tracking merchant CTR, product views, and time series. |
| Floating AI Assistant Chat | 🔵 MOCKED/PLACEHOLDER | `StyleVerseAssistant.jsx` falls back to regex matching against hardcoded `src/data/products.js`; no `/api/assistant` backend endpoint exists. |
| End-to-End Checkout & Orders | ✅ WORKING | `Proceed to Checkout` in `CartSection.jsx` calls `createOrder`, clears cart, shows toast, and navigates to `/order/:id`. |

---

## 4. Technology Stack

### Frontend
- **Framework:** React 18.3.1
- **Build Tool:** Vite 5.4.11 (`@vitejs/plugin-react` 4.3.3)
- **Styling:** Tailwind CSS 3.4.15 + PostCSS 8.4.49 + Autoprefixer 10.4.20 + Custom Glassmorphic Theme
- **Animations:** Framer Motion 11.11.17
- **3D Canvas:** Three.js 0.170.0, `@react-three/fiber` 8.17.10, `@react-three/drei` 9.114.3
- **Icons:** Lucide React 0.454.0
- **Routing:** React Router DOM 7.18.2

### Backend
- **Framework:** FastAPI 0.115.0
- **ASGI Server:** Uvicorn 0.30.6 (`uvicorn[standard]`)
- **Language:** Python 3.11.9
- **ORM:** SQLAlchemy 2.0.35
- **Database Driver:** `psycopg2-binary` 2.9.10 (Postgres) + standard `sqlite3`
- **Security:** `bcrypt` 4.1.2, `PyJWT` 2.9.0, `python-multipart` 0.0.9
- **Settings & Config:** `pydantic-settings` 2.5.2, `python-dotenv` 1.0.1
- **Image Processing:** Pillow 12.3.0 (`PIL`)
- **HTTP Client:** `requests` 2.31.0

### Database & Storage
- **Primary Database:** PostgreSQL 16 (with optional `pgvector` extension)
- **Local Fallback:** SQLite 3 (`styleverse_ai.db`)
- **Media Storage:** Local disk storage (`backend/uploads/` and `backend/results/`) mounted via `StaticFiles` at `/media`

---

## 5. Complete Repository Structure

```
StyleVerse  AI/
├── .env.example                     # Frontend environment template
├── .env.production.example          # Frontend production template
├── .gitignore                       # Git ignore specifications
├── index.html                       # HTML entry point with Google Fonts
├── package.json                     # Frontend dependencies and npm scripts
├── postcss.config.js                # PostCSS Tailwind config
├── tailwind.config.js               # Theme colors, fonts, shadows, glassmorphism
├── vite.config.js                   # Vite configuration
├── render.yaml                      # Render Infrastructure-as-Code blueprint
├── PRODUCTION_ENV.md                # Deployment documentation
├── README.md                        # Project documentation and portfolio presentation
├── backend/
│   ├── .env.example                 # Backend environment variable template
│   ├── requirements.txt             # Python backend dependencies
│   ├── seed.py                      # Standalone database seeder
│   ├── test_*.py                    # 6 Root integration test scripts (require live uvicorn)
│   ├── app/
│   │   ├── database.py              # Engine, SessionLocal, pgvector initialization
│   │   ├── db_migrations.py         # Additive, non-destructive schema migrations
│   │   ├── main.py                  # FastAPI initialization, CORS, error handlers, routers
│   │   ├── connectors/              # External merchant ingestion connectors
│   │   │   ├── base.py              # Abstract ProductConnector interface
│   │   │   ├── mock_connector.py    # Local JSON connector (Amazon, Myntra, etc.)
│   │   │   ├── feed_connector.py    # Remote CSV/JSON feed parser with validation
│   │   │   └── etsy_connector.py    # Etsy Open API v3 connector with rate limiting
│   │   ├── data/
│   │   │   ├── curated_catalog.py   # Curated seed product definitions
│   │   │   └── mock_stores/         # Raw JSON files for mock retailer feeds
│   │   ├── models/                  # SQLAlchemy ORM database models
│   │   │   ├── cart.py              # Cart and CartItem models
│   │   │   ├── merchant.py          # Merchant definitions and feed configs
│   │   │   ├── merchant_click.py    # Tracked outbound merchant clicks
│   │   │   ├── merchant_sync.py     # Ingestion sync execution history
│   │   │   ├── order.py             # Order and OrderItem models
│   │   │   ├── product.py           # Product catalog model with JSON arrays
│   │   │   ├── product_offer.py     # Retailer-specific prices and store URLs
│   │   │   ├── user.py              # User credentials and admin flag
│   │   │   ├── user_event.py        # Behavior interaction events
│   │   │   ├── user_preference.py   # Stored style onboarding preferences
│   │   │   └── wishlist.py          # Wishlist and WishlistItem models
│   │   ├── routes/                  # FastAPI API route controllers
│   │   │   ├── admin.py             # Protected admin operations and sync controls
│   │   │   ├── auth.py              # User signup, login, session inspection
│   │   │   ├── cart.py              # Shopping cart CRUD
│   │   │   ├── catalog.py           # Admin catalog quality inspection
│   │   │   ├── discovery.py         # Multi-store product discovery and filtering
│   │   │   ├── events.py            # Behavior event tracking
│   │   │   ├── orders.py            # Order placement and history
│   │   │   ├── preferences.py       # Style onboarding preferences
│   │   │   ├── products.py          # Product catalog and prices
│   │   │   ├── recommendations.py   # Personalized recommendation feeds
│   │   │   ├── redirect.py          # Tracked outbound merchant redirects
│   │   │   ├── style_profile.py     # Computed style profile analysis
│   │   │   ├── stylist.py           # Outfit recommendation builder
│   │   │   ├── try_on.py            # Virtual try-on photo upload and rendering
│   │   │   └── wishlist.py          # Wishlist CRUD
│   │   ├── schemas/                 # Pydantic validation and serialization models
│   │   └── services/                # Core business logic and algorithmic pipelines
│   └── tests/                       # 16 Pytest test files (225 passing unit/integration tests)
└── src/
    ├── App.jsx                      # Main application router and shell
    ├── index.css                    # Global typography, glassmorphic utilities
    ├── main.jsx                     # React DOM entry point
    ├── components/                  # UI Components and views
    │   ├── Navbar.jsx               # Navigation bar with responsive menu and auth status
    │   ├── Hero.jsx                 # Hero section with 3D/ambient background
    │   ├── AISearch.jsx             # Search bar and active filter pills
    │   ├── TrendingProducts.jsx     # Catalog product grid with skeleton loading
    │   ├── ProductDetails.jsx       # Full product view with price comparison
    │   ├── MultiStoreDiscovery.jsx  # Multi-store product comparison feed
    │   ├── AIStylist.jsx            # Outfit generator form and visual results
    │   ├── VirtualTryOn.jsx         # Image upload and try-on simulation
    │   ├── Wishlist.jsx             # Saved items shelf
    │   ├── CartSection.jsx          # Shopping cart overview
    │   ├── StyleProfile.jsx         # Visual taste breakdown and top styles
    │   ├── StyleOnboarding.jsx      # Multi-step onboarding quiz
    │   ├── OrderHistory.jsx         # Historical order logs
    │   ├── OrderConfirmation.jsx    # Individual order details
    │   ├── LoginPage.jsx            # Tabbed Login/Register modal
    │   ├── AdminMerchantDashboard.jsx # Admin merchant sync management
    │   ├── AdminCatalogDashboard.jsx  # Admin catalog data quality
    │   ├── AdminAnalyticsDashboard.jsx # Admin click tracking and revenue analytics
    │   ├── StyleVerseAssistant.jsx  # Floating conversational assistant
    │   └── ui/                      # Shared reusable visual components
    │       ├── ProductCard.jsx      # Catalog item card with tilt and hover effects
    │       ├── ProductImage.jsx     # Smart image loader with SVG fallbacks
    │       ├── ErrorBoundary.jsx    # Component-tree error catcher
    │       └── Toast.jsx            # Notification toast system
    ├── config/
    │   └── api.js                   # Centralized API endpoints builder
    ├── context/                     # React Context State Providers
    │   ├── AuthContext.jsx          # User session, login, logout, token handling
    │   ├── CartContext.jsx          # Cart state, item counters, API synchronization
    │   ├── WishlistContext.jsx      # Saved items state and API synchronization
    │   └── ThemeContext.jsx         # Dark/light theme persistence
    ├── services/                    # API client wrappers for backend services
    └── utils/
        └── image.js                 # SVG fallbacks and image URL normalization
```

---

## 6. Frontend Architecture

- **State Management:** Modular React Context (`AuthContext`, `CartContext`, `WishlistContext`, `ThemeContext`). Token stored in `sessionStorage` (`styleverse-token`).
- **Routing:** React Router DOM v7 (`BrowserRouter` in `main.jsx`, `Routes` in `App.jsx`).
- **Data Fetching:** Service layer pattern in `src/services/`. Note: `apiClient.js` exists as a centralized wrapper with retry/backoff, but individual services currently use local `fetch` calls.
- **Image Resilience:** `ProductImage.jsx` manages multi-stage loading, error boundaries, exponential retry backoff, and category-tailored SVG fallbacks (`src/utils/image.js`).
- **Error Handling:** Top-level `ErrorBoundary.jsx` wraps entire app; component-level empty/error states in `ProductState.jsx`.

---

## 7. Backend Architecture

- **Routing & Framework:** FastAPI with modular `APIRouter` instances in `backend/app/routes/`.
- **Middleware Pipeline:**
  1. `add_request_id`: Attaches UUID4 to request state and emits `X-Request-ID` header.
  2. Exception Handlers: Unified JSON envelope for Starlette `HTTPException`, Pydantic `RequestValidationError`, and unexpected exceptions.
  3. `CORSMiddleware`: Whitelists development, preview, and production origins.
- **Background Tasks:** Asyncio-based `sync_scheduler.py` runs on startup to periodically poll merchant feeds without blocking HTTP requests.
- **Database Access:** SQLAlchemy sessions scoped per request via `Depends(get_db)`.

---

## 8. Database Architecture

- **Models:** 11 relational models with strict constraints and foreign keys:
  - `User`: Email unique index, hashed password, `is_admin` boolean flag.
  - `Product`: Catalogs item attributes, JSON lists (`colors`, `sizes`, `styles`, `occasions`, `materials`), and optional `Vector(64)` embedding.
  - `ProductOffer`: Multi-store prices, availability, URLs, and unique constraint `(product_id, store)`.
  - `Merchant`: Ingestion feed configurations (`feed_type`, `feed_url`, `feed_format`, `sync_interval_minutes`).
  - `MerchantSync`: Sync logs, durations, record counts, and JSON statistics.
  - `MerchantClick`: Outbound click analytics with session tracking.
  - `Wishlist` & `WishlistItem`: Unique `(wishlist_id, product_id)`.
  - `Cart` & `CartItem`: Unique `(cart_id, product_id, selected_size)`.
  - `Order` & `OrderItem`: Historical purchase snapshots.
  - `UserPreference`: Stored style preferences from onboarding.
  - `UserEvent`: Behavior logs (views, searches, cart actions).
- **Migrations:** Managed through `backend/app/db_migrations.py` using non-destructive, additive `ALTER TABLE` operations on application startup.

---

## 9. AI Architecture

1. **Semantic Product Search:**
   - Text normalized into tokens; semantic synonyms expanded.
   - Hashed into 64-dimensional vectors using MD5 digest modulo 64.
   - Cosine similarity computed against catalog items (accelerated by `pgvector` in Postgres; computed via Python in SQLite).
2. **AI Stylist:**
   - Rule-based taxonomy matching occasion and style against catalog categories.
   - Color alias resolution (e.g. "charcoal" -> "black").
   - Knapsack backtracking algorithm selects an optimal 4-piece outfit (top, bottom, shoes, accessory) within the user's budget.
3. **Virtual Try-On:**
   - Validates user image (MIME type, size <= 5MB, PNG/JPEG magic bytes).
   - Downloads product catalog garment image into memory.
   - Pillow compositor computes torso proportions, removes white background, adjusts brightness/contrast, and blends garment with alpha transparency onto user image.
4. **Style Profiling:**
   - Aggregates user behavior events (views, wishlists, cart additions, orders).
   - Computes weighted affinity scores across styles, categories, and colors.
5. **Conversational Assistant:**
   - Currently client-side regex matching in `assistantService.js`. No backend LLM connected.

---

## 10. Complete API Inventory

| HTTP Method | Route | Authentication | Purpose |
|---|---|---|---|
| `GET` | `/` | None | Root health message |
| `GET` | `/api/health` | None | Database connectivity check (`SELECT 1`) |
| `POST` | `/api/auth/signup` | None | User registration and JWT issuance |
| `POST` | `/api/auth/login` | None | User login and JWT issuance |
| `GET` | `/api/auth/me` | Bearer JWT | Returns current authenticated user profile |
| `GET` | `/api/products` | None | List products with optional pagination and filters |
| `GET` | `/api/products/search` | None | Semantic and keyword product search |
| `GET` | `/api/products/{id}` | None | Retrieve single product details |
| `GET` | `/api/products/{id}/prices` | None | Multi-store price comparison for product |
| `GET` | `/api/discovery` | None | Aggregated cross-store discovery with best offers |
| `GET` | `/api/redirect/{offer_id}` | Optional JWT | Tracked 302 redirect to merchant store URL |
| `GET` | `/api/products/{id}/offers/{id}/visit`| Optional JWT | Legacy redirect endpoint (tracked) |
| `POST` | `/api/events` | Optional JWT | Track user behavior event |
| `GET` | `/api/wishlist` | Bearer JWT | Retrieve user wishlist |
| `POST` | `/api/wishlist/{product_id}` | Bearer JWT | Add product to wishlist |
| `DELETE` | `/api/wishlist/{product_id}` | Bearer JWT | Remove product from wishlist |
| `GET` | `/api/cart` | Bearer JWT | Retrieve user cart |
| `POST` | `/api/cart` | Bearer JWT | Add item to cart |
| `PATCH` | `/api/cart/{product_id}` | Bearer JWT | Update cart item quantity |
| `DELETE` | `/api/cart/{product_id}` | Bearer JWT | Remove item from cart |
| `POST` | `/api/orders` | Bearer JWT | Create order from cart items |
| `GET` | `/api/orders` | Bearer JWT | List historical user orders |
| `GET` | `/api/orders/{order_id}` | Bearer JWT | Get details of a single order |
| `GET` | `/api/preferences` | Bearer JWT | Get user style onboarding preferences |
| `PUT` | `/api/preferences` | Bearer JWT | Update user style preferences |
| `POST` | `/api/preferences` | Bearer JWT | Alias to create style preferences |
| `GET` | `/api/preferences/options` | None | Get available style/category options |
| `GET` | `/api/recommendations` | Bearer JWT | Get personalized product recommendations |
| `GET` | `/api/style-profile` | Bearer JWT | Get computed style affinity profile |
| `POST` | `/api/stylist/recommend` | None | Generate outfit within occasion and budget |
| `POST` | `/api/try-on/upload` | None | Upload user photo for try-on |
| `POST` | `/api/try-on/process` | None | Generate composited try-on image |
| `GET` | `/api/try-on/results/{filename}` | None | Serve generated try-on result image |
| `POST` | `/api/admin/ingest` | Admin Key / JWT | Trigger merchant catalog ingestion |
| `GET` | `/api/admin/merchants` | Admin Key / JWT | List all merchants and sync statuses |
| `GET` | `/api/admin/merchants/{id}` | Admin Key / JWT | Get merchant details and feed config |
| `GET` | `/api/admin/merchants/{id}/syncs`| Admin Key / JWT | History of sync runs for merchant |
| `POST` | `/api/admin/merchants/{id}/sync` | Admin Key / JWT | Trigger manual sync run |
| `PUT` | `/api/admin/merchants/{id}/sync-config`| Admin Key / JWT | Update feed and cadence settings |
| `POST` | `/api/admin/merchants/{id}/feed-test` | Admin Key / JWT | Validate merchant feed without saving |
| `POST` | `/api/admin/merchants/{id}/feed-sync` | Admin Key / JWT | Ingest from configured feed URL/Etsy |
| `GET` | `/api/admin/dashboard/summary` | Admin Key / JWT | Top-level catalog and sync stats |
| `GET` | `/api/admin/connectors` | Admin Key | List available ingestion connectors |
| `GET` | `/api/admin/catalog/summary` | Admin Key / JWT | Data quality metrics and warnings |
| `GET` | `/api/admin/catalog/products` | Admin Key / JWT | Inspect catalog items with quality flags |
| `GET` | `/api/admin/catalog/products/{id}` | Admin Key / JWT | Inspect single catalog item quality |
| `GET` | `/api/admin/catalog/categories` | Admin Key / JWT | List catalog categories |
| `GET` | `/api/admin/catalog/merchants` | Admin Key / JWT | List catalog merchants |
| `GET` | `/api/admin/analytics/overview`| Admin Key / JWT | Headline click and CTR metrics |
| `GET` | `/api/admin/analytics/merchants`| Admin Key / JWT | Clicks grouped by merchant |
| `GET` | `/api/admin/analytics/products`| Admin Key / JWT | Clicks grouped by product |
| `GET` | `/api/admin/analytics/recent-clicks`| Admin Key / JWT | Chronological click stream |

---

## 11. Authentication & Security Flow

1. **Authentication Pipeline:**
   - Passwords hashed with bcrypt and random salt.
   - JWT tokens signed with HS256 and expiration set to 1440 minutes (24h).
   - Subject claim (`sub`) stores user ID integer.
   - Verified on protected routes via `get_current_user` dependency.
2. **Admin Authorization:**
   - Admin status granted if user email is in `ADMIN_EMAILS` environment variable.
   - Endpoints protected via `require_admin_access`, accepting either constant-time `hmac.compare_digest` with `ADMIN_API_KEY` or JWT with `user.is_admin == True`.
3. **Open Redirect Mitigation:**
   - `merchant_link_service` strictly validates URLs against an approved store domain whitelist (`amazon.in`, `myntra.com`, `ajio.com`, `flipkart.com`, `etsy.com`). Unsafe schemes (`javascript:`, `data:`, `file:`) are rejected.
4. **Try-On File Upload Security:**
   - File size capped at 5MB.
   - Content inspection checks magic bytes for valid PNG/JPEG headers to prevent script injection.

---

## 12. Environment Variables

### Frontend (`.env` / `.env.production`)
- `VITE_API_URL` (Required): Base URL of backend API (e.g. `https://styleverse-backend.onrender.com`).
- `VITE_ASSISTANT_API_URL` (Optional): URL for assistant backend (currently unused).

### Backend (`backend/.env`)
- `DATABASE_URL` (Required): PostgreSQL connection URL.
- `JWT_SECRET_KEY` (Required): Secret key for signing JWTs (backend fails startup if missing).
- `ADMIN_API_KEY` (Required): Secret API key for administrative operations.
- `ADMIN_EMAILS` (Optional): Comma-separated admin emails (defaults to `admin@styleverse.ai`).
- `FRONTEND_URL_PROD` (Required in Prod): Production frontend URL for CORS.
- `FRONTEND_URL_DEV` (Optional): Dev frontend origins for CORS.
- `FRONTEND_URL_PREVIEW` (Optional): Preview frontend origins for CORS.
- `MEDIA_STORAGE` (Optional): `local` (default).
- `TRYON_PROCESSOR_MODE` (Optional): `composite` (default) or `stub`.
- `ETSY_ENABLED` (Optional): `true`/`false` (default `false`).
- `ETSY_API_KEY` (Optional): Required if Etsy sync enabled.

---

## 13. Known Bugs & Code Defects

1. **[RESOLVED] FRONTEND DEFECT in `src/components/ui/ProductImage.jsx`:**
   - Status: **FIXED**. `const imgRef = useRef(null)` declared and connected. `npm run build` verified.
2. **[RESOLVED] CORS CONFIGURATION MISMATCH in `backend/app/main.py`:**
   - Status: **FIXED**. Origins collection now parses `CORS_ORIGINS`, trims whitespace, strips trailing slashes, and deduplicates with fallback dev/preview origins.
3. **[RESOLVED] MISSING VERCEL SPA REWRITE in `vercel.json`:**
   - Status: **FIXED**. `vercel.json` added to project root with `/(.*)` -> `/index.html` rewrite.
4. **[RESOLVED] RENDER BLUEPRINT YAML SYNTAX ERRORS in `render.yaml`:**
   - Status: **FIXED**. Duplicate environment keys removed; health check updated to standard `healthCheckPath: /api/health`.
5. **MISSING BACKEND ASSISTANT ENDPOINT:**
   - Status: Documented mock/client-side regex behavior in `assistantService.js`.

---

## 14. Testing Status

- **Automated Backend Tests:**
  - `backend/tests/`: 225 unit/integration tests passing (Admin API, Ingestion, Etsy, Feed Connector, Normalization, Deduplication, Click Tracking, Style Profile, User Events, Media Storage).
  - `backend/test_*.py` (root level): Migrated to FastAPI native `TestClient` (`TestClient(app)`), executing reliably in-process without requiring a live Uvicorn background server.
- **Frontend Automated Tests:**
  - Vitest 2.1.8 + `@testing-library/react` + `@testing-library/jest-dom` + `jsdom`.
  - 18 tests passing across 3 test suites:
    - `src/test/AuthContext.test.jsx` (5 tests): Initial unauthenticated state, token persistence, login state transitions, session restoration from storage, and 401 unauthorized event triggers.
    - `src/test/CartContext.test.jsx` (5 tests): Initial empty cart state, authenticated cart fetching and subtotal calculation, `addToCart` with analytics tracking, `updateQuantity` delta computation, and `removeFromCart` / `clearLocalCart`.
    - `src/test/ComponentRendering.test.jsx` (8 tests): Brand identity and navigation link rendering in `Navbar`, authenticated and unauthenticated auth state toggles in `Navbar`, brand and footer categories in `Footer`, product details, discount badge and null safety in `ProductCard`, and fallback rendering in `LoadingSkeletons`.
  - Command: `npm test` (`vitest run`).
- **Production Build:** Succeeded via `vite build` (bundle built cleanly in ~19s).

---

## 15. Deployment Verdict & Next Steps

**Verdict: 🟢 READY TO DEPLOY (All Critical Blockers Resolved & Performance Optimized)**

### Performance & Architectural Enhancements Applied:
1. **Unified API Client Architecture:**
   - Standardized all 12 standalone frontend services (`auth`, `product`, `cart`, `wishlist`, `order`, `preferences`, `recommendations`, `styleProfile`, `stylist`, `tryOn`, `admin`, `analytics`, `assistant`) to use the centralized `apiFetch` in `apiClient.js`.
   - Consistent AbortController timeout management, typed error propagation, token auth header injection, and 401 unauthorization dispatching.
2. **Frontend Code-Splitting (React.lazy & Suspense):**
   - Implemented dynamic code-splitting in `App.jsx` and `Hero.jsx` for heavy views: Admin Dashboards, Multi-Store Discovery, Three.js Holographic Mannequin (`@react-three/fiber`, `three`), Virtual Try-On, AI Stylist, and Auth/Onboarding views.
   - Built dedicated skeleton loaders in `src/components/ui/LoadingSkeletons.jsx`.
   - Reduced the initial bundle from **1,563 kB (425 kB gzip)** to **458 kB (135 kB gzip)** (~70.6% reduction).
3. **Migrated Root Backend Integration Tests to TestClient:**
   - Refactored all 6 root test files (`test_products_api.py`, `test_product_prices_api.py`, `test_recommendations_api.py`, `test_try_on_upload.py`, `test_try_on_process.py`, `test_full_tryon_workflow.py`) from raw HTTP calls (`requests`/`urllib`) against localhost to native FastAPI `TestClient`.
   - Tests execute in-process without requiring a background live Uvicorn instance (all 21 integration tests pass cleanly via pytest).

### Recommended Deployment Steps:
1. **Deploy PostgreSQL:** Create database on Render / Supabase and set `DATABASE_URL`.
2. **Deploy Backend Service on Render:** Deploy using `render.yaml` with required secrets (`DATABASE_URL`, `JWT_SECRET_KEY`, `ADMIN_API_KEY`, `FRONTEND_URL_PROD`).
3. **Deploy Frontend on Vercel:** Deploy repository to Vercel with `VITE_API_URL` set to the Render backend URL.
4. **End-to-End Sanity Check:** Verify `/api/health`, product browsing, try-on, and admin dashboards.

