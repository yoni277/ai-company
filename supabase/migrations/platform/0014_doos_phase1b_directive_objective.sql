-- Phase 1B — Directive Traceability
-- Connect Objective → Directive. Nullable initially so existing directives
-- remain unlinked until CEO explicitly designates an objective for them.
-- Phase 2+ may flip to NOT NULL after backfill.

alter table ai_company.ceo_directives
  add column if not exists objective_id uuid
  references ai_company.objectives(id) on delete set null;

create index if not exists ceo_directives_by_objective
  on ai_company.ceo_directives (objective_id)
  where objective_id is not null;
