# Backend foundation core

This package contains server-only authentication verification, tenant context, permission-scope checks, money/quantity parsing and audit helpers.

## Setup
1. Copy `.env.example` to the backend runtime environment (never commit secrets).
2. Supply the EDSEC Supabase project URL, server-only service-role key and PostgreSQL URL.
3. Install with `npm install`.
4. Run `npm run typecheck` and `npm test`.

## Security contract
- Supabase access tokens are verified remotely with `auth.getUser(token)`; decoded JWT claims alone are not trusted.
- Service-role key is server-only and must never reach the browser.
- Tenant GUCs are transaction-local and set only after membership validation.
- Permission scope is checked in application code and reinforced by PostgreSQL RLS.
- Money is BigInt minor units; quantities match Decimal(18,4).
- Audit and stock movement rows are append-only.

## RLS SQL
`sql/tenant-rls.sql` is a policy migration script to apply after the initial schema DDL migration. It has not been applied to a live database. Cross-tenant SQL integration tests still require the EDSEC Supabase/PostgreSQL project.


## Phase 0 implementation status

The server-only foundation currently includes Supabase token verification, transaction-local tenant context, scoped permission checks, BigInt money parsing, quantity precision checks, append-only audit writer and an initial tenant RLS SQL policy script.

The RLS SQL is a reviewable migration artifact only. It has not been applied to a live EDSEC database. Cross-tenant database integration tests require an EDSEC Supabase/PostgreSQL project and a non-BYPASSRLS runtime role.

CI is configured to typecheck, test and build this package on backend feature branches.


## Phase 1 onboarding API

The backend now provides server-only Prisma repositories and a handler factory for the onboarding contract:

- `GET /api/v1/me` — synchronizes the verified profile and returns memberships, roles, permissions, branches, subscription entitlements and onboarding state.
- `GET /api/v1/categories` — returns active public business categories and vertical feature flags.
- `POST /api/v1/businesses` — atomically creates the business, default Main Branch, Owner membership, permissions, onboarding record and 14-day Starter trial.
- `GET /api/v1/businesses/{business_id}` and `PATCH /api/v1/businesses/{business_id}` — read/update business profile and store configuration fields (currency, timezone, VAT and tax mode).
- `PUT /api/v1/businesses/{business_id}/categories` — replaces the selected business categories atomically.
- `GET/POST /api/v1/businesses/{business_id}/branches` and `PATCH /api/v1/businesses/{business_id}/branches/{branch_id}` — branch setup and maintenance; additional branches require the `multi_branch` plan entitlement.
- `GET/PATCH /api/v1/businesses/{business_id}/onboarding` — persists resumable progress and enforces required/skippable step rules.

`createV1RouteHandlers` is framework-neutral. `getV1RouteHandlers` supplies the server-only runtime using Supabase Auth and Prisma 7 with the PostgreSQL adapter. The Next.js frontend branch must mount the handler methods in App Router `route.ts` files; do not import the runtime into client components.

The canonical Prisma schema is `/prisma/schema.prisma`; `backend/prisma/schema.prisma` is a byte-identical local mirror so Prisma Client generation resolves the backend package dependencies. CI checks the mirror before generating the client.

CI starts PostgreSQL 16, generates and applies a temporary schema from Prisma, applies `sql/tenant-rls.sql`, and runs `sql/tenant-rls-smoke.sql` using a NOBYPASSRLS runtime role. This validates tenant read/write isolation in CI; it does not apply migrations to the live EDSEC Supabase project.

### Runtime environment

Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` in the server runtime only. Never expose the service-role key to browser code. The EDSEC Supabase project must be connected separately before real OTP/recovery and production RLS settings can be verified.
