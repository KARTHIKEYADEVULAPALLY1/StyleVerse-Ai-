# ✨ StyleVerse AI ✨

> **Next-Generation AI Operating System for Fashion Discovery, Virtual Try-On & Multi-Store Price Intelligence.**

[![React](https://img.shields.io/badge/React-18.3-8B5CF6?style=for-the-badge&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-00E5FF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38BDF8?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python)](https://python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Tests](https://img.shields.io/badge/Pytest-225%20Passed-brightgreen?style=for-the-badge&logo=pytest)](https://docs.pytest.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](./LICENSE)

---

## 📖 Overview

**StyleVerse AI** is a full-stack, AI-powered fashion platform designed to solve fragmented online shopping. Consumers frequently navigate across dozens of disparate fashion portals to compare prices, seek personalized styling guidance, and imagine how garments look on their body.

StyleVerse AI unifies discovery into a single cohesive experience:
- **Semantic Product Search** with natural language and taste matching.
- **Virtual Try-On Pipeline** compositing catalog garments onto user photos with lighting and scale normalization.
- **AI Stylist & Outfit Generator** solving multi-criteria outfit assembly within a strict budget.
- **Multi-Store Price Comparison** across leading fashion retailers (Myntra, Ajio, Amazon, Flipkart, Etsy).
- **Living Style Profile** quantifying real user interactions into dynamic aesthetic preferences and affinity scores.

---

## 🚀 Key Features

### 🔍 Multi-Store Discovery & Semantic AI Search
- **Natural Language Querying**: Query with expressive prompts (e.g. *"minimalist outfit for an evening dinner"*, *"athleisure sneakers for travel"*).
- **Vector-Based Embeddings**: 64-dimensional semantic embedding space with cosine similarity and synonym expansion.
- **Multi-Store Catalog Filter**: Filter by category, subcategory, brand, style, occasion, color, season, gender, and price range.
- **Sort Intelligence**: Sort by relevance, lowest price, highest rating, or newest arrivals.

### 👗 Virtual Try-On Studio
- **Client-Side Validation**: Magic-byte verification and file size limits for JPG/PNG uploads.
- **Automated Garment Extraction**: Dynamic garment isolation from catalog imagery.
- **Lighting & Color Harmonization**: Luminance and saturation matching to blend garments naturally over the torso region.
- **Dual Processing Modes**: Production-ready PIL compositing engine with configurable stub mode for microservice detachment.

### 🤖 AI Stylist & Role-Based Outfit Builder
- **Personalized Look Generation**: Formulates curated outfits based on Style (Streetwear, Minimalist, Formal, Bohemian, Athleisure, Vintage), Occasion (Casual, Office, Date Night, Party, Wedding, Travel), and Color Palette.
- **Role-Based Budget Optimizer**: Backtracking algorithm selecting Top, Bottom, Shoes, and Accessories within total budget constraints.

### 🪞 My Style Profile & Interaction Telemetry
- **Event-Driven Learning**: Logs user clickstream events (product views, wishlist actions, cart additions, orders).
- **Weighted Profile Strength (0–100)**: Dynamically weights purchases (4x), cart additions (3x), wishlists (2x), and views (1x) to compute genuine aesthetic affinity.
- **Zero Hallucination**: Preferences derived strictly from verifiable user actions rather than self-reported surveys.

### 💰 Smart Multi-Store Price Comparison
- **Aggregate Offer Engine**: Compares pricing and stock status across major retailers (Myntra, Ajio, Amazon, Flipkart).
- **Best Price & Savings Calculator**: Automatically identifies the best in-stock deal and calculates savings percentage.
- **Click Tracking & Outbound Redirect**: Transparent tracking of affiliate/merchant clicks with analytics telemetry.

### 🛡️ Admin Catalog & Merchant Management
- **Catalog Management Dashboard**: View, inspect, activate, and manage product inventory.
- **Merchant Sync Dashboard**: Sync state with external e-commerce feeds (including Etsy Open API v3 connector).
- **Analytics Dashboard**: Real-time monitoring of engagement, views, click-through rates, and revenue metrics.

### 🛒 Saved Shopping Experience
- **JWT Authentication**: Secure signup, login, session persistence, and role-based admin elevation.
- **Persistent Wishlist & Shopping Cart**: Server-synced saved items for comparing products before following a retailer's Shop Now link.

---

## 🧠 AI Features & Implementation

```mermaid
flowchart TD
    subgraph Client ["Frontend (React + Vite)"]
        UserQuery["User Search / Natural Language Query"]
        UserPhoto["User Uploaded Photo (JPG/PNG)"]
        UserPref["User Style Onboarding & Interactions"]
    end

    subgraph API ["FastAPI Gateway"]
        AuthMid["JWT Auth & Request ID Middleware"]
        Router["Route Controllers (/discovery, /stylist, /try-on, /style-profile)"]
    end

    subgraph Intelligence ["AI & Processing Services"]
        VectorEngine["Semantic Vector Engine (64-dim Embeddings + Cosine Similarity)"]
        StylistEngine["Stylist Engine (Taxonomy Scoring + Budget Knapsack)"]
        TryOnCompositor["Virtual Try-On Compositor (Pillow Torso Fitting + Lighting Match)"]
        StyleProfiler["Style Profiler (Weighted Telemetry Aggregation)"]
    end

    subgraph Data ["Persistence Layer"]
        DB[("PostgreSQL 16 / SQLite")]
        Media["Local / Cloud Media Storage"]
    end

    UserQuery --> Router
    UserPhoto --> Router
    UserPref --> Router

    Router --> VectorEngine
    Router --> StylistEngine
    Router --> TryOnCompositor
    Router --> StyleProfiler

    VectorEngine --> DB
    StylistEngine --> DB
    TryOnCompositor --> Media
    StyleProfiler --> DB
```

### 1. Semantic Product Discovery
- Vector dimensions: 64-dimensional deterministic semantic embedding vectors.
- Similarity Metric: Cosine similarity over normalized metadata vectors.
- Synonym expansion across high-fashion taxonomies (`formal`, `minimal`, `athleisure`, `streetwear`, `winter`, `summer`).
- Database compatibility: Native fallback to SQLite for local development; supports `pgvector` extension on PostgreSQL 16.

### 2. Virtual Try-On Pipeline
```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as React Virtual Try-On
    participant API as FastAPI Backend
    participant Storage as Media Storage
    participant Compositor as Image Compositor (Pillow)

    User->>UI: Upload photo (file picker / drag & drop)
    UI->>API: POST /api/try-on/upload (multipart/form-data)
    API->>Storage: Verify magic bytes & store safely
    Storage-->>API: upload_id (UUID/MD5)
    API-->>UI: 201 Created { upload_id, filename }
    User->>UI: Select garment & click "Try On"
    UI->>API: POST /api/try-on/process { upload_id, product_id }
    API->>Compositor: compose_try_on(user_image, garment_url)
    Compositor->>Compositor: Detect torso band & scale garment
    Compositor->>Compositor: Calculate torso luminance & adjust brightness/saturation
    Compositor->>Compositor: Feather edges with soft Gaussian mask
    Compositor->>Storage: Save composite JPEG (quality 92)
    Storage-->>API: result_image_path
    API-->>UI: 200 OK { status: 'completed', result_image: '/api/try-on/results/...' }
    UI-->>User: Render interactive before/after try-on preview
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18.3
- **Build Tool**: Vite 5.4
- **Styling**: Tailwind CSS 3.4, PostCSS, Vanilla CSS tokens
- **Animations**: Framer Motion 11
- **Icons**: Lucide React
- **Routing**: React Router 7
- **3D Elements**: Three.js, React Three Fiber, React Three Drei

### Backend
- **Framework**: FastAPI 0.115
- **Language**: Python 3.11+
- **Database ORM**: SQLAlchemy 2.0
- **Validation**: Pydantic 2.5
- **Image Processing**: Pillow 12.3
- **Authentication**: PyJWT 2.9, Bcrypt 4.1
- **Server**: Uvicorn 0.30

### Database & Storage
- **Production**: PostgreSQL 16 with `pgvector` extension
- **Development**: SQLite with automated schema migration
- **Media Engine**: Abstracted `MediaStorage` interface supporting local filesystem and object storage

### Testing & Tooling
- **Test Suite**: Pytest 8.3 (225 passing integration and unit tests)
- **Code Quality**: Strict type hints, RESTful API conventions, OpenAPI 3.1 specification

---

## 📂 Project Structure

```
StyleVerse-AI/
├── public/                       # Static public assets & favicon
├── src/                          # React frontend
│   ├── components/               # UI components
│   │   ├── hero/                 # Hero section & animations
│   │   ├── ui/                   # Reusable UI primitives (ProductCard, Toast, ErrorBoundary)
│   │   ├── AIFeatures.jsx        # AI feature showcase
│   │   ├── AISearch.jsx          # AI natural language search
│   │   ├── AIStylist.jsx         # Outfit generation interface
│   │   ├── AdminCatalogDashboard.jsx # Catalog management dashboard
│   │   ├── AdminMerchantDashboard.jsx# Merchant & feed management
│   │   ├── AdminAnalyticsDashboard.jsx# Telemetry & performance metrics
│   │   ├── CartSection.jsx       # Shopping cart & quantity management
│   │   ├── MultiStoreDiscovery.jsx # Multi-store discovery & filter matrix
│   │   ├── OrderConfirmation.jsx # Historical order detail view
│   │   ├── OrderHistory.jsx      # Historical orders view
│   │   ├── PriceComparison.jsx   # Store offer price comparison
│   │   ├── ProductDetails.jsx    # Product specification & store offers
│   │   ├── Profile.jsx           # User account settings
│   │   ├── StyleOnboarding.jsx   # Visual interactive style quiz
│   │   ├── StyleProfile.jsx      # Style profile & affinity dashboard
│   │   ├── VirtualTryOn.jsx      # Virtual try-on studio & photo upload
│   │   └── Wishlist.jsx          # Saved items collection
│   ├── context/                  # Context providers (Auth, Cart, Wishlist, Theme)
│   ├── data/                     # Fallback & seed datasets
│   ├── services/                 # API client & domain service modules
│   ├── utils/                    # Image helpers, formatting utilities
│   ├── App.jsx                   # Application router & layout
│   ├── index.css                 # Global CSS & Tailwind layers
│   └── main.jsx                  # React application bootstrap
│
├── backend/                      # FastAPI Python backend
│   ├── app/
│   │   ├── connectors/           # External merchant connectors (Etsy, Feed)
│   │   ├── models/               # SQLAlchemy ORM database models
│   │   ├── routes/               # API route endpoints
│   │   ├── schemas/              # Pydantic request/response schemas
│   │   ├── services/             # Core business logic & AI algorithms
│   │   ├── database.py           # Database engine & session lifecycle
│   │   ├── db_migrations.py      # Schema migration runner
│   │   └── main.py               # FastAPI entrypoint & middleware configuration
│   ├── tests/                    # Pytest test suite (225 tests)
│   ├── requirements.txt          # Python dependencies
│   ├── seed.py                   # Initial catalog & store offer seeder
│   ├── .env.example              # Backend environment template
│   └── .gitignore                # Backend specific exclusions
│
├── .env.example                  # Frontend environment template
├── .gitignore                    # Git exclusions
├── index.html                    # HTML entry template
├── package.json                  # Node dependencies & scripts
├── tailwind.config.js            # Tailwind styling tokens & theme
├── vite.config.js                # Vite build configuration
├── LICENSE                       # MIT License
└── README.md                     # Project documentation
```

---

## ⚙️ Installation & Setup

### Prerequisites
- **Node.js** (v18+)
- **Python** (3.11+)
- **PostgreSQL 16+** *(Optional — SQLite is used automatically if PostgreSQL is not configured)*

---

### 1. Clone the Repository
```bash
git clone https://github.com/KARTHIKEYADEVULAPALLY1/StyleVerse-Ai-.git
cd StyleVerse-Ai-
```

---

### 2. Frontend Setup
```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev
```
> The frontend will run at: `http://localhost:5173/`

---

### 3. Backend Setup
```bash
cd backend

# Create and activate a Python virtual environment
python -m venv .venv

# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# On macOS / Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create your local environment configuration
cp .env.example .env

# Start the FastAPI server
python -m uvicorn app.main:app --reload --port 8000
```
> The backend will run at: `http://127.0.0.1:8000/`  
> Interactive OpenAPI documentation: `http://127.0.0.1:8000/docs`

---

## 🔐 Environment Variables

### Frontend (`.env` at project root)
Copy `.env.example` to `.env`:
```ini
# Main Backend API Base URL
VITE_API_BASE_URL=http://127.0.0.1:8000

# Endpoint configurations
VITE_PRODUCTS_API_URL=http://127.0.0.1:8000/api/products
VITE_AUTH_API_URL=http://127.0.0.1:8000/api/auth
VITE_WISHLIST_API_URL=http://127.0.0.1:8000/api/wishlist
VITE_CART_API_URL=http://127.0.0.1:8000/api/cart
VITE_ORDER_API_URL=http://127.0.0.1:8000/api/orders
VITE_RECOMMENDATIONS_API_URL=http://127.0.0.1:8000/api
VITE_STYLIST_API_URL=http://127.0.0.1:8000/api/stylist
VITE_TRYON_API_URL=http://127.0.0.1:8000/api/try-on
```

### Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env`:
```ini
# Database (leave empty to automatically use SQLite styleverse_ai.db)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/styleverse

# Security
JWT_SECRET_KEY=change_me_to_a_strong_random_secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Admin Access Key for Ingestion & Sync API
ADMIN_API_KEY=change_me_admin_key

# CORS configuration
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Virtual Try-On mode ("composite" for real image generation or "stub")
TRYON_PROCESSOR_MODE=composite
```

---

## 📡 API Reference Overview

| Domain | Method | Path | Description | Auth Required |
|---|---|---|---|---|
| **System** | `GET` | `/api/health` | Service health status | No |
| **Auth** | `POST` | `/api/auth/signup` | Register new user account | No |
| **Auth** | `POST` | `/api/auth/login` | Authenticate and obtain JWT | No |
| **Auth** | `GET` | `/api/auth/me` | Fetch authenticated profile | `Bearer JWT` |
| **Discovery** | `GET` | `/api/discovery` | Multi-store catalog search with filters & best offer | No |
| **Products** | `GET` | `/api/products` | Retrieve catalog products | No |
| **Products** | `GET` | `/api/products/{id}` | Get product details | No |
| **Price Comparison** | `GET` | `/api/products/{id}/prices` | Compare merchant offers | No |
| **AI Stylist** | `POST` | `/api/stylist/recommend` | Generate outfit by style, occasion & budget | No |
| **Virtual Try-On** | `POST` | `/api/try-on/upload` | Upload user photo for try-on | No |
| **Virtual Try-On** | `POST` | `/api/try-on/process` | Composite garment on uploaded photo | No |
| **Style Profile** | `GET` | `/api/style-profile` | Get computed style preferences & profile strength | `Bearer JWT` |
| **Wishlist** | `GET` | `/api/wishlist` | Get user saved items | `Bearer JWT` |
| **Wishlist** | `POST` | `/api/wishlist/{product_id}` | Add product to wishlist | `Bearer JWT` |
| **Cart** | `GET` | `/api/cart` | Get shopping cart | `Bearer JWT` |
| **Cart** | `POST` | `/api/cart` | Add item with size to cart | `Bearer JWT` |
| **Orders** | `POST` | `/api/orders` | Place order from cart | `Bearer JWT` |
| **Orders** | `GET` | `/api/orders` | View order history | `Bearer JWT` |
| **Admin** | `POST` | `/api/admin/ingest` | Ingest new products into catalog | `Admin Key / JWT` |
| **Admin** | `POST` | `/api/admin/sync/{merchant_id}`| Trigger merchant inventory sync | `Admin Key / JWT` |

---

## 🧪 Testing & Validation

The backend contains a test suite covering endpoints, authentication, image compositing, merchant synchronization, click tracking, and catalog deduplication.

```bash
# Run the complete test suite
python -m pytest backend/tests -v
```

```
================= 224 passed, 1 skipped in 30.47s =================
```

---

## 👨‍💻 Author

**Karthikeya Devulapally**
- **GitHub**: [@KARTHIKEYADEVULAPALLY1](https://github.com/KARTHIKEYADEVULAPALLY1)
- **LinkedIn**: [Karthikeya Devulapally](https://www.linkedin.com/in/karthikeyadevulapally/)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.