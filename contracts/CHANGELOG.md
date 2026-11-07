# Contract changelog
- 2026-11-07: v1.2.0 resolves frontend blockers A1–A12; POS/offline blockers B1–B16 are deferred to v1.3.

- 2026-11-07: v1.3.0 draft restores the v1.1 business, category, plan, template, product, import, inventory, purchase, sales, payment, active-business and sync operations; restores role/scope matrix, offline conflict policy, RLS notes, assumptions and owner decisions; adds signed/unsigned money separation, quantity precision, missing error codes and schema entities. Not stable; validation and review remain required.
- 2026-11-07: v1.3.0 draft now sets /prisma/schema.prisma as canonical and mirrors it at /contracts/schema.prisma; adds GitHub Actions OpenAPI/Prisma validation; A1 OTP/password/recovery details explicitly remain provisional pending live Supabase verification.
- 2026-11-07: v1.3.0 draft restores the v1.1 business/category/plan/template/product/import/inventory/purchase/sales/payment/active-business/sync operation families; adds POS sale-with-tenders and offline batch sync; restores role/scope matrix, RLS notes, offline conflict policy and owner decisions; separates unsigned and signed money; caps quantity precision at four decimal places; adds missing error codes and purpose-based uploads. /prisma/schema.prisma is canonical and /contracts/schema.prisma is its mirror. Draft only pending CI and Product Owner review.
- 2026-11-07: CI validation workflow added for Redocly OpenAPI lint/reference checks and Prisma 7.9.1 schema validation against /prisma/schema.prisma.
- 2026-11-07: Fixed YAML indentation in the product import 202 response; rerun CI validation.
- 2026-11-07: Rebuilt ProductWrite schema, added onboarding progress to membership response and completed missing Prisma enum declarations.
- 2026-11-07: Fixed PurchaseOrderLine quantity_received pattern syntax after CI parser feedback.
- 2026-11-07: Prisma 7 compatibility fixes: multiline enum declarations, added missing IdempotencyStatus/SyncStatus/DeviceStatus enums, and moved DATABASE_URL into prisma.config.ts. Canonical schema remains /prisma/schema.prisma.
- 2026-11-07: Repaired malformed PurchaseOrderLine quantity_received YAML scalar after parser diagnostics.
- 2026-11-07: CI now installs the Prisma package before loading prisma.config.ts, resolving Prisma 7 config module lookup.
- 2026-11-07: Replaced incrementally patched OpenAPI draft with a clean single-source v1.3 specification; includes all 33 paths, 44 operations, explicit permissions, feature gates, POS checkout and sync schemas.
- 2026-11-07: Added PermissionKey enum, field-level price permission metadata, PAYLOAD_TOO_LARGE code and explicit signed-upload instruction (HTTP PUT to upload_url).
- 2026-11-07: Restored Prisma ProductTemplate, TemplateImage (licence/source/attribution), and PlatformAdmin models; schema mirrors kept identical.
- 2026-11-07: Aligned Prisma tracking/payment enums with wire values; added BusinessCategory and Brand models; documented opening-stock permission and client price snapshot validation.
