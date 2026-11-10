# EDSEC Sales Management System

Universal retail, POS and business management SaaS by EDSEC ICT Institute.

## Repository layout

- `src/` — Next.js App Router application (frontend screens and API route handlers).
- `prisma/schema.prisma` — canonical Prisma schema.
- `prisma.config.ts` — Prisma 7 datasource configuration.
- `contracts/openapi.yaml` — canonical versioned REST API contract.
- `contracts/schema.prisma` — byte-identical schema mirror for contract review.
- `contracts/role-permission-and-decisions.md` — permission/scope matrix, RLS and product decisions.
- `docs/backend/` — architecture and human-readable contract references.
- `.github/workflows/` — frontend and backend contract validation workflows.

## Team responsibilities

- Product Owner: product decisions, priorities and merge approval.
- Backend Lead: database, API, auth, tenancy, business logic, security, payments, sync, AI and backend tests.
- Frontend Lead (Lessy): design system, screens, responsive UI, POS UX, Capacitor interface and API integration.

## Development workflow

- Backend feature branches target `backend/main`.
- Frontend feature branches target `frontend/main`.
- Pull requests remain draft until tests and reviews pass.
- Do not merge into `main` or integration branches without Product Owner approval.
- Never commit secrets, service-role keys, production credentials or customer data.

## Current status — 7 November 2026

- Frontend Phase 0 CI: install, lint, typecheck, Vitest and production build passed on the current frontend foundation commit. See PR #3.
- Backend contract v1.3: 33 paths and 44 operations; Redocly lint and Prisma 7.9.1 schema validation passed on the current validated contract commit. See PR #4.
- Contract v1.3 remains draft pending frontend review and live EDSEC Supabase OTP/recovery verification. Do not integrate it as stable yet.
- No production database migrations or runtime API implementation are claimed complete.

## Architecture principles

- PostgreSQL is the source of truth.
- Strict business/tenant isolation; RLS plus server-side authorization on every protected operation.
- POS-only offline queueing with idempotent synchronisation; other functions are online-first.
- Money is integer minor units with explicit currency code; JSON uses decimal integer strings.
- Versioned REST API under `/api/v1`.
