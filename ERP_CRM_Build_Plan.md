# Mini ERP + CRM Operations Portal — Full Build Plan

**Assignment:** Full Stack Developer Case Study
**Deadline:** 48 hours from assignment
**Business context:** A wholesale/distribution company needs an internal system to manage customers, products, stock, sales challans, and CRM follow-ups, used by Sales, Warehouse, and Accounts teams.

---

## 0. Confirmed Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Backend framework | **NestJS** | TypeScript-first, modular (modules/controllers/services), built-in DI, Guards for RBAC |
| Database | **PostgreSQL** | Relational integrity needed for stock/challan transactions |
| ORM | **Prisma** | Type-safe queries, easy migrations, transaction API |
| Frontend | **React + TypeScript** (Vite) | Fast dev server, standard SPA setup |
| Styling | **Tailwind CSS** | Fast to build admin-style responsive UI |
| Auth | **JWT — Access + Refresh token pair** | Access token short-lived, refresh token long-lived, rotation on use |
| Deployment | **Vercel** (frontend) + **Render** (backend) + **Neon** (Postgres) | All free-tier |
| Bonus features attempted | Docker, GitHub Actions, PDF invoice export, S3 (or S3-compatible) product image upload | Attempt in priority order if time allows |

---

## Phase 0 — Planning & Design (Hours 0–4)

### 0.1 Requirement extraction (done — see below, nothing from the PDF omitted)
Full requirement checklist pulled directly from the assignment, used as the source of truth throughout every phase:

- Auth: login + role-based access; roles = Admin, Sales, Warehouse, Accounts; JWT-based auth acceptable
- Customer CRM: name, mobile, email, business name, GST (optional), customer type (Retail/Wholesale/Distributor), address, status (Lead/Active/Inactive), follow-up date, notes — with add/edit/search/detail page/add follow-up notes
- Product & Inventory: name, SKU/code, category, unit price, current stock, min stock alert qty, location/warehouse — with add/edit, and a stock movement log tracking product, qty changed, movement type (IN/OUT), reason, created by, timestamp
- Sales Challan: select customer, add multiple products with quantities, auto-generated challan number, Draft/Confirmed status; confirming reduces stock; stock must never go negative (proper API error if insufficient); challan stores product **snapshot data**, not just product ID; challan fields = challan number, customer, products, total quantity, status (Draft/Confirmed/Cancelled), created by, created date
- APIs: clean REST endpoints (e.g. `POST /auth/login`, `GET /customers`), input validation, correct HTTP status codes, error messages, pagination where needed, search/filter where needed
- Frontend: clean admin-style UI
- Deployment: free hosting acceptable; AWS is bonus only; if not deployed, must provide local setup + screen recording + Postman collection + README
- Documentation: server setup, env var management, local run instructions, deployment steps, assumptions made
- Bonus: Docker, GitHub Actions deployment, export invoice as PDF, upload product image to S3
- Submission: GitHub repo link, live frontend URL, live backend URL, test credentials for all roles, Postman collection/API docs, README, architecture explanation, known limitations

### 0.2 Entity-Relationship Design
Design these entities before writing any code:

- **User** — id, name, email, passwordHash, role (enum: ADMIN/SALES/WAREHOUSE/ACCOUNTS), refreshTokenHash (nullable), createdAt
- **Customer** — id, name, mobile, email, businessName, gstNumber (nullable), customerType (enum: RETAIL/WHOLESALE/DISTRIBUTOR), address, status (enum: LEAD/ACTIVE/INACTIVE), followUpDate (nullable), notes (relation to FollowUpNote), createdAt, updatedAt
- **FollowUpNote** — id, customerId (FK), note text, createdBy (FK User), createdAt
- **Product** — id, name, sku (unique), category, unitPrice, currentStock, minStockAlert, warehouseLocation, imageUrl (nullable, for bonus), createdAt, updatedAt
- **StockMovement** — id, productId (FK), quantityChanged, movementType (enum: IN/OUT), reason, createdBy (FK User), createdAt
- **Challan** — id, challanNumber (unique, auto-generated), customerId (FK), status (enum: DRAFT/CONFIRMED/CANCELLED), totalQuantity, createdBy (FK User), createdAt
- **ChallanItem** — id, challanId (FK), productId (FK), quantity, **productNameSnapshot**, **unitPriceSnapshot** (critical: never read live product data for historical challans)

