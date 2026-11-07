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

The current application is a UI-only workspace shell. Navigation destinations are local frontend routes with placeholder states. No backend API calls, authentication, role names, permission keys, business records, subscription rules or live metrics are implemented in this phase.

The preview notice is intentional: the workspace contains no live business data. The permission utilities accept permission identifiers supplied by a future approved contract; they do not define permission identifiers or role presets.

## Structure

- `src/app/` — App Router pages and global styles
- `src/components/layout/` — responsive application shell
- `src/components/ui/` — reusable presentation components
- `src/lib/` — navigation, generic permission helpers and exact money formatting
- `src/lib/*.test.ts` — unit tests

## Contract boundary

Do not wire API requests or Supabase Auth until the Backend Lead publishes the stable OpenAPI and confirms the authentication/session contract. Backend-owned files are maintained by the Backend Lead.
