-- 0032 — SEC-1 (S1/S5): lock ai_company down to non-anon roles; least-privilege app role.
--
-- AUTHORED BY BUILDER — NOT APPLIED. Cowork applies this against the shared
-- Supabase project, provisions the scoped-role JWT (SUPABASE_SCOPED_KEY), and
-- runs the isolation proofs (anon-key curl → 401 / 0 rows). Runtime/DB claims
-- are Cowork's, not the Builder's.
--
-- Problem (red-team S1): every ai_company table shipped `_read USING (true)`
-- AND `grant ... to anon`, and the app connects with the service-role key
-- (which bypasses RLS). So the public anon key — shipped to the browser as
-- NEXT_PUBLIC_SUPABASE_ANON_KEY — can SELECT every row IF ai_company is in
-- PostgREST's exposed schemas. This migration closes that at the privilege
-- layer (the real gate) and the policy layer (defense-in-depth).
--
-- ISOLATION MODEL (D088 Phase 0, Option 1): `project_id` is an INTRA-COMPANY
-- scope. Phase-0 isolation is "anon/unauthenticated cannot read project-owned
-- tables" — NOT cross-project invisibility. Multiple projects co-visible WITHIN
-- one instance is correct, not a leak. Cross-INSTANCE registry isolation is A1,
-- deferred to multi-instance / Stage-4 (it needs an instance_id the schema does
-- not yet carry; do not infer it from project_id).
--
-- Reversible: drop role ai_company_app + restore the prior using(true) policies.

-- 1) Least-privilege application role (S5) — replaces god-mode service-role for
--    app traffic. Unlike service_role, RLS APPLIES to this role, so a single
--    missing WHERE / app-layer bug cannot bypass row security. NOLOGIN: it is
--    assumed by PostgREST via a JWT whose `role` claim = 'ai_company_app'
--    (Cowork mints that JWT as SUPABASE_SCOPED_KEY).
do $$ begin
  create role ai_company_app nologin;
exception when duplicate_object then null; end $$;

-- PostgREST's authenticator must be allowed to switch into the app role.
do $$ begin
  grant ai_company_app to authenticator;
exception when undefined_object then
  -- 'authenticator' may not exist outside Supabase's managed Postgres; ignore
  -- in plain environments. Cowork's Supabase has it.
  null;
end $$;

-- 2) Lock the schema down: anon + public cannot reach ai_company at all (S1).
--    Privilege revocation gates BEFORE RLS — anon with no table SELECT grant
--    gets "permission denied" (401/empty) regardless of any USING(true) policy.
revoke usage on schema ai_company from anon, public;
revoke all on all tables in schema ai_company from anon, public;
revoke all on all sequences in schema ai_company from anon, public;
revoke all on all functions in schema ai_company from anon, public;
alter default privileges in schema ai_company revoke all on tables from anon, public;
alter default privileges in schema ai_company revoke all on sequences from anon, public;

-- 3) Grant the app role least privilege (full CRUD WITHIN RLS + grants; never
--    god-mode). Service-role retains access as the transition fallback.
grant usage on schema ai_company to ai_company_app;
grant select, insert, update, delete on all tables in schema ai_company to ai_company_app;
grant usage, select on all sequences in schema ai_company to ai_company_app;
alter default privileges in schema ai_company
  grant select, insert, update, delete on tables to ai_company_app;
alter default privileges in schema ai_company
  grant usage, select on sequences to ai_company_app;

-- 4) Replace the `USING (true)` read policies + service-role-only write policies
--    with role-scoped ones (defense-in-depth on top of the grant lockdown).
--    Generic + idempotent: every RLS-enabled ai_company table gets the SAME
--    uniform pair the codebase already used (read = any non-anon trusted role;
--    write = service_role or the scoped app role). anon is excluded everywhere.
do $$
declare
  t record;
  pol record;
begin
  for t in
    select c.relname as tablename
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'ai_company' and c.relkind = 'r' and c.relrowsecurity = true
  loop
    -- Drop every existing policy on the table (they were uniform using(true)
    -- read + service_role write); we recreate the hardened uniform pair.
    for pol in
      select policyname from pg_policies
      where schemaname = 'ai_company' and tablename = t.tablename
    loop
      execute format('drop policy if exists %I on ai_company.%I', pol.policyname, t.tablename);
    end loop;

    execute format(
      'create policy %I on ai_company.%I for select using (auth.role() in (''authenticated'', ''service_role'', ''ai_company_app''))',
      t.tablename || '_read_nonanon', t.tablename
    );
    execute format(
      'create policy %I on ai_company.%I for all using (auth.role() in (''service_role'', ''ai_company_app'')) with check (auth.role() in (''service_role'', ''ai_company_app''))',
      t.tablename || '_write_app', t.tablename
    );
  end loop;
end $$;

-- 5) Operator note (Cowork): confirm PostgREST "Exposed schemas" and that the
--    anon role's default grants are not re-added by a later table migration.
--    Proof (S1): with the ANON key,
--      curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/revenue_transactions?select=*" \
--        -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Accept-Profile: ai_company"
--    must return 401 / permission denied / [] — not row data.
