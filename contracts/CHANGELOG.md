# Contract changelog
- 2026-11-07: v1.2.0 resolves frontend blockers A1–A12; POS/offline blockers B1–B16 are deferred to v1.3.

- 2026-11-07: v1.3.0 draft restores the v1.1 business, category, plan, template, product, import, inventory, purchase, sales, payment, active-business and sync operations; restores role/scope matrix, offline conflict policy, RLS notes, assumptions and owner decisions; adds signed/unsigned money separation, quantity precision, missing error codes and schema entities. Not stable; validation and review remain required.
- 2026-11-07: v1.3.0 draft now sets /prisma/schema.prisma as canonical and mirrors it at /contracts/schema.prisma; adds GitHub Actions OpenAPI/Prisma validation; A1 OTP/password/recovery details explicitly remain provisional pending live Supabase verification.
