# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server (frontend + backend in one process)
npm run dev

# Build frontend for production
npm run build

# Type-check only (no emit)
npm run lint

# Run all tests once
npm test

# Run a single test file
npx vitest run tests/path/to/file.test.ts

# Regenerate migration SQL after schema changes
npx drizzle-kit generate

# Push schema directly to SQLite (dev only, destructive if tables exist)
npx drizzle-kit push
```

**Auto-start on Windows:** `start.bat` installs deps (if missing) then runs `npm run dev`. DB migrations apply automatically at server startup via `migrate()` in `backend/db/index.ts`.

---

## Architecture

### Single-process full-stack

`server.ts` is the entry point. It boots an Express app, registers all API routes under `/api`, then mounts Vite as middleware for the React frontend (dev: HMR proxy; prod: serves `dist/`). Everything runs on port 3000.

### Path alias

`@` resolves to the **project root** (not `src/`). This means:
- shadcn/ui components → `@/components/ui/...` (root-level `components/`)
- App components → `@/src/components/...`
- Pages → `@/src/pages/...`

This is a common source of import errors — always check which `components/` folder is intended.

### Backend structure

```
backend/
├── api/          # One route file per domain (25 files), e.g. communities.routes.ts
├── services/     # Business logic called by routes (26 files), e.g. community.service.ts
├── db/
│   ├── schema.ts # Single Drizzle schema file for all 22 tables
│   └── index.ts  # DB init + auto-migrate on startup
└── workers/      # Async workers: automation.worker.ts, call.worker.ts
```

Routes follow the pattern `backend/api/{domain}.routes.ts` → calls `backend/services/{domain}.service.ts`. Role middleware (`role.middleware.ts`) exports `adminOnly`, `superadminOnly`, `operatorAllowed`.

### Frontend structure

```
src/
├── pages/
│   ├── premium/   # PremiumLegal, PremiumConvocatorias, PremiumReservas
│   ├── owner/     # Propietario portal (OwnerDashboard, MyCharges, etc.)
│   └── *.tsx      # Admin pages
├── components/
│   ├── layout/    # DashboardLayout, Sidebar, OwnerLayout
│   ├── analytics/ # AIAnalysis and chart components
│   └── common/    # Reusable UI pieces
└── hooks/
    └── useAuth.ts # JWT auth: reads token from localStorage, validates via /api/auth/me
```

Two layout trees in `App.tsx`: `DashboardLayout` (admin/operator, route `/`) and `OwnerLayout` (propietario portal, route `/owner`).

### Database

Drizzle ORM + SQLite (`adminfincas.db`) in dev; PostgreSQL via Supabase in prod (`drizzle.pg.config.ts`). The schema defines 22 tables in `backend/db/schema.ts`. Migrations live in `drizzle/` and are applied automatically at startup.

**Financial model**: `charges` (cargos debidos por unidad) → `payments` (abonos) → `bankTransactions` (extracto bancario importado). Debt = charges not fully covered by payments.

**Key schema fields added recently**: `communities.displayId` (3-digit visible ID), `communities.adminFeeRate/adminFeeFixed`, `units.monthlyFee`.

### Authentication

JWT-based, no Firebase. Login: `POST /api/auth/login` → returns `{ token, user }` stored in `localStorage`. Protected pages call `useAuth()` which validates the token against `GET /api/auth/me`. Roles: `superadmin`, `admin`, `operator`, `owner`. JWT expires in 8h; login rate-limited to 10 attempts / 15 min per IP.

Default superadmin: `admin@bluecrabai.es` / `0000`.

### AI / Chatbot

`backend/services/ai.service.ts` — Groq (Llama 3.3 70B) with 16 registered tools. Tool execution happens server-side in the `executeTool` switch. Adding a new tool requires: (1) entry in `TOOLS` array, (2) case in `executeTool`, (3) corresponding service method.

### Environment variables needed

```
JWT_SECRET          # Required in production (server refuses to start without it)
GROQ_API_KEY        # AI chatbot
RESEND_API_KEY      # Email sending
ALLOWED_ORIGINS     # CORS (default: http://localhost:3000)
GEMINI_API_KEY      # Analytics (server-side only — never expose to client bundle)
```
