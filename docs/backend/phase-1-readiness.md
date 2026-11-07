# Phase 1 — onboarding implementation and integration checklist

## Backend implementation delivered in PR #5

- Verified Supabase bearer-token identity and idempotent profile synchronization.
- Prisma 7 PostgreSQL client using the `@prisma/adapter-pg` driver adapter.
- Atomic business provisioning: business profile, default Main Branch, Owner membership, owner permission grants, onboarding state and 14-day Starter trial.
- Public category catalogue and transactional business-category selection.
- Business profile/store configuration read and update (contact details, currency, timezone, VAT and tax mode).
- Branch list/create/update with permission checks and `multi_branch` plan-feature enforcement.
- Persisted onboarding read/update with required and optional step validation.
- Membership summary for `GET /me`: role, permissions/scopes, branches, subscription, feature entitlements and onboarding progress.
- Snake_case API serializers and consistent success/error envelopes.
- Server-only runtime factory; framework-neutral handlers are ready for App Router mounting.

## Frontend implementation reported in PR #3

- Registration, six-digit email verification UI, login, forgot/reset password.
- Business profile, multi-category selection, Main Branch explanation, optional additional branches.
- Onboarding welcome/progress, store-configuration placeholder, resume/skip and completion preview.
- Frontend CI passed on the latest reported frontend source snapshot.

## Automated verification

- Prisma schema mirror check.
- Prisma schema validation and generated Prisma Client.
- Ephemeral PostgreSQL 16 schema generation/application.
- Tenant RLS policy application.
- Cross-tenant read and write rejection smoke test using a NOBYPASSRLS runtime role.
- Backend TypeScript typecheck, Vitest and build.

## Integration gates before Phase 1 can be signed off

1. Mount the handler methods in actual Next.js App Router `route.ts` files after backend/frontend branches are integrated.
2. Wire the frontend forms to Supabase Auth and these API routes; test OTP delivery/verification and recovery using the actual EDSEC Supabase project.
3. Confirm the production runtime uses a dedicated NOBYPASSRLS database role and apply the reviewed schema/RLS migrations to the EDSEC database.
4. Run end-to-end signup → OTP → login → create business → category selection → onboarding resume tests against the connected EDSEC project.
5. Obtain Product Owner approval before merging either feature PR.

This checklist distinguishes code/CI completion from live-project production sign-off. No production credentials are stored in this repository.
