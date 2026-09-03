# StyleVerse AI — Production Environment Variables

This document lists all environment variables required for production deployment.

---

## Frontend (Vite/React)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | **Yes** | Production API base URL (e.g., `https://api.yourdomain.com`) |

> **Security:** Only `VITE_API_URL` is exposed to the frontend. No secrets, tokens, or API keys are prefixed with `VITE_` — they would be embedded in the client bundle.

---

## Backend (FastAPI/Python)

### Database

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string (e.g., `postgresql://user:pass@host:5432/db`) |
| `POSTGRES_USER` | No* | PostgreSQL username (alternative to `DATABASE_URL`) |
| `POSTGRES_PASSWORD` | No* | PostgreSQL password (alternative to `DATABASE_URL`) |
| `POSTGRES_SERVER` | No* | PostgreSQL host (alternative to `DATABASE_URL`) |
| `POSTGRES_PORT` | No* | PostgreSQL port (alternative to `DATABASE_URL`) |
| `POSTGRES_DB` | No* | PostgreSQL database name (alternative to `DATABASE_URL`) |

*\*Only required if `DATABASE_URL` is not set.*

### Authentication & Security

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET_KEY` | **Yes** | Strong random secret for signing JWTs (min 32 chars). **Never commit real values.** |
| `JWT_ALGORITHM` | No | JWT algorithm (default: `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | Token expiry in minutes (default: `1440`) |
| `ADMIN_API_KEY` | **Yes** | Server-to-server key for protected admin endpoints |
| `ADMIN_EMAILS` | No | Comma-separated list of admin email addresses (default: `admin@styleverse.ai`) |

### CORS & URLs

| Variable | Required | Description |
|---|---|---|
| `CORS_ORIGINS` | **Yes** | Allowed CORS origins (comma-separated) |
| `FRONTEND_URL_DEV` | No | Development frontend URL(s) for CORS |
| `FRONTEND_URL_PROD` | No | Production frontend URL(s) for CORS |

### Media Storage

| Variable | Required | Description |
|---|---|---|
| `MEDIA_STORAGE` | No | Storage provider: `local` (default), or object-storage provider |
| `MEDIA_BASE_URL` | No | Public CDN/base URL for media (default: `/media`) |
| `MEDIA_LOCAL_ROOT` | No | Local media root path (default: `backend/uploads`) |

### Virtual Try-On

| Variable | Required | Description |
|---|---|---|
| `TRYON_PROCESSOR_MODE` | No | `composite` (default) or `stub` (placeholder mode) |
| `TRYON_MAX_UPLOAD_SIZE_BYTES` | No | Max upload size in bytes (default: `5242880` = 5MB) |

### Sync Scheduler

| Variable | Required | Description |
|---|---|---|
| `SYNC_INTERVAL_MIN_MINUTES` | No | Minimum sync interval in minutes (default: `5`) |
| `SYNC_SCHEDULER_TICK_SECONDS` | No | Scheduler tick interval in seconds (default: `60`) |

### Etsy Connector (Optional)

| Variable | Required | Description |
|---|---|---|
| `ETSY_ENABLED` | No | Enable Etsy connector (`true`/`false`, default: `false`) |
| `ETSY_API_KEY` | No* | Etsy Open API v3 key (*required if `ETSY_ENABLED=true`) |
| `ETSY_BASE_URL` | No | Etsy API base URL (default: `https://openapi.etsy.com/v3`) |
| `ETSY_KEYWORDS` | No | Default keyword search for Etsy feeds |
| `ETSY_PAGE_SIZE` | No | Page size (default: `25`, max: `100`) |
| `ETSY_MAX_PAGES` | No | Max pages per sync (default: `3`) |
| `ETSY_TIMEOUT_SECONDS` | No | Request timeout in seconds (default: `15`) |

---

## Security Checklist

- [ ] `backend/.env` is gitignored (verified)
- [ ] `JWT_SECRET_KEY` is a strong, unique value — never `change_me` or defaults
- [ ] `ADMIN_API_KEY` is a strong, unique value — never `change_me_admin_key` or defaults
- [ ] `DATABASE_URL` contains a strong database password
- [ ] `ETSY_API_KEY` (if used) is a real key obtained from Etsy developer portal
- [ ] `CORS_ORIGINS` is restricted to actual frontend domain(s)
- [ ] No secrets are prefixed with `VITE_` (they would be exposed in client bundle)
- [ ] `.env.example` and `backend/.env.example` contain only placeholder values

---

## Example Production `backend/.env`

```env
# Database
DATABASE_URL=postgresql://styleverse_prod_user:<STRONG_DB_PASS>@db.yourdomain.com:5432/styleverse_ai

# Security
JWT_SECRET_KEY=<MIN_32_CHAR_RANDOM_SECRET>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ADMIN_API_KEY=<STRONG_ADMIN_KEY>
ADMIN_EMAILS=admin@yourdomain.com,ops@yourdomain.com

# CORS
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
FRONTEND_URL_PROD=https://yourdomain.com

# Media
MEDIA_STORAGE=local
MEDIA_BASE_URL=https://cdn.yourdomain.com/media

# Etsy (optional)
ETSY_ENABLED=false
# ETSY_API_KEY=<your_etsy_key>
```

## Example Production `.env.production`

```env
VITE_API_URL=https://api.yourdomain.com
```
