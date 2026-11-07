# EDSEC Sales Management System — Contract v1.2
## Roles, permissions, architecture decisions and changelog

### Contract revision
v1.3.0 — 7 November 2026. Backward-compatible reconciliation of the v1.1 operation set with v1.2 decisions and POS/offline requirements. Draft; not stable until validation and Product Owner approval.

### A1 — Authentication/session: implementation direction; details pending verification
The following is a provisional integration direction, not yet confirmed by a live Supabase test. Do not mark authentication contract stable until a six-digit signup OTP is sent and verified against the configured Supabase project, recovery redirects are tested on web and Capacitor, and the password policy is agreed.

### A1 — Authentication/session: direct Supabase Auth
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


## v1.1 baseline restored — compatibility and role/scope matrix

The v1.1 operation inventory is the compatibility baseline. The v1.3 OpenAPI file restores the missing business, category, plan, template, product, import, inventory, purchase receiving, sales, payment confirmation, active-business and sync operations. Auth routes from v1.1 are intentionally superseded by the direct Supabase Auth approach described under A1; the backend does not proxy credentials or OTPs. Any other endpoint omission must be recorded here before stability.

### Default role → permission → scope matrix

Scope meanings: `business` = all business records; `assigned_branches` = only assigned branch IDs; `own_records` = records created/owned by the member; `business_or_own` = shared business records plus own records. Backend enforces the scope on every request.

| Permission/capability | Owner | Manager | Cashier | Stock keeper | Accountant |
|---|---|---|---|---|---|
| business.settings.read / update | business / business | assigned_branches / assigned_branches | — | — | business / — |
| members.read / invite / update / remove | business | business / limited invite / limited update / — | — | — | — |
| roles.read / manage | business / business | business / delegated | — | — | — |
| dashboard.read | business | assigned_branches | assigned_branches | assigned_branches | assigned_branches |
| products.read | business | business | assigned_branches | business | business |
| products.create / update / archive | business | business / approval policy | — | assigned_branches / assigned_branches / — | — |
| products.cost_price.view / update | business / business | business / approval | — | — | business / — |
| products.selling_price.update | business | approval | — | — | — |
| inventory.read | business | business | assigned_branches | business | business |
| inventory.adjust / transfer / receive | business | approval / approval / business | — | assigned_branches / assigned_branches / assigned_branches | — |
| suppliers.read / create / update | business | business / business / business | — | business / business / business | business / — / — |
| purchases.read / create / receive / cancel | business | business / business / business / approval | — | business / — / assigned_branches / — | business / — / — / — |
| sales.read | business | business | assigned_branches | — | business |
| sales.create / void / refund | business | business / approval / approval | assigned_branches / — / — | — | — |
| payments.read / record / confirm_manual / refund | business | business / business / approval / approval | assigned_branches / assigned_branches / — / — | — | business / — / business / approval |
| customers.read / create / update / export / anonymise | business | business | assigned_branches / assigned_branches / assigned_branches / — / — | — | business / — / — / business / approval |
| credit.read / issue / collect / adjust | business | business / approval / business / approval | assigned_branches / limited / assigned_branches / — | — | business / — / — / approval |
| expenses.read / create / approve | business | business / assigned_branches / approval | — | — | business / business / approval |
| reports.sales.read / finance.read / inventory.read / export | business | assigned_branches / limited / assigned_branches / assigned_branches | assigned_branches / — / — / — | — / — / assigned_branches / — | business / business / business / business |
| branches.read / manage | business / business | business / delegated | assigned_branches / — | assigned_branches / — | business / — |
| sales.sync | business | assigned_branches | assigned_branches | — | — |
| subscription.read / manage | business / business | business / — | — | — | business / — |
| audit.read | business | assigned_branches | — | — | assigned_branches |
| ai.analytics.use / ai.reports.configure | business / business | plan+permission / plan+permission | — | — | plan+permission / plan+permission |

For the specific question `sales.read`: the default Cashier receives `sales.read` with `assigned_branches` scope, so the cashier can read sales from assigned branches only. The default Manager and Accountant scopes are also constrained as shown; an Owner has business scope. These defaults are seed policy, not hard-coded role-name checks: the permission grant and scope are stored and enforced server-side.

Platform administrator permissions are separate and never inherited from business roles: `platform.businesses.manage`, `platform.plans.manage`, `platform.templates.manage`, `platform.images.manage`, `platform.payments.read`, `platform.support.manage`, `platform.audit.read`. Support access requires a time-limited, purpose-bound audited grant; no impersonation.

### Restored permission keys
The following v1.1 keys remain supported and are not removed: `customers.export`, `customers.anonymise`, `credit.adjust`, `ai.reports.configure`. They must be present in the permission enum/catalogue and role seeding.

### Restored offline conflict table

| Sync condition | Server outcome | Client handling |
|---|---|---|
| Sufficient stock | Accept atomically; deduct stock | Mark synced only after server receipt |
| Stock insufficient | Reject `STOCK_INSUFFICIENT` | Keep rejected item visible; manager edits/cancels; no silent backorder |
| Price changed | Reject `PRICE_CHANGED` | Display old/new price; require human reconfirmation and a new operation ID |
| Product archived/deleted | Reject `PRODUCT_ARCHIVED` | Replace item or cancel |
| Subscription expired | Reject `SUBSCRIPTION_INACTIVE`, subject to configured grace policy | Prompt renewal; no false success |
| Same operation/key and same payload | Return original idempotent result | Do not create a duplicate |
| Same key with different payload | Reject `IDEMPOTENCY_KEY_REUSED` | New key only for a genuinely new operation |

