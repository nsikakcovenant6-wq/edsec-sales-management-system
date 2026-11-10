# EDSEC Frontend

## Stack

- Next.js App Router, React 19 and strict TypeScript
- Tailwind CSS 4 and Lucide icons
- Supabase Auth browser client
- Backend Phase 1 handler factory mounted through Next.js App Router
- Vitest for unit and mocked integration tests

## Development

1. Copy `.env.example` to `.env.local` and provide the real EDSEC project values for Next.js. Also copy `backend/.env.example` to `backend/.env` for local Prisma CLI/runtime use. Do not commit either file or any secrets.
2. Run `npm install`.
3. Run `npm run db:generate` (Prisma generation requires a non-empty `DATABASE_URL`; it does not connect to the database).
4. Run `npm run backend:build` to compile the backend handler package into `backend/dist/`.
5. Run `npm run dev`. Typecheck, tests and production build also compile this package automatically.

Verification commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Account routes

- `/auth/register` — Supabase account registration with full-name metadata.
- `/auth/verify-email` — six-digit signup OTP verification and resend.
- `/auth/login` — Supabase email/password login and workspace resume.
- `/auth/forgot-password` — Supabase password recovery request.
- `/auth/reset-password` — update password from the recovery session.
- Workspace header — sign out using Supabase Auth.

The browser client reads only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Password recovery callback URLs are derived from the current browser origin; no project URL or redirect host is hard-coded. Supabase Auth must allowlist the actual deployed origins, and the email template must deliver a six-digit signup OTP compatible with `verifyOtp(type: "signup")`.

## Onboarding routes

- `/onboarding/welcome` — resumes the backend's current onboarding step.
- `/onboarding/business` — creates the business once, or updates the existing business profile.
- `/onboarding/categories` — loads active category UUIDs and persists selections.
- `/onboarding/branches` — lists server branches, uses the automatically created `Main Branch` / `MAIN`, and gates extra branch create/update actions on both permission and `multi_branch` entitlement.
- `/onboarding/store-configuration` — persists VAT enabled, VAT rate (basis points) and tax mode through business settings.
- `/onboarding/complete` — reflects backend onboarding completion.

Business profile, category associations, branches, store configuration and onboarding progress are persisted through the backend. Non-sensitive in-progress form drafts are also cached in browser local storage so a refresh on the same browser does not discard unfinished fields. The backend-created Main Branch is never submitted as an additional branch; branch creation checks the existing branch codes and skips `MAIN`.

## API integration

The typed client in `src/lib/api/client.ts` sends the current Supabase access token as a Bearer token, validates the standard `{ data, meta }` response envelope and maps backend `{ error }` bodies into `ApiError` instances.

Next.js App Router adapters mount the backend's server-only `getV1RouteHandlers()` implementation:

- `GET /api/v1/me`
- `GET /api/v1/categories`
- `POST /api/v1/businesses`
- `GET/PATCH /api/v1/businesses/{business_id}`
- `PUT /api/v1/businesses/{business_id}/categories`
- `GET/PATCH /api/v1/businesses/{business_id}/onboarding`
- `GET/POST /api/v1/businesses/{business_id}/branches`
- `PATCH /api/v1/businesses/{business_id}/branches/{branch_id}`

The backend package under `backend/` is included byte-for-byte from PR #5. It is compiled to `backend/dist/` before the App Router imports its server handlers; its source, Prisma schema mirror, SQL, tests and package manifest are not edited on the frontend branch. Its source, Prisma schema mirror, SQL, tests and package manifest are not edited on the frontend branch. Prisma, the PostgreSQL adapter and the service-role Supabase client run server-side only.

## Environment

Root `.env.example` lists the required variables without supplying credentials:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — browser-safe Supabase Auth configuration.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` — server-only backend runtime configuration.

Never expose `SUPABASE_SERVICE_ROLE_KEY` through a `NEXT_PUBLIC_*` variable.

## Known integration limitation

The current backend exposes `PUT /businesses/{business_id}/categories` to persist category IDs, but it does not expose a read operation for the business's selected category IDs (the business DTO and `/me` membership summary omit them). The selected IDs therefore rehydrate from the local browser draft on the same device, but cannot yet be reconstructed from the server on a different device/browser. The Backend Lead needs to add selected category IDs to the business response or provide a protected read endpoint to complete cross-device category resume.

Live OTP delivery, password recovery redirects and production database/RLS operation still require the real EDSEC Supabase/PostgreSQL environment. CI uses a build-only placeholder `DATABASE_URL` for Prisma client generation; it does not represent production credentials or a live database test.

## Foundation scope

The workspace shell includes responsive navigation, permission-aware navigation, loading/error/empty states and exact minor-unit money formatting. Module pages outside Phase 1 remain placeholders.

## Continuous integration

`.github/workflows/frontend-ci.yml` installs the frontend/backend workspace dependencies, generates the Prisma client, then runs ESLint, TypeScript checking, Vitest and the Next.js production build. Only completed successful GitHub Actions runs are reported as green.
