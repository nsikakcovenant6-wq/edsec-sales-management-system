# EDSEC Sales Management System

Universal retail, point-of-sale and business management SaaS by EDSEC ICT Institute.

## Repository layout

- `docs/backend/` — shared backend architecture, API contract and coordination documents.
- `prisma/` — Prisma schema baseline.
- `apps/` — application code (to be established after frontend/backend workspace decisions).

## Team responsibilities

- Product Owner: final product decisions and priorities.
- Backend Lead (ChatGPT): database, APIs, authentication, tenancy, business logic, security, payments, sync, AI and backend tests.
- Frontend Lead (Claude): design system, screens, responsive UI, POS UX, mobile/Capacitor interface and frontend API integration.

## Current status

The initial v1.1 backend handover is a design baseline, not production-ready implementation. The Prisma schema requires tenant-safe database constraints and SQL RLS policies. The OpenAPI contract is a shared proposal and will evolve with product decisions.

## Core principles

- PostgreSQL is the source of truth.
- Strict business/tenant isolation; server-side authorization on every protected operation.
- POS-only offline queueing with idempotent synchronisation; other functions are online-first.
- Money is represented in integer minor units with an explicit currency code.
- Versioned REST API under `/api/v1`.
- Do not commit secrets, service-role credentials, or production environment files.