Offline payment must never represent Paystack/card as verified. Cash can be recorded locally; bank transfer remains pending until an authorised manual confirmation. Server allocates the final receipt number after accepting the operation. Batch maximum is 50 operations; each operation is independently accepted/rejected.

### Restored RLS and tenant isolation requirements

- Every tenant-owned table carries `business_id`, including child records where practical.
- Enable PostgreSQL RLS on every tenant-owned table.
- Verify Supabase JWT, resolve active membership and permissions, then set transaction-local `app.user_id`, `app.business_id` and `app.platform_admin` only after trusted server validation.
- Runtime Prisma role is `NOBYPASSRLS`; never use `postgres` or Supabase `service_role` for normal tenant requests.
- RLS policies use tenant context plus membership checks; INSERT/UPDATE policies require `WITH CHECK`; UPDATE requires both `USING` and `WITH CHECK`.
- Do not trust URL/body business IDs as tenant proof. Use composite tenant-safe foreign keys.
- Revoke direct browser DML to tenant tables; all normal writes pass through the API.
- Audit logs and stock movements are append-only, enforced by DB privileges/triggers.
- Automated integration tests must attempt cross-tenant SELECT, INSERT, UPDATE and DELETE and prove isolation.
- Use transaction-local context inside the same database transaction as tenant queries; never session-level context with pooled connections.

### Restored assumptions and owner decisions

1. Business ID in a URL is a selector only; membership and permission are revalidated on every request.
2. A user may belong to multiple businesses; the client chooses an active business from verified memberships and stores that selection for the session. Server validates every selection.
3. Branch is required for branch-scoped sales, stock and receipt numbering.
4. Money is integer minor units in PostgreSQL and decimal strings over JSON; NGN exponent is 2. No JavaScript floating-point money arithmetic.
5. VAT is stored in basis points; 750 bps is the Nigeria default configuration, with inclusive/exclusive tax mode explicitly stored.
6. Starter monthly, 14-day trial; Professional monthly/quarterly/annual; Enterprise quote-based. Exact prices are owner-configurable and must satisfy discount invariants.
7. Product templates are global catalogue records; copied products become tenant-owned with zero stock.
8. Product image licence, source and attribution metadata are mandatory for published template images.
9. Offline support is limited to POS sale creation/sync. Admin, reports, onboarding, settings and subscription operations remain online-only.
10. Sync batch maximum is 50; each operation uses UUID client_operation_id and is independently processed.
11. Client timestamps are informational and never override server inventory/price ordering.
12. Customer export/deletion follows legal/accounting retention; where deletion is not lawful, identifiers are anonymised.
13. Platform support uses scoped audited grants, no impersonation.
14. AI uses an allowlisted tenant-scoped query catalogue; the model receives prepared results with citations and date ranges only.

Product Owner decisions still outstanding: exact Starter/Professional prices; enterprise quote-only vs minimum; trial payment method; grace duration (proposal 3 days); backorders (default reject); offline price-conflict rejection (recommended); manual transfer confirmation and dual-approval threshold; VAT default enablement; receipt format/reset policy; retention periods; platform admin staff-role separation; initial category catalogue and pharmacy controls.

### Contract decisions resolving the review

- Business creation accepts profile only; category assignment is a separate required onboarding step via multi-category `PUT /businesses/{business_id}/categories`.
- POS checkout is created by `POST /sales` with embedded tender intents. The server persists the sale and payment rows atomically; Paystack tender creates a pending payment and returns redirect data. A payment is never created without an existing sale. The separate `POST /payments` records subsequent/credit/manual tender against an existing sale.
- Upload clients request a signed URL then PUT bytes to `upload_url`; after upload they submit `object_path` when saving Business/Product. Purpose-based permission: business_logo → `business.settings.update`; product_image → `products.create` or `products.update`; import_file → `products.import`.
- `/me` returns memberships and each membership's onboarding state/progress. Active business is selected by `PUT /me/active-business`; no implicit server-side global active-business preference is assumed.
- Unsigned money fields use `MoneyMinor`; only explicit deltas use `SignedMoneyMinor`.
- Quantity strings allow up to four fractional digits (Decimal(18,4)); JSON regex escaping must produce the regex `^[0-9]+(\\.[0-9]{1,4})?$` for positive quantities and `^-?[0-9]+(\\.[0-9]{1,4})?$` for signed deltas.


### A1 implementation values requiring live verification before stable release
- Signup verification type: Supabase `verifyOtp({ email, token, type: 'email' })` is the proposed six-digit email OTP flow. Confirm against the actual project's Supabase Auth email template and a real signup; do not substitute `type: 'signup'` without that test.
- Password policy: proposed minimum 12 characters, at least one letter and one number; do not enforce until Product Owner confirms and Supabase Auth settings match. No mandatory symbol requirement is currently approved.
- Signup user metadata keys: `full_name` and `phone`; API profile sync maps these to application profile fields. Confirm nullable phone and validation format.
- First authenticated `GET /me`: idempotently create/synchronise the profile from the verified JWT and trusted auth metadata, return empty memberships if no business exists, never create a business implicitly.
- Recovery redirect allowlist: production web origin plus configured localhost development origins; Capacitor custom scheme/deep-link URI must be explicitly registered in Supabase redirect allowlist. Exact URI values are deployment configuration and remain TBD until the app identifier/domain are finalised.
- These values are pending live verification; the OpenAPI file must not be labelled stable until this checklist is completed.
