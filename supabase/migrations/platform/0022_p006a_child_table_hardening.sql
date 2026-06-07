-- P006A — Child-table hardening.
--
-- Doctrine (Chief Architect 2026-06-06):
--   Apply the same explicit-governance rules to metrics, risks, opportunities
--   that P006 applied to projects, but RESPECT the distinct shapes:
--     - Metrics are time-series; append-only is correct. Add provenance only.
--     - Risks + Opportunities are entities; fingerprint dedup required.
--
-- For all three tables: recorded_by NOT NULL, backfill 'pre-p006a'.
-- For risks + opportunities: fingerprint + generation + unique
-- (project_id, fingerprint) — same pattern as P005A task_proposals.

-- ---------- project_metrics: provenance only ----------
alter table ai_company.project_metrics
  add column if not exists recorded_by text;

update ai_company.project_metrics
  set recorded_by = 'pre-p006a'
  where recorded_by is null;

alter table ai_company.project_metrics
  alter column recorded_by set not null;

create index if not exists project_metrics_by_recorded_by
  on ai_company.project_metrics (recorded_by, timestamp desc);

-- ---------- risks: provenance + fingerprint + generation ----------
alter table ai_company.risks
  add column if not exists recorded_by text,
  add column if not exists fingerprint text,
  add column if not exists generation int not null default 1;

-- Backfill recorded_by from existing `source` column (the connector or
-- executive that created the row). Falls back to 'pre-p006a' when source
-- is somehow missing.
update ai_company.risks
  set recorded_by = coalesce(nullif(trim(source), ''), 'pre-p006a')
  where recorded_by is null;

-- Backfill fingerprint deterministically so the new unique index can apply.
-- Mirrors the application-layer hash:
--   sha256(project_id|recorded_by|severity|normalize(description))
update ai_company.risks
  set fingerprint = encode(
    sha256(
      (project_id::text
        || '|' || recorded_by
        || '|' || severity::text
        || '|' || lower(regexp_replace(coalesce(description, ''), '\s+', ' ', 'g'))
      )::bytea
    ),
    'hex'
  )
  where fingerprint is null;

alter table ai_company.risks
  alter column recorded_by set not null,
  alter column fingerprint set not null;

-- Dedup any pre-existing duplicates (older row wins, newer is removed) so
-- the unique index can be created.
delete from ai_company.risks r1
  using ai_company.risks r2
 where r1.project_id = r2.project_id
   and r1.fingerprint = r2.fingerprint
   and r1.created_at > r2.created_at;

create unique index if not exists risks_fingerprint
  on ai_company.risks (project_id, fingerprint);

create index if not exists risks_by_recorded_by
  on ai_company.risks (recorded_by, created_at desc);

-- ---------- opportunities: provenance + fingerprint + generation ----------
alter table ai_company.opportunities
  add column if not exists recorded_by text,
  add column if not exists fingerprint text,
  add column if not exists generation int not null default 1;

update ai_company.opportunities
  set recorded_by = coalesce(nullif(trim(source), ''), 'pre-p006a')
  where recorded_by is null;

-- Fingerprint shape:
--   sha256(project_id|recorded_by|priority|normalize(description))
update ai_company.opportunities
  set fingerprint = encode(
    sha256(
      (project_id::text
        || '|' || recorded_by
        || '|' || priority::text
        || '|' || lower(regexp_replace(coalesce(description, ''), '\s+', ' ', 'g'))
      )::bytea
    ),
    'hex'
  )
  where fingerprint is null;

alter table ai_company.opportunities
  alter column recorded_by set not null,
  alter column fingerprint set not null;

delete from ai_company.opportunities o1
  using ai_company.opportunities o2
 where o1.project_id = o2.project_id
   and o1.fingerprint = o2.fingerprint
   and o1.created_at > o2.created_at;

create unique index if not exists opportunities_fingerprint
  on ai_company.opportunities (project_id, fingerprint);

create index if not exists opportunities_by_recorded_by
  on ai_company.opportunities (recorded_by, created_at desc);
