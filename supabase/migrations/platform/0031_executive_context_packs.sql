-- OF-007 Phase 2 — Executive Context Packs (D082). Spec:
-- docs/design/EPIC_CONTEXT_PACK_IMPL_SPEC.md §Persistence.
--
-- Inspectability + audit: every assembled ContextPack a consumer injects is
-- persisted here so the CEO can diagnose a bad executive call as wrong-context
-- vs wrong-reasoning vs missing-evidence.
--
-- ADDITIVE ONLY. NO FK on source_id (soft reference) — so disabling the feature
-- (CONTEXT_PACK_ENABLED off) needs ZERO schema rollback and never couples to the
-- originating row's lifecycle.

create table if not exists ai_company.executive_context_packs (
  id           uuid primary key default gen_random_uuid(),
  project_slug text not null,
  executive_id text not null,
  purpose      text not null,                 -- directive | meeting | instruction
  assembled_at timestamptz not null default now(),
  pack         jsonb not null,                -- the full ContextPack (facts + assumptions + rendered layers)
  source_kind  text,                          -- instruction | meeting | directive
  source_id    uuid,                          -- soft reference (NO FK) to the originating row
  created_at   timestamptz not null default now()
);

create index if not exists executive_context_packs_lookup
  on ai_company.executive_context_packs (project_slug, executive_id, assembled_at desc);

-- Platform convention (matches assigned_work / direct_instructions): RLS on,
-- read open, writes service-role only, grants to the standard roles.
alter table ai_company.executive_context_packs enable row level security;

drop policy if exists executive_context_packs_read on ai_company.executive_context_packs;
drop policy if exists executive_context_packs_write on ai_company.executive_context_packs;
create policy executive_context_packs_read on ai_company.executive_context_packs for select using (true);
create policy executive_context_packs_write on ai_company.executive_context_packs
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

grant all on ai_company.executive_context_packs
  to postgres, anon, authenticated, service_role;
