# EDSEC Frontend

## Stack

- Next.js App Router and React 19
- TypeScript strict mode
- Tailwind CSS 4
- Lucide icons
- Vitest for isolated frontend unit tests

## Development

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

## Phase 1 account and onboarding screens

Account routes:
- `/auth/register` — registration details, terms acknowledgement and password confirmation.
- `/auth/verify-email` — six-digit numeric OTP input and resend cooldown.
- `/auth/login` — email/password sign-in screen.
- `/auth/forgot-password` — recovery request screen.
- `/auth/reset-password` — new password and confirmation.

Onboarding routes:
- `/onboarding/welcome`
- `/onboarding/business` — business name, contact details, address, currency and time zone.
- `/onboarding/categories` — multi-select category preview with a non-empty selection guard.
- `/onboarding/branches` — explains that the backend creates `Main Branch` (`MAIN`) automatically and provides repeatable additional branch forms (name, code and optional address).
- `/onboarding/store-configuration` — explicit placeholder for a required backend step whose fields and save operation are not yet defined.
- `/onboarding/complete` — preview review only; it does not mark server onboarding complete.

All these flows are intentionally presentation-only. Form validation and navigation run in the browser, but no account is created, OTP is sent or verified, recovery email is sent, password is changed, category is persisted, or business/branch data is saved. OTP resend is also a UI preview only. The onboarding route layout holds business details, category choices and additional branch drafts in a shared in-memory context so they survive step-to-step navigation; they reset on refresh or when leaving the onboarding layout. Password confirmation, category selection, business name and additional branch name/code receive local validation. These checks are usability safeguards only and do not establish backend password rules or API requirements.

## Contract review boundary

The frontend reviewed the draft v1.3 contract in PR #4. The UI must use the live `GET /categories` response and its category UUIDs once the contract is approved; the category names currently shown are illustrative. Business creation uses `POST /businesses`; business contact fields are represented in `BusinessUpdate`; branch creation uses `BranchWrite` with required name and code. The backend provisioning service creates `Main Branch` with code `MAIN`; the frontend does not collect duplicate primary-branch fields. Additional branches remain dependent on branch route handlers being implemented.

The current runtime PR #5 route factory still needs the public category-list handler, business profile update handler and branch handlers. The `/me` runtime response also needs alignment with the `MeResponse` schema. Store configuration is a required onboarding step without a payload or save endpoint in v1.3.

Do not wire API requests or Supabase Auth until the Backend Lead publishes a stable contract and confirms the authentication/session configuration. Signup OTP type, password policy, user metadata and web/Capacitor recovery redirect allowlists remain provisional pending live EDSEC Supabase verification.

## Foundation scope

The application includes a responsive workspace shell, placeholder module routes, loading/error/empty states, generic permission helpers, and exact minor-unit money formatting. The permission utilities accept identifiers supplied by an approved contract; they do not define role names or permission keys.

## Structure

- `src/app/` — App Router pages and global styles
- `src/components/layout/` — responsive application shell
- `src/components/auth/` — account and onboarding presentation screens
- `src/components/ui/` — reusable presentation components
- `src/lib/` — navigation, generic permission helpers and exact money formatting
- `src/lib/*.test.ts` — unit tests

## Continuous integration

`.github/workflows/frontend-ci.yml` runs dependency installation, ESLint, TypeScript checking, Vitest and the Next.js production build on GitHub-hosted Ubuntu runners for relevant pull request and feature-branch changes. Report checks as passing only after the workflow completes successfully.


## Phase 1 integration

- Browser Supabase Auth reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; no project credentials are committed.
- Next.js App Router mounts the backend handler factory at `/api/v1/*`. Server-only runtime variables are `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL`.
- Run `npm install`, `npm run db:generate`, then lint, typecheck, tests and build. Prisma client generation requires a non-empty `DATABASE_URL` but does not connect to it.
- Add the actual deployed application origins to the Supabase Auth redirect allowlist. Recovery callback URLs are derived from the browser's current origin; no host is hard-coded.
- Live Auth and production database/RLS sign-off require the real EDSEC Supabase project.
