# EDSEC Sales Management System — Contract v1.2
## Roles, permissions, architecture decisions and changelog

### Contract revision
v1.2.0 — 7 November 2026. This revision responds to frontend assessment blockers A1–A12. POS/offline requests B1–B16 are explicitly deferred to the next contract revision.

### A1 — Authentication/session: accepted; direct Supabase Auth
The frontend uses `@supabase/supabase-js` directly for authentication:
- Registration: `supabase.auth.signUp({ email, password, options: { data } })`.
- Email OTP verification: `supabase.auth.verifyOtp({ email, token, type: 'email' })`.
- Login: `supabase.auth.signInWithPassword({ email, password })`.
- Refresh: `supabase.auth.refreshSession()`; supabase-js manages refresh automatically when configured with persistent sessions.
- Logout: `supabase.auth.signOut()`.
- Password recovery: `supabase.auth.resetPasswordForEmail(email, { redirectTo })`; after recovery callback, use `supabase.auth.updateUser({ password })`.
- Session is represented by Supabase access and refresh tokens. Send access token as `Authorization: Bearer <access_token>` to EDSEC API.
The backend does not proxy sign-in, OTP, refresh, logout or password update. It verifies Supabase JWTs and provisions/synchronises the application profile through trusted server-side auth hooks or a first authenticated /me request. Do not duplicate tokens in application storage. Web uses the Supabase-supported secure session persistence; Capacitor uses a secure-storage adapter and deep-link allowlist.

`VerificationResult.next_step` is not an EDSEC API response in this model. Frontend derives navigation from Supabase Auth result: `business_setup` when verified and no membership exists, `continue_onboarding` when a business has incomplete onboarding, and `dashboard` when onboarding is complete. These are frontend navigation states, not auth protocol values.

### A2 — Response schemas: accepted
The OpenAPI file defines typed response schemas for Product, ProductVariant, InventoryBalance, StockMovement, Supplier, PurchaseOrder, Sale, SaleItem, Payment, Refund, Plan, PlanPrice, PlanFeature, ProductTemplate and images, ProductImport and row reports, OnboardingProgress, SyncStatus, business list, Branch, Subscription and Business. Every endpoint response uses the Success envelope and pagination metadata where applicable. The initial coverage is a buildable contract baseline; endpoints not yet listed are not implied to exist.

### A3 — PaymentCreate and Paystack: accepted
`PaymentCreate` is defined. Paystack initiation returns a persisted Payment with status `pending`, `next_step=redirect_to_paystack`, `authorization_url`, `access_code` and provider `reference`. The frontend must show payment as pending until a verified server webhook confirms it. Never treat a redirect return query parameter as proof of payment. Manual bank transfer remains pending until a permitted member confirms it.

### A4 — Money wire format: accepted; decimal strings
All fields ending in `_minor` are base-10 integer strings, never JSON numbers. Example: `"125000"` = NGN 1,250.00. Currency code accompanies each monetary aggregate. Amounts are non-negative unless explicitly a delta. Signed monetary deltas use `^-?[0-9]+$`; quantity deltas use decimal strings and may be negative. Database storage uses integer/BigInt minor units. No JS floating-point arithmetic for money.

### A5 — Subscription and entitlements: accepted
Add `GET /businesses/{business_id}/subscription`. Status values: `trial | active | grace | expired`. Response includes plan, billing interval, trial_ends_at, current_period_end, grace_ends_at, and features[{key, enabled, limit, usage}]. /me echoes status and effective features per membership.
Canonical feature keys: `multi_branch`, `ai_analytics`, `scheduled_reports`, `advanced_inventory`, `pharmacy_batch_expiry`, `electronics_serial_tracking`, `product_import`, `employee_management`, `max_employees`, `max_products`, `max_branches`.
`PLAN_FEATURE_UNAVAILABLE` and `PLAN_LIMIT_EXCEEDED` return HTTP 403. `SUBSCRIPTION_INACTIVE` returns HTTP 402. During grace, features remain enabled only as returned by entitlements; backend write policy is authoritative.

### A6 — Branches: accepted
List/create/update branch endpoints are specified. Business creation atomically creates one default branch named `Main Branch` (code `MAIN`). /me returns member `branch_ids` and `default_branch_id`. Every branch-scoped write must include branch_id and server verifies it is assigned to the member unless permission scope is business-wide.

### A7 — Permission scopes and missing keys: accepted
Permissions are returned as strings plus a permission_scopes map. Scope values: `business`, `assigned_branches`, `own_records`, `business_or_own`. Scope is enforced server-side, not merely expressed to the client.
Additional keys: `products.cost_price.view`, `products.cost_price.update`, `products.selling_price.update`, `dashboard.read`, `notifications.read`, `notifications.manage`, `cash_sessions.read`, `cash_sessions.manage`, `quotations.read`, `quotations.manage`, `invoices.read`, `invoices.manage`.
Cost price fields are omitted entirely from responses unless `products.cost_price.view` is granted. Cost price mutation requires `products.cost_price.update`; selling price mutation requires `products.selling_price.update`, independently of products.update.

### A8 — Categories: accepted
`GET /categories` returns a public/global hierarchical category tree. Feature flags identify vertical capabilities: `pharmacy_batch_expiry`, `electronics_serial_tracking`, `fashion_variants`, `weighted_products`. Category flags do not bypass subscription entitlements.