### 0.3 Repo & environment setup
- [ ] Create monorepo or two-repo structure: `/backend` (NestJS) and `/frontend` (React+Vite) — monorepo recommended for a solo 48hr build (simpler to manage, one root README)
- [ ] Initialize git, first commit = empty scaffolds
- [ ] Set up `.gitignore` (node_modules, .env, dist, build)
- [ ] Create `.env.example` in both backend and frontend from the start (never commit real `.env`)
- [ ] Decide commit convention (e.g. `feat:`, `fix:`, `chore:`) — keep commits frequent and meaningful since "proper commits" is explicitly graded

---

## Phase 1 — Backend Scaffolding (Hours 4–6)

### 1.1 NestJS project init
- [ ] `nest new backend` (or `npx @nestjs/cli new backend`)
- [ ] Install Prisma: `npm i -D prisma`, `npm i @prisma/client`
- [ ] `npx prisma init` → configure `DATABASE_URL` in `.env`
- [ ] Install validation: `class-validator`, `class-transformer`
- [ ] Install auth deps: `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt` (password hashing)
- [ ] Set up global `ValidationPipe` in `main.ts` (whitelist + forbidNonWhitelisted + transform)
- [ ] Set up global exception filter for consistent error envelope: `{ statusCode, message, error, timestamp }`
- [ ] Enable CORS for frontend origin

### 1.2 Module skeleton (mirrors NestJS's modular philosophy)
Create empty modules first so the folder structure is visible early:
- [ ] `AuthModule`
- [ ] `UsersModule`
- [ ] `CustomersModule`
- [ ] `ProductsModule`
- [ ] `StockModule` (or fold into ProductsModule if simpler)
- [ ] `ChallansModule`
- [ ] `PrismaModule` (shared, injectable PrismaService)

### 1.3 Frontend scaffolding (parallel task, can be done same window)
- [ ] `npm create vite@latest frontend -- --template react-ts`
- [ ] Install Tailwind: `npm i -D tailwindcss postcss autoprefixer` → `npx tailwindcss init -p` → configure `content` paths
- [ ] Install: `react-router-dom`, `axios` (or `fetch` wrapper), `react-hook-form` (recommended for the challan builder form complexity), `zustand` or React Context for auth state
- [ ] Set up base layout: sidebar nav + topbar shell for the admin UI
- [ ] Set up `.env` for `VITE_API_BASE_URL`

---

## Phase 2 — Database & Prisma Schema (Hours 6–8)

### 2.1 Write `schema.prisma`
- [ ] Define all enums: `Role`, `CustomerType`, `CustomerStatus`, `MovementType`, `ChallanStatus`
- [ ] Define all models from section 0.2 with correct relations and `@@map` table names
- [ ] Add `@unique` on `Product.sku` and `Challan.challanNumber`
- [ ] Add indexes on frequently filtered/searched fields: `Customer.name`, `Customer.mobile`, `Product.sku`, `Product.name`

### 2.2 Migrate & seed
- [ ] `npx prisma migrate dev --name init`
- [ ] Write a seed script (`prisma/seed.ts`) that creates:
  - One test user per role (Admin, Sales, Warehouse, Accounts) with known test credentials
  - A handful of sample customers, products, and a couple of stock movements
- [ ] Confirm `npx prisma studio` shows correct data

---

## Phase 3 — Authentication & Roles (Hours 8–14)

### 3.1 Auth core
- [ ] `POST /auth/login` — validate credentials, compare bcrypt hash, issue access token (short expiry, e.g. 15 min) + refresh token (longer expiry, e.g. 7 days)
- [ ] `POST /auth/refresh` — validate refresh token, rotate it (issue new pair, invalidate old), reject reused/expired tokens
- [ ] `POST /auth/logout` — invalidate stored refresh token hash
- [ ] Store refresh token as a **hash** in the User table (never plaintext) — compare on refresh
- [ ] Return access token in response body; consider httpOnly cookie for refresh token (more secure than localStorage) — document your choice either way in the README under "assumptions"

