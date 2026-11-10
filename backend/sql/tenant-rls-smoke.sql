-- Executed by CI after generating/applying the canonical Prisma schema and tenant RLS policies.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'edsec_runtime') THEN
    CREATE ROLE edsec_runtime LOGIN PASSWORD 'ci-only-password' NOBYPASSRLS;
  END IF;
END $$;
GRANT USAGE ON SCHEMA public TO edsec_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO edsec_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO edsec_runtime;

INSERT INTO public.user_profiles (id, auth_user_id, email, full_name, created_at, updated_at)
VALUES
 ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','owner-a@example.test','Owner A',now(),now()),
 ('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','owner-b@example.test','Owner B',now(),now());

INSERT INTO public.businesses (id, name, slug, created_at, updated_at)
VALUES
 ('33333333-3333-4333-8333-333333333333','Tenant A','tenant-a',now(),now()),
 ('44444444-4444-4444-8444-444444444444','Tenant B','tenant-b',now(),now());

INSERT INTO public.roles (id, business_id, code, name, is_system)
VALUES
 ('55555555-5555-4555-8555-555555555555','33333333-3333-4333-8333-333333333333','OWNER','Owner',true),
 ('66666666-6666-4666-8666-666666666666','44444444-4444-4444-8444-444444444444','OWNER','Owner',true);

INSERT INTO public.business_members (id, business_id, user_id, role_id, status, created_at)
VALUES
 ('77777777-7777-4777-8777-777777777777','33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','55555555-5555-4555-8555-555555555555','ACTIVE',now()),
 ('88888888-8888-4888-8888-888888888888','44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222','66666666-6666-4666-8666-666666666666','ACTIVE',now());

SET ROLE edsec_runtime;
SELECT set_config('app.user_id','11111111-1111-4111-8111-111111111111',false);
SELECT set_config('app.business_id','33333333-3333-4333-8333-333333333333',false);

DO $$
DECLARE visible_businesses integer;
BEGIN
  SELECT count(*) INTO visible_businesses FROM public.businesses;
  IF visible_businesses <> 1 THEN
    RAISE EXCEPTION 'Tenant isolation failed: expected 1 visible business, got %', visible_businesses;
  END IF;

  BEGIN
    INSERT INTO public.products (id,business_id,name,selling_price_minor,currency_code)
    VALUES ('99999999-9999-4999-8999-999999999999','44444444-4444-4444-8444-444444444444','Cross-tenant write',100,'NGN');
    RAISE EXCEPTION 'Tenant isolation failed: cross-tenant product insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL; -- Expected PostgreSQL RLS rejection.
  END;
END $$;

RESET ROLE;
