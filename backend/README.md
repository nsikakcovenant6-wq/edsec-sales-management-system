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