### 3.2 Guards & RBAC
- [ ] `JwtAuthGuard` — validates access token on protected routes
- [ ] `RolesGuard` + custom `@Roles(Role.ADMIN, ...)` decorator — this is where NestJS's DI/decorator model pays off directly
- [ ] Apply guards at controller or route level per module (e.g. only Warehouse/Admin can adjust stock; only Sales/Admin can create challans; Accounts can view but not create challans — decide and document exact permission matrix)

### 3.3 Permission matrix (decide and document explicitly)
Draft a table (Admin / Sales / Warehouse / Accounts × each module: read/write) before coding guards — this avoids ad-hoc decisions mid-build and gives the README a clean "roles & permissions" section.

---

## Phase 4 — Customer CRM Module (Hours 14–18)

- [ ] `POST /customers` — create (validate required fields, GST optional)
- [ ] `GET /customers` — list with pagination (`page`, `limit`) and search/filter (by name, mobile, status, customerType)
- [ ] `GET /customers/:id` — detail page data (customer + follow-up notes)
- [ ] `PATCH /customers/:id` — edit
- [ ] `POST /customers/:id/follow-ups` — add a follow-up note
- [ ] Validate: mobile format, email format, GST format if provided (optional field, but validate if present), status enum, customerType enum
- [ ] Return 404 with clear message for missing customer, 400 for validation errors

---

## Phase 5 — Product & Inventory Module (Hours 18–22)

- [ ] `POST /products` — create (unique SKU check → 409 Conflict if duplicate)
- [ ] `GET /products` — list with pagination, search by name/SKU/category
- [ ] `PATCH /products/:id` — edit
- [ ] `GET /products/:id/stock-movements` — movement log for a product
- [ ] `POST /products/:id/stock-movements` — manual stock adjustment (IN/OUT + reason), updates `currentStock` **and** writes a `StockMovement` row in the same DB transaction — never update stock without logging the movement
- [ ] Add a low-stock flag/response field when `currentStock <= minStockAlert` (useful for a dashboard widget later)

---

## Phase 6 — Sales Challan Module (Hours 22–32) — the core business-logic phase

This is the phase most likely to be scrutinized closely. Build it carefully.

### 6.1 Challan number generation
- [ ] Auto-generate a sequential/unique challan number (e.g. `CH-2026-00001`) — decide format, document it, ensure uniqueness under concurrent creation (DB unique constraint + retry, or a dedicated sequence)

### 6.2 Draft creation
- [ ] `POST /challans` — select customer, add product lines with quantities, save as `DRAFT`
- [ ] On creation, snapshot each product's current name and unit price into the `ChallanItem` (`productNameSnapshot`, `unitPriceSnapshot`) — do this at creation time, not at confirm time, and re-confirm your assumption in the README (some may choose to snapshot at confirm time instead — pick one and state it explicitly)
- [ ] Calculate and store `totalQuantity`

### 6.3 Confirm logic — the critical transaction
- [ ] `PATCH /challans/:id/confirm`:
  - Wrap in a **Prisma `$transaction`**
  - For each challan item: re-fetch the product row (row-level lock via transaction), check `currentStock >= quantity`
  - If **any** item has insufficient stock: roll back the entire transaction, return `400` with a clear message naming which product(s) are short and by how much — do NOT partially confirm
  - If all items pass: decrement each product's `currentStock`, write a `StockMovement` (OUT, reason = "Sales Challan #X") for each item, update challan status to `CONFIRMED`
  - This must be atomic — no partial stock deduction under any failure path

### 6.4 Other challan endpoints
- [ ] `GET /challans` — list with pagination, filter by status/customer/date range
- [ ] `GET /challans/:id` — detail (with snapshotted item data, not live product data)
- [ ] `PATCH /challans/:id/cancel` — only valid from Draft (or define your own rule for cancelling Confirmed — e.g. reverse stock via an IN movement — and document the decision)

---

## Phase 7 — API Hardening (Hours 32–34)

- [ ] Audit every endpoint for: correct status codes (200/201/400/401/403/404/409), consistent error shape, DTO validation on every input
- [ ] Add pagination to every list endpoint if not already done
- [ ] Add basic rate-limiting or at least document that it's out of scope (assumption)
- [ ] Write/export a Postman collection covering every endpoint with example requests (needed for submission regardless of deployment)

---

