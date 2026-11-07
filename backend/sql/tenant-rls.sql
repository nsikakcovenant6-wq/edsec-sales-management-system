-- Apply only after the initial Prisma schema migration has created these tables.
-- API requests must validate the Supabase JWT and active membership first, then run
-- all tenant queries inside a transaction that sets app.user_id and app.business_id
-- using transaction-local set_config(..., true).

CREATE OR REPLACE FUNCTION public.app_current_user_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION public.app_current_business_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('app.business_id', true), '')::uuid
$$;

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_units ENABLE ROW LEVEL SECURITY;

-- Businesses are addressed by their own ID, but membership is still mandatory.
CREATE POLICY business_member_select ON public.businesses
  FOR SELECT USING (
    id = public.app_current_business_id()
    AND EXISTS (
      SELECT 1 FROM public.business_members bm
      WHERE bm.business_id = businesses.id
        AND bm.user_id = public.app_current_user_id()
        AND bm.status = 'ACTIVE'
    )
  );

CREATE POLICY business_insert_owner ON public.businesses
  FOR INSERT WITH CHECK (
    id = public.app_current_business_id()
    AND public.app_current_user_id() IS NOT NULL
  );
CREATE POLICY business_update_member ON public.businesses
  FOR UPDATE USING (id = public.app_current_business_id())
  WITH CHECK (id = public.app_current_business_id());

CREATE POLICY business_role_scope ON public.roles
  USING (business_id IS NULL OR business_id = public.app_current_business_id())
  WITH CHECK (business_id = public.app_current_business_id());

CREATE POLICY role_permission_scope ON public.role_permissions
  USING (EXISTS (
    SELECT 1 FROM public.roles r
    WHERE r.id = role_permissions.role_id
      AND (r.business_id IS NULL OR r.business_id = public.app_current_business_id())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.roles r
    WHERE r.id = role_permissions.role_id
      AND r.business_id = public.app_current_business_id()
  ));

CREATE POLICY platform_admin_self_read ON public.platform_admins
  FOR SELECT USING (user_id = public.app_current_user_id() AND is_active = true);

-- Tenant table policy: the active business context is required for all CRUD.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'business_members','branches','member_branches','business_categories','brands',
    'products','product_variants','inventory_balances','stock_movements','suppliers',
    'purchase_orders','sales','payments','refunds','subscriptions','onboarding_progress',
    'audit_logs','product_imports','customers','idempotency_records','sync_devices',
    'sync_operations','device_units'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I USING (business_id = public.app_current_business_id()) WITH CHECK (business_id = public.app_current_business_id())',
      table_name
    );
  END LOOP;
END $$;

-- Child rows without business_id inherit the tenant boundary from their parent.
CREATE POLICY purchase_order_line_tenant ON public.purchase_order_lines
  USING (EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_lines.purchase_order_id
      AND po.business_id = public.app_current_business_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchase_orders po
    WHERE po.id = purchase_order_lines.purchase_order_id
      AND po.business_id = public.app_current_business_id()
  ));

CREATE POLICY sale_item_tenant ON public.sale_items
  USING (EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_items.sale_id
      AND s.business_id = public.app_current_business_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_items.sale_id
      AND s.business_id = public.app_current_business_id()
  ));

-- Append-only records: tenant members may read; application inserts are allowed;
-- UPDATE/DELETE are blocked at the database layer.
CREATE POLICY audit_log_read ON public.audit_logs
  FOR SELECT USING (business_id = public.app_current_business_id());
CREATE POLICY audit_log_insert ON public.audit_logs
  FOR INSERT WITH CHECK (
    business_id = public.app_current_business_id()
    AND actor_user_id IS NOT DISTINCT FROM public.app_current_user_id()
  );
CREATE POLICY stock_movement_read ON public.stock_movements
  FOR SELECT USING (business_id = public.app_current_business_id());
CREATE POLICY stock_movement_insert ON public.stock_movements
  FOR INSERT WITH CHECK (business_id = public.app_current_business_id());

CREATE OR REPLACE FUNCTION public.reject_immutable_row_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'IMMUTABLE_RECORD: % cannot be updated or deleted', TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.reject_immutable_row_mutation();

CREATE TRIGGER stock_movements_immutable
  BEFORE UPDATE OR DELETE ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.reject_immutable_row_mutation();

-- The runtime database role must be NOBYPASSRLS and must not be the postgres or
-- service_role account. Revoke direct browser DML; only the API runtime role may write.
REVOKE UPDATE, DELETE ON public.audit_logs, public.stock_movements FROM PUBLIC;
