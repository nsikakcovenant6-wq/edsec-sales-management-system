# Backend Foundation — Implementation Plan

Status: Phase 1 design and implementation baseline  
API version: v1  
Repository branch: backend/foundation

## 1. Architecture

EDSEC Sales Management System is a modular monolith. PostgreSQL is the source of truth. The API is versioned under `/api/v1`. Authentication uses Supabase Auth access tokens; every protected request verifies the JWT and resolves the active business membership on the server.

The client must never choose its own tenant by sending an arbitrary `business_id`. A user may belong to multiple businesses, but the requested active business must be validated against a current membership before any tenant-scoped query runs.

## 2. Tenant isolation invariants

1. Every tenant-owned row carries a non-null `business_id`, except explicitly global catalogue, plan, and platform records.
2. Tenant-owned relations use composite foreign keys containing `business_id` so a row in one business cannot reference another business's row.
3. Every tenant-scoped API operation checks membership and permission on the server.
4. PostgreSQL RLS is enabled and forced on tenant-owned tables. Policies read a transaction-local tenant setting established only after server-side authentication and membership validation.
5. The runtime database role is not a superuser and does not have BYPASSRLS.
6. Cross-tenant access tests are required for every new tenant-owned resource.
7. Platform administration uses separate permissions and audited, narrowly scoped access. No silent impersonation.

## 3. Authentication and request context

- Supabase Auth owns credentials, email OTP verification, password recovery, and access-token issuance.
- API middleware verifies the bearer token using the configured trusted Supabase verification method.
- Resolve user identity from verified claims; never trust user IDs supplied in request bodies.
- Resolve the active business from a validated membership (header or route context may identify the requested business, but cannot grant access).
- Attach a typed request context: user ID, business ID, membership ID, role, permissions, request ID.
- Reject unauthenticated requests with 401; reject missing membership/permission with 403.
- Apply rate limits to OTP-related flows, authentication-sensitive routes, and expensive endpoints.

## 4. Authorization model

Use permission strings, not frontend-only role checks. Suggested roles are business_owner, business_admin, manager, supervisor, cashier, inventory_manager, accountant, and staff. Roles map to permission grants. Business owners retain full business-level control; only platform permissions can administer global plans, catalogue templates, or platform support tools.

The API returns the caller's effective permission strings for UI rendering. This is informational only: every API operation independently enforces permissions.

## 5. Audit and record lifecycle

- Audit security-sensitive and financial actions with actor, business, action, target, timestamp, request ID, and structured before/after metadata where safe.
- Audit records are append-only to application roles.
- Sales and payment records are never hard-deleted. Corrections use void, refund, or reversal workflows with reason and actor.
- Store timestamps in UTC. Store each business's IANA timezone (default `Africa/Lagos`) for reports and scheduled jobs.
- Money is integer minor units (kobo for NGN) plus ISO currency code. Never use floating-point money values.

## 6. API conventions

- Base path: `/api/v1`
- JSON request and response bodies; snake_case field names.
- Timestamps are ISO 8601 UTC strings.
- Success: `{ "data": ..., "meta": { ... } }`
- Error: `{ "error": { "code": "CODE", "message": "Readable message", "fields": {} } }`
- Cursor pagination for collection endpoints.
- Retryable financial and stock-changing writes require an `Idempotency-Key`.
- API errors must not disclose secrets, SQL, stack traces, or cross-tenant record existence.

## 7. Phase 1 delivery order

1. Confirm repository workspace and runtime versions with the product owner.
2. Finalize Prisma schema and generate migrations.
3. Implement Supabase JWT verification and request context.
4. Implement business membership resolution and permission enforcement.
5. Add PostgreSQL RLS policies and transaction-local tenant context.
6. Add immutable audit-log writing.
7. Add automated tenant-isolation and authorization tests.
8. Document local setup and required environment variables using placeholders only.

## 8. Definition of done

- A verified user can access only businesses for which they have an active membership.
- A user without the required permission receives 403 even if they call the API directly.
- Tenant A cannot read, update, delete, or reference Tenant B records.
- RLS remains effective when application query filters are accidentally omitted.
- Audit records cannot be updated or deleted by the runtime application role.
- All tests run in CI against a real PostgreSQL test database.
- No service-role key, database password, or production environment file is committed.

## 9. Important implementation note

The current repository contains empty placeholder files for the original v1.1 OpenAPI document, role/decision document, and Prisma schema. They must be replaced with the actual handover content and reviewed before implementation. This plan does not claim those files are complete or production-ready.
