# Mini ERP + CRM Operations Portal

A full-stack internal operations portal for a wholesale/distribution company. Built with NestJS, PostgreSQL, Prisma, React, and Tailwind CSS.

**Live URLs:**
- **Frontend:** [https://erp-crm-operations-portal.vercel.app](https://erp-crm-operations-portal.vercel.app)
- **Backend API:** [https://erp-crm-api.onrender.com](https://erp-crm-api.onrender.com)
- **Database:** Neon (PostgreSQL 16, pooled connection)

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Features](#features)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Roles & Permissions](#roles--permissions)
- [Test Credentials](#test-credentials)
- [API Endpoints](#api-endpoints)
- [Running with Docker](#running-with-docker)
- [CI/CD](#cicd)
- [Bonus Features](#bonus-features)
- [Assumptions & Design Decisions](#assumptions--design-decisions)
- [Known Limitations](#known-limitations)
- [Deployment Guide](#deployment-guide)
- [Submission Checklist](#submission-checklist)

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Backend Framework | NestJS | 11.x |
| Database | PostgreSQL (via Docker or local) | 16 Alpine |
| ORM | Prisma | 5.x |
| Frontend | React + TypeScript (Vite) | 19.x / 8.x |
| Styling | Tailwind CSS | 4.x |
| Auth | JWT (Access + Refresh token pair) | Custom |
| PDF Generation | pdfkit | Latest |
| CI | GitHub Actions | — |
| Containerization | Docker + docker-compose | — |

## Architecture Overview

### Module Structure (NestJS)

The backend follows NestJS's modular architecture with clear separation of concerns:

```
src/
├── auth/          — JWT login/refresh/logout, Guards, Decorators
├── users/         — User CRUD (internal, minimal)
├── customers/     — Customer CRM + Follow-up notes
├── products/      — Product CRUD + Stock movements (w/ transactions)
├── challans/      — Sales challan draft/confirm/cancel + PDF export
├── prisma/        — Shared PrismaService (injectable DB client)
└── common/        — Shared Guards, Decorators, Filters
```

### Confirm Challan Transaction Design

The most critical business logic is the `PATCH /challans/:id/confirm` endpoint. It is wrapped in a **Prisma `$transaction`** with the following guarantees:

1. **Row-level locking:** Each product row is re-fetched using `findUnique` within the transaction (Prisma uses `SELECT FOR UPDATE` under repeatable-read isolation).
2. **Sorted by productId:** Items are sorted by `productId` before locking to prevent deadlock when two concurrent confirmations involve overlapping products.
3. **Stock check before deduction:** Each item's `currentStock >= quantity` is verified. If any item falls short, the entire transaction rolls back and a `400` is returned naming the understocked product(s).
4. **Atomic snapshot update:** On confirmation, current product name and unit price are written into `ChallanItem.productNameSnapshot` and `ChallanItem.unitPriceSnapshot` (overwriting the draft-time snapshot) so the challan always reflects prices at the moment of sale.
5. **No partial state:** If any step fails (stock insufficient, DB error), zero stock is deducted and no movement log is written.

### Frontend Structure

```
src/
├── api/           — Axios client with auto-refresh interceptor
├── components/    — Reusable (ProtectedRoute, ToastContainer)
├── layouts/       — Dashboard sidebar + topbar shell
├── pages/         — Per-module page components
│   ├── login/
│   ├── dashboard/
│   ├── customers/ (list, form, detail)
│   ├── products/  (list, form, detail)
│   └── challans/  (builder, list, detail)
├── stores/        — Zustand stores (auth, toast)
└── types/         — TypeScript interfaces matching backend models
```

### Key Data Flow

```
Client → JwtAuthGuard (validates token) → RolesGuard (checks role) → Controller → Service → Prisma → PostgreSQL
```

The frontend mirrors this: `ProtectedRoute` blocks unauthenticated access, then role-based UI gating hides action buttons the user's role cannot use (buttons for write operations behind `['ADMIN', 'SALES']` checks, etc.). The backend enforces all permission checks at the API layer as the authoritative source.

## Features

### Core (Phases 0–8)

- **Authentication:** JWT access + refresh token pair with rotation. Refresh tokens stored as bcrypt hashes. Auto-refresh on 401 via Axios interceptor.
- **Role-Based Access Control:** 4 roles — Admin, Sales, Warehouse, Accounts. Frontend gates UI elements; backend enforces at every endpoint.
- **Customer CRM:** Full CRUD with pagination, search by name/mobile, filter by status/type. Follow-up notes with timestamps and author tracking.
- **Product & Inventory:** CRUD with unique SKU enforcement. Stock movement log with atomic IN/OUT adjustments (writes movement + updates stock in one transaction). Low-stock flag computed at query time.
- **Sales Challans:** Draft → Confirm → Cancel workflow. Auto-generated challan number format `CH-YYYY-XXXXX`. Product snapshots taken at draft time and refreshed at confirm time. Confirmation uses atomic `$transaction` with row-level locks, sorted by productId to prevent deadlocks. Insufficient stock returns a clear 400 naming the short product(s). Only Draft challans can be cancelled.
- **Frontend:** Responsive admin shell (sidebar with hamburger menu on mobile). Toast notifications for success/error feedback. Dashboard widget showing low-stock and draft challan counts.

### Bonus (Phase 9)

- **Docker:** Multi-stage `Dockerfile` for backend. `docker-compose.yml` with Postgres 16 for one-command local dev.
- **GitHub Actions CI:** Workflow that runs `npm ci` + `npm run build` on both backend and frontend, plus `prisma validate` on push/PR to `main`.
- **PDF Export:** `GET /challans/:id/pdf` generates a PDF invoice via pdfkit with company header, customer info, itemised table with line totals.
- **Product Image Upload:** `POST /products/:id/image` accepts multipart uploads, stores locally in `uploads/products/`, serves via `ServeStaticModule`. S3-ready abstraction — swap `STORAGE_DRIVER=s3` and implement `ProductsImageService.upload()` with AWS SDK.

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16 (or Docker)
- npm

### Local Setup (without Docker)

```bash
# 1. Clone and install
git clone <repo-url>
cd erp-crm-portal

# Backend
cd backend
cp .env.example .env      # Edit DATABASE_URL if needed
npm install
npx prisma migrate deploy
npx prisma db seed
npm run start:dev          # Runs on port 3000

# Frontend (in a separate terminal)
cd frontend
cp .env.example .env       # VITE_API_BASE_URL defaults to http://localhost:3000
npm install
npm run dev                # Runs on port 5173
```

### Local Setup (with Docker)

```bash
# Start Postgres + backend containers
docker compose up --build

# Run migrations & seed in the running backend container
docker exec erp_crm_api npx prisma migrate deploy
docker exec erp_crm_api npx prisma db seed

# Frontend (runs outside Docker, separate terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and log in with any test credential.

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (pooled for queries) | `postgresql://postgres:postgres@localhost:5432/erp_crm` |
| `DIRECT_URL` | PostgreSQL direct connection (unpooled, for migrations) | Same as DATABASE_URL without `-pooler` |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens | (set in .env.example) |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens | (set in .env.example) |
| `JWT_ACCESS_EXPIRY` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token TTL | `7d` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:5173` |
| `STORAGE_DRIVER` | Storage backend for images | `local` |
| `UPLOAD_DIR` | Local upload directory | `./uploads/products` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:3000` |

## Roles & Permissions

| Module | Action | Admin | Sales | Warehouse | Accounts |
|---|---|---|---|---|---|
| **Customers** | Create | ✓ | ✓ | — | — |
| | Read | ✓ | ✓ | ✓ | ✓ |
| | Update | ✓ | ✓ | — | — |
| | Delete | ✓ | — | — | — |
| | Add Follow-up | ✓ | ✓ | — | — |
| **Products** | Create | ✓ | — | — | — |
| | Read | ✓ | ✓ | ✓ | ✓ |
| | Update (all fields) | ✓ | — | — | — |
| | Update (stock fields only) | ✓ | — | ✓ | — |
| | Adjust Stock | ✓ | — | ✓ | — |
| | Upload Image | ✓ | — | ✓ | — |
| | Delete | ✓ | — | — | — |
| **Challans** | Create (Draft) | ✓ | ✓ | — | — |
| | Read | ✓ | ✓ | ✓ | ✓ |
| | Confirm | ✓ | ✓ | — | — |
| | Cancel | ✓ | ✓ | — | — |
| | Download PDF | ✓ | ✓ | — | — |
| | Delete | ✓ | — | — | — |

## Test Credentials

All seeded users share the password: **password123**

| Role | Email | Password |
|---|---|---|---|
| Admin | admin@test.com | password123 |
| Sales | sales@test.com | password123 |
| Warehouse | warehouse@test.com | password123 |
| Accounts | accounts@test.com | password123 |

## API Endpoints

### Auth
| Method | Path | Auth | Roles |
|---|---|---|---|
| POST | `/auth/login` | No | All |
| POST | `/auth/refresh` | No | All |
| POST | `/auth/logout` | Yes | All |

### Customers
| Method | Path | Auth | Roles |
|---|---|---|---|
| POST | `/customers` | Yes | Admin, Sales |
| GET | `/customers` | Yes | All |
| GET | `/customers/:id` | Yes | All |
| PATCH | `/customers/:id` | Yes | Admin, Sales |
| POST | `/customers/:id/follow-ups` | Yes | Admin, Sales |

### Products
| Method | Path | Auth | Roles |
|---|---|---|---|
| POST | `/products` | Yes | Admin |
| GET | `/products` | Yes | All |
| GET | `/products/:id` | Yes | All |
| PATCH | `/products/:id` | Yes | Admin, Warehouse |
| POST | `/products/:id/image` | Yes | Admin, Warehouse |
| GET | `/products/:id/stock-movements` | Yes | Admin, Warehouse, Accounts |
| POST | `/products/:id/stock-movements` | Yes | Admin, Warehouse |

### Challans
| Method | Path | Auth | Roles |
|---|---|---|---|
| POST | `/challans` | Yes | Admin, Sales |
| GET | `/challans` | Yes | All |
| GET | `/challans/:id` | Yes | All |
| GET | `/challans/:id/pdf` | Yes | Admin, Sales |
| PATCH | `/challans/:id/confirm` | Yes | Admin, Sales |
| PATCH | `/challans/:id/cancel` | Yes | Admin, Sales |

A complete Postman collection with example requests is available at `postman/ERP_CRM_Portal.postman_collection.json`.

## Running with Docker

```bash
# Build and start all services
docker compose up --build

# Run migrations and seed data
docker exec erp_crm_api npx prisma migrate deploy
docker exec erp_crm_api npx prisma db seed

# Access the API at http://localhost:3000
```

## CI/CD

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push to `main` and every PR:

- **Backend job:** `npm ci` → `npx prisma generate` → `npm run build` → `npx prisma validate`
- **Frontend job:** `npm ci` → `npm run build`

## Bonus Features

### PDF Invoice Export

`GET /challans/:id/pdf` generates a PDF with:
- Company header ("ERP CRM Portal")
- Challan number and status
- Customer details (name, business, mobile)
- Itemised table with product name, SKU, quantity, unit price, and line total
- Total quantity summary
- Generated-at timestamp

Uses [pdfkit](https://github.com/foliojs/pdfkit) — no headless browser required.

### Product Image Upload

`POST /products/:id/image` accepts a multipart `image` field. Files are stored locally under `uploads/products/` and served statically.

**To switch to S3:**

1. `npm install @aws-sdk/client-s3 @aws-sdk/lib-storage`
2. Set `STORAGE_DRIVER=s3` in `.env`
3. Fill `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`
4. In `backend/src/products/products-image.service.ts`, replace the local file write in `upload()` with an S3 `PutObjectCommand` call. The `imageUrl` field on `Product` already exists in the schema.

## Assumptions & Design Decisions

- **Auth token storage:** Access and refresh tokens are stored in JavaScript variables (in-memory), not in `localStorage`. On page refresh, the user must log in again. This is deliberate — in-memory storage is immune to XSS-based token theft at the cost of session persistence. A production version could use httpOnly cookies for the refresh token.
- **Snapshot timing:** Product name and price are snapshotted into `ChallanItem` at **draft creation** time and **re-snapshotted at confirm time**. This ensures the challan reflects prices at the moment of sale while also showing what was quoted at draft time. The alternative (snapshotting only at draft time) was rejected because a long-lived draft might have stale prices.
- **Cancellation rule:** Only Draft challans can be cancelled. Confirmed challans cannot be cancelled (no stock reversal). This avoids the complexity of inventory correction flows and matches the requirement ("Draft/Confirmed status" — cancellation of confirmed challans was not explicitly required).
- **Rate limiting:** Not implemented. Would use `@nestjs/throttler` in production. Out of scope for the 48-hour build.
- **Refresh token rotation:** On each refresh, a new pair is issued and the old refresh token hash is replaced in the DB. If a compromised token is reused after rotation, it cannot be detected (no token family tracking). Production would include a token family/session table for rotation theft detection.

## Known Limitations

- **No automated tests:** No unit or e2e tests beyond the smoke-testing done during development. The 48-hour window was prioritised on feature completeness.
- **No rate limiting:** API is unprotected against brute-force or high-frequency requests.
- **Refresh token theft detection:** Rotation is implemented but there is no reuse detection (no family/session table). If an attacker steals a token and uses it after the legitimate user refreshes, the theft goes undetected.
- **No pagination on stock movements:** `GET /products/:id/stock-movements` returns all records unfiltered.
- **Image upload validation:** The current implementation does not validate file type, size, or sanitise filenames beyond stripping the extension from the original name.
- **PDF styling:** Basic. Uses pdfkit's built-in Helvetica fonts. In production, embed a custom font and company logo.
- **Docker image:** The backend image does not run migrations automatically on startup (requires a manual `docker exec` or an init container).

## Deployment Guide

### Option A: Local (no deployment)

Follow the [Getting Started](#getting-started) section. The assignment accepts local setup + screen recording as an alternative to live deployment.

### Option B: Deploy to Free Tier (Reference)

The live deployment was done as follows:

1. **Database (Neon):**
   - Create a Neon project
   - Copy both the pooled connection string (`DATABASE_URL`) and the direct connection string (`DIRECT_URL`)
   - Run: `npx prisma migrate deploy` and `npx prisma db seed`

2. **Backend (Render):**
   - Create a new Web Service, connect GitHub repo, root directory `backend/`
   - Build command: `npm install && npx prisma generate && npm run build`
   - Start command: `npx prisma migrate deploy && node dist/main`
   - Environment variables: `DATABASE_URL` (pooled), `DIRECT_URL` (direct, for migrations), `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`

3. **Frontend (Vercel):**
   - Import GitHub repo, set root to `frontend/`
   - Framework preset: Vite
   - Environment variable: `VITE_API_BASE_URL` = Render backend URL
   - Deploy

## Submission Checklist

- [x] GitHub repo link
- [x] Live frontend URL: https://erp-crm-operations-portal.vercel.app
- [x] Live backend URL: https://erp-crm-api.onrender.com
- [x] Test credentials for all 4 roles (see above)
- [x] Postman collection (`postman/ERP_CRM_Portal.postman_collection.json`)
- [x] README with architecture explanation and assumptions
- [x] Known limitations documented
- [ ] Screen recording — Loom URL to be added