### A9 — Onboarding: accepted
Step IDs and order:
1. `business_profile` required
2. `business_category` required
3. `branch_setup` skippable (default branch already exists)
4. `store_configuration` required
5. `product_templates` skippable
6. `product_import` skippable
7. `subscription_selection` skippable during trial
8. `team_invitation` skippable
9. `onboarding_complete` system-derived
PATCH response returns the full OnboardingProgress schema. Steps persist per business and can be resumed. A required step cannot be marked skipped.

### A10 — Uploads: accepted; signed upload URL
Use `POST /businesses/{business_id}/storage/upload-url` to request a short-lived signed Supabase Storage upload URL. Allowed content types: JPEG, PNG, WebP; max 10 MiB. Purpose is business_logo or product_image. The backend returns object_path, upload_url and expiry. On successful upload, the client submits object_path when saving Business/Product. Read URLs are short-lived signed URLs generated by the API; never expose bucket service credentials. Product template images carry licence, source and attribution metadata.

### A11 — CORS: accepted
Allow exact configured origins: `capacitor://localhost`, `https://localhost`, configured local development origins (default `http://localhost:3000` and `http://127.0.0.1:3000`), and approved production web origins. Do not use wildcard origins with credentials. OPTIONS preflight must allow Authorization, Content-Type, Idempotency-Key and required methods.

### A12 — Errors: accepted
ApiError.code references ErrorCode enum. HTTP mapping:
- 400: malformed request / invalid OTP equivalent from upstream auth
- 401: UNAUTHENTICATED
- 403: FORBIDDEN, PLAN_FEATURE_UNAVAILABLE, PLAN_LIMIT_EXCEEDED
- 402: SUBSCRIPTION_INACTIVE, PAYMENT_REQUIRED
- 404: NOT_FOUND
- 409: CONFLICT, IDEMPOTENCY_KEY_REUSED
- 422: VALIDATION_ERROR, INSUFFICIENT_STOCK, PRICE_CHANGED, PRODUCT_ARCHIVED
- 429: RATE_LIMITED; include `Retry-After` in seconds and optionally `RateLimit-Reset`
- 500: INTERNAL_ERROR
Error envelope: { error: { code, message, fields?, request_id } }. Never reveal cross-tenant resource existence.

### Permission scope rules
A permission grant includes a scope:
- `business`: all records in the business.
- `assigned_branches`: records only in member.branch_ids.
- `own_records`: records created/owned by the member.
- `business_or_own`: own records plus business-wide records explicitly shared by policy.
The server intersects permission grant, scope, active membership, branch assignment and record ownership on every request. The client receives scope metadata for UI filtering only.

### Core permission catalogue
`business.settings.read`, `business.settings.update`, `members.read`, `members.invite`, `members.update`, `members.remove`, `roles.read`, `roles.manage`, `dashboard.read`, `notifications.read`, `notifications.manage`, `products.read`, `products.create`, `products.update`, `products.archive`, `products.import`, `products.cost_price.view`, `products.cost_price.update`, `products.selling_price.update`, `inventory.read`, `inventory.adjust`, `inventory.transfer`, `inventory.receive`, `suppliers.read`, `suppliers.create`, `suppliers.update`, `purchases.read`, `purchases.create`, `purchases.receive`, `purchases.cancel`, `sales.read`, `sales.create`, `sales.void`, `sales.refund`, `sales.sync`, `discounts.read`, `discounts.create`, `discounts.approve`, `discount.override_below_cost`, `payments.read`, `payments.record`, `payments.confirm_manual`, `payments.refund`, `customers.read`, `customers.create`, `customers.update`, `credit.read`, `credit.issue`, `credit.collect`, `expenses.read`, `expenses.create`, `expenses.approve`, `reports.sales.read`, `reports.finance.read`, `reports.inventory.read`, `reports.export`, `branches.read`, `branches.manage`, `cash_sessions.read`, `cash_sessions.manage`, `quotations.read`, `quotations.manage`, `invoices.read`, `invoices.manage`, `subscription.read`, `subscription.manage`, `audit.read`, `ai.analytics.use`.
Platform permissions are separate: `platform.businesses.manage`, `platform.plans.manage`, `platform.templates.manage`, `platform.images.manage`, `platform.payments.read`, `platform.support.manage`, `platform.audit.read`.

### Rejected / deferred requests
- Backend-proxied login/refresh/logout/password endpoints: rejected because direct Supabase Auth is simpler and keeps credential/token handling with the identity provider. The API accepts verified Supabase bearer JWTs.
- Treating client navigation values as server auth next_step enums: rejected; onboarding navigation is derived from /me and onboarding progress.
- B1–B16 POS/offline/catalogue/discount/receipt/customer/variant details: deferred to v1.3 contract revision as Claude explicitly indicated they will follow separately. No unsupported endpoint is promised by this v1.2 document.
- A broad wildcard CORS policy: rejected for security; use explicit origins.

### Changelog
- 2026-11-07: v1.2.0 resolves frontend blockers A1–A12; adds direct Supabase Auth decision, typed response schemas, payment initiation, string money, subscription entitlements, branches, scoped permissions, category tree, onboarding enum, signed uploads, CORS and error status mapping.