## Phase 8 — Frontend Development (Hours 34–44)

### 8.1 Auth flow
- [ ] Login page, store access token in memory/context (not localStorage if avoidable), silent refresh via refresh endpoint
- [ ] Route guarding by role (hide/disable nav items and block routes the logged-in role can't access)
- [ ] Logout flow

### 8.2 Customer module UI
- [ ] List page: table with search bar, status/type filters, pagination controls
- [ ] Add/Edit form (validated, matches backend DTOs)
- [ ] Detail page: customer info + follow-up notes list + add-note form

### 8.3 Product & Inventory UI
- [ ] List page: table with search, low-stock visual indicator
- [ ] Add/Edit form
- [ ] Stock movement log view (per product) + manual adjustment form

### 8.4 Sales Challan UI — the centerpiece screen
- [ ] Challan builder: customer selector, dynamic product+quantity rows (add/remove lines), running total quantity
- [ ] Save as Draft / Confirm actions, with confirm showing a clear success or stock-error message
- [ ] Challan list + detail view (showing snapshotted product data explicitly, e.g. labeled "at time of sale")

### 8.5 Polish
- [ ] Consistent admin shell (sidebar + topbar), loading states, empty states, error toasts
- [ ] Full responsive pass (mobile/tablet breakpoints via Tailwind)
- [ ] Basic accessibility pass (labels on inputs, focus states)

---

## Phase 9 — Bonus Features (attempt in this order if time remains) (Hours 44–46, flexible)

- [ ] **Docker**: `Dockerfile` for backend, `docker-compose.yml` including Postgres for local dev parity
- [ ] **GitHub Actions**: simple CI workflow — install, build, (optionally) run migrations check, deploy trigger on push to `main`
- [ ] **PDF invoice export**: generate a PDF for a confirmed challan (e.g. via `pdfkit` or `puppeteer` on the backend), `GET /challans/:id/pdf`
- [ ] **Product image upload to S3**: presigned URL upload flow or direct backend upload to an S3-compatible bucket (e.g. Cloudflare R2 or AWS S3 free tier), store `imageUrl` on Product

*(Given the 48hr ceiling, treat these as stretch — do not let them cut into Phase 6/7/8 time.)*

---

## Phase 10 — Deployment (Hours 46–47)

- [ ] **Neon**: create Postgres project, run `prisma migrate deploy` against it, run seed script
- [ ] **Render**: deploy NestJS backend (build command, start command, set `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN` env vars)
- [ ] **Vercel**: deploy React frontend, set `VITE_API_BASE_URL` to the Render backend URL
- [ ] Smoke-test the full flow end-to-end on the deployed URLs before recording anything

---

## Phase 11 — Documentation & Submission (Hours 47–48)

- [ ] **README.md** covering: project overview, tech stack, how the server was set up, how env vars are managed (list every required var with description, no real secrets), how to run locally (backend + frontend, migrations, seed), how to deploy, assumptions made (auth token storage choice, snapshot-timing choice, cancellation-of-confirmed-challan rule, etc.)
- [ ] **Architecture explanation** section: short write-up of module structure and the confirm-challan transaction design
- [ ] **Known limitations** section — be explicit and honest (e.g. no rate limiting, no automated tests, refresh token rotation edge cases, etc.)
- [ ] Export and include the **Postman collection** (JSON file in repo)
- [ ] Record a **screen recording** walking through: login as each role → create customer → add product → build + confirm a challan → observe stock decrease → attempt an over-quantity challan and show the rejection
- [ ] Final submission checklist: GitHub repo link, live frontend URL, live backend URL, test credentials for all 4 roles, Postman collection, README, architecture explanation, known limitations — **all 8 items from the assignment's submission list**

---

## Quick Reference: Test Credentials to Seed
Document these clearly for the reviewer:

| Role | Email | Password |
|---|---|---|
| Admin | admin@test.com | (set in seed script) |
| Sales | sales@test.com | (set in seed script) |
| Warehouse | warehouse@test.com | (set in seed script) |
| Accounts | accounts@test.com | (set in seed script) |

---

*This plan maps every requirement in the original assignment PDF to a specific phase — no section of the brief (auth, CRM, inventory, challans, APIs, frontend, deployment, docs, bonus, submission) is left unaddressed.*
