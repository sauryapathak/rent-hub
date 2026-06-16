# RentSaathi

A comprehensive Indian landlord rent tracker app — manage properties, tenants, rent collection, agreements, maintenance, expenses, and vendors all in one place.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/rent-tracker run dev` — run the frontend (port 18142)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter routing + Tailwind CSS + shadcn/ui
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Charts: Recharts
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle schema files (properties, units, tenants, payments, agreements, maintenance, expenses, vendors)
- `artifacts/api-server/src/routes/` — Express route handlers (one file per domain)
- `artifacts/rent-tracker/src/` — React frontend (pages, components, layouts)
- `lib/api-client-react/src/generated/` — Generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — Generated Zod schemas (do not edit)

## Architecture decisions

- OpenAPI-first: all API contracts defined in `openapi.yaml`, frontend hooks generated via Orval
- Dashboard summary computed server-side from live DB data (not cached)
- Indian number formatting (₹1,23,456) with `Intl.NumberFormat('en-IN')`
- Rent status derived from payments table filtered to current month
- Units store denormalized `tenantId` for fast payment status lookups

## Product

- **Dashboard**: Portfolio summary (income, occupancy, dues), 12-month income/expense chart, rent status breakdown, recent activity feed
- **Properties & Units**: Add properties with address/type, manage units with color-coded payment status tiles (green=paid, yellow=due, red=overdue)
- **Tenants**: Full KYC tracking (Aadhaar/PAN), police verification status, payment history
- **Payments**: Log UPI/cash/bank/cheque payments, partial payment tracking, overdue flagging
- **Agreements**: Digital agreement tracking with expiry countdown, type selection (residential/shop/PG/room)
- **Maintenance**: Request tracker with priority/status workflow (raised → acknowledged → in_progress → resolved)
- **Expenses**: Expense categorization with summary breakdown by category
- **Vendors**: Contact book for plumbers, electricians, carpenters, painters, pest control, cleaners
- **Reports**: Income vs expense charts, property-wise breakdown

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any OpenAPI spec change, always run `pnpm --filter @workspace/api-spec run codegen` before touching frontend code
- `payments/overdue` route must be registered BEFORE `payments/:id` in Express (otherwise Express matches "overdue" as an id)
- Numeric fields from DB come as strings from pg driver — always parseFloat() before sending JSON
- Agreements: `expiring` endpoint must be registered before `/:id` route in Express

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
