# Phase 2 — Business Onboarding, Product Templates and Bulk Import

Status: implementation branch opened; design and API acceptance criteria recorded.
Branch: `backend/phase-2-catalogue-import`
Base: `backend/phase-0-foundation-runtime`

## Goal

Let a newly provisioned business populate its own product catalogue quickly, either by copying reviewed EDSEC templates or importing its own CSV/XLSX file. All resulting products belong to the tenant. Template copies start with zero stock; imports never silently create opening stock unless the request explicitly supplies an opening quantity and branch.

## Existing foundation reused

- `ProductTemplate` and `TemplateImage` are already represented in the Prisma schema.
- `Product`, `ProductVariant`, `InventoryBalance`, `ProductImport`, `Category`, `BusinessCategory` and `AuditLog` are already represented.
- The Phase 1 runtime already verifies Supabase access tokens, resolves the profile and business membership, checks permissions/features, and applies transaction-local tenant context.
- Onboarding steps already include `PRODUCT_TEMPLATES` and `PRODUCT_IMPORT`.
- The existing OpenAPI draft already describes template listing/copy and import start/status operations, but its response schemas and execution semantics need to be made explicit before frontend integration.

## Workstream A — Product template catalogue

### API behaviour

- `GET /api/v1/businesses/{business_id}/product-templates`
  - Requires active membership, `products.read`, and `product_templates` feature.
  - Supports `category_id`, `q`, `cursor`, and bounded `limit` (1–100).
  - Returns active templates only, with category, suggested price, tracking type, attributes and image metadata.
  - Image metadata includes object path, source URL, licence name/URL and attribution.
- `POST /api/v1/businesses/{business_id}/product-templates/{template_id}/copy`
  - Requires `products.create` and `product_templates`.
  - Accepts optional tenant-specific name, SKU, barcode, category, selling price and attributes overrides.
  - Copies template content into a new tenant-owned Product; never links a tenant product to mutable global template data.
  - Sets opening stock to zero and creates zero InventoryBalance rows for the business's active branches (or only its default branch if explicitly selected by the user).
  - Rejects duplicate tenant SKU/barcode conflicts; operation supports an idempotency key.
  - Does not copy an image into tenant storage automatically. The product may reference an approved shared template image only if the storage policy allows public read; otherwise the user explicitly copies/uploads it.

### Data and governance

- Templates are global platform catalogue records, not tenant-owned records.
- Template publication is platform-admin controlled; no public client writes.
- Template images must have licence/source metadata. Reject an image record without a non-empty licence name; never scrape or hotlink unlicensed imagery.
- Tenant copies preserve source template ID in audit metadata, not as a live mutable foreign-key dependency.

## Workstream B — CSV/XLSX product import

### API behaviour

- Upload files to a private business-scoped Storage bucket using the existing signed-upload flow; API receives an opaque object path, not arbitrary external URLs.
- `POST /api/v1/businesses/{business_id}/products/imports` creates an import job after checking `products.import` and `product_import`.
- `GET /api/v1/businesses/{business_id}/products/imports/{import_id}` returns status, row counts, and a paginated validation report.
- Validate file extension, MIME type, size, row count, header mapping and tenant-owned category/brand references. Enforce limits server-side.
- CSV and XLSX parsers must reject formula execution, external links, macros and unsupported workbook features. Never evaluate spreadsheet formulas.
- Normalize headers; support explicit column mapping. Required minimum fields: product name and selling price (minor currency units or an explicitly mapped decimal currency amount). Currency conversion is not inferred.
- Validate each row independently and return row number, field, stable error code and human-readable message.
- Partial success is allowed: valid rows are committed in bounded transactions; invalid rows remain in the report. Repeated processing must not duplicate products.
- Imported products default to zero stock unless a validated opening-stock column and permitted branch are explicitly included.
- Import job is tenant-scoped, auditable, and safe to retry. Store only a bounded report; do not store raw uploaded file contents in JSON.

### Operational limits (initial defaults; configurable)

- Max upload: 10 MiB.
- Max rows: 5,000.
- Max columns: 40.
- Max cell length: 2,000 characters.
- Process in batches of 100 rows.
- Reject duplicate normalized SKU or barcode within the file and against existing tenant products; report both row numbers where possible.
- Never log full product import rows or customer-sensitive data.

## Workstream C — onboarding integration

- Onboarding progress must be updated only after the associated operation succeeds.
- Template step can be completed with zero selected templates (explicit “skip”); import step can be skipped.
- A business may finish onboarding with no imported products; it must be able to add products later.
- Refresh/resume uses persisted onboarding state, not browser memory.
- Do not make subscription selection or team invitation mandatory in Phase 2 unless the Product Owner explicitly changes the current state machine.

## Security and correctness requirements

- Derive tenant identity from verified Supabase token + active membership; never trust `business_id` in a body.
- Use `withTenantContext` for every tenant-owned read/write. Global template reads are read-only and only expose active/published records.
- Use server-side permission and plan feature checks. A UI-hidden feature is not a security control.
- Use a dedicated NOBYPASSRLS runtime DB role. Add RLS coverage for any new tenant-owned table; global template tables remain non-tenant platform data with writes restricted to platform-admin workflows.
- Use audit events for template copy, import creation, import completion/partial failure.
- Prices are integer minor units; quantities are decimal strings with at most four fractional digits.
- Do not create inventory movements for zero stock.
- No hard deletion of tenant products; archive instead.

## Acceptance tests

1. A member cannot read or write another tenant's import jobs or products.
2. A business without the template/import feature receives a stable feature-not-available response.
3. Template list returns only active templates and honours category/search/pagination filters.
4. Copy creates a tenant-owned product with zero stock, preserves allowed metadata, and is idempotent.
5. SKU/barcode conflicts are rejected without partial product creation.
6. CSV import preview reports valid and invalid rows without creating products.
7. Commit creates only valid rows; invalid rows remain reported; retries do not duplicate products.
8. Malformed, oversized, formula-containing and unsupported files are rejected safely.
9. Onboarding progress advances only after successful template/import action or explicit skip.
10. Typecheck, unit tests, Prisma validation/generation, ephemeral PostgreSQL migration and RLS isolation smoke tests pass.

## Frontend handoff boundary

Frontend may build:
- template catalogue/search/filter and selection UX;
- import upload, column mapping, validation preview, row-level errors and import progress;
- onboarding resume/skip/completion states.

Frontend must use the versioned API and signed upload URLs. It must not query Prisma, write global templates, parse trusted prices in the browser, or assume an import succeeded before the API confirms it.

## Not in Phase 2

Full product CRUD, variants/barcodes, inventory adjustments, suppliers, purchase orders and receiving belong to Phase 3. POS and sale processing belong to Phase 4.
