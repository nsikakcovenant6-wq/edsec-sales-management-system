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

## Current foundation scope

The application includes a UI-only workspace shell plus account and onboarding previews. Account routes: `/auth/register`, `/auth/verify-email`, `/auth/login`, `/auth/forgot-password` and `/auth/reset-password`. Onboarding routes: `/onboarding/welcome`, `/onboarding/business`, `/onboarding/categories`, `/onboarding/branches` and `/onboarding/complete`. These screens use browser-native form validation and local presentation state only. No account is created, OTP is verified, recovery email is sent, password is changed or business data is persisted. No backend API calls, role names, permission keys, subscription rules or live metrics are implemented.

The preview notice is intentional: the workspace contains no live business data. The permission utilities accept permission identifiers supplied by a future approved contract; they do not define permission identifiers or role presets.

## Structure

- `src/app/` — App Router pages and global styles
- `src/components/layout/` — responsive application shell
- `src/components/ui/` — reusable presentation components
- `src/lib/` — navigation, generic permission helpers and exact money formatting
- `src/lib/*.test.ts` — unit tests

## Contract boundary

Do not wire API requests or Supabase Auth until the Backend Lead publishes the stable OpenAPI and confirms the authentication/session contract. Backend-owned files are maintained by the Backend Lead.
\n\n## Continuous integration\n\n`.github/workflows/frontend-ci.yml` runs dependency installation, ESLint, TypeScript checking, Vitest and the Next.js production build on GitHub-hosted Ubuntu runners for relevant pull request and feature-branch changes. The workflow must complete successfully before checks are reported as passing.\n