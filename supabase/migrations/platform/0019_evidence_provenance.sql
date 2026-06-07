-- P007 — Evidence Engine: provenance + factual evidence kinds.
--
-- Doctrine: evidence must be factual (not interpretive), every record must
-- carry source + actor provenance, and the kind owns its tier (no operator
-- override). Builds on the existing ai_company.evidence_tokens table from
-- migration 0013_doos_phase1a_foundation.sql.
--
-- Chief Architect modifications applied:
--   - `other` replaces `unspecified` and is intentionally visible as
--     classification debt (the UI surfaces it loudly).
--   - `metric_snapshot` replaces `metric_observed` (snapshots are objective;
--     "observed" invites interpretation).
--   - Kind owns tier — the API derives tier from evidence_kind; no operator
--     override path exists.
--   - evidenceHash reserved for future dedup (cheap to add now, expensive
--     later).

-- New columns. All have defaults so existing rows remain valid; tightening
-- created_by to NOT NULL is the only behavioral change for legacy rows.
alter table ai_company.evidence_tokens
  add column if not exists source_kind text not null default 'manual',
  add column if not exists source_ref text,
  add column if not exists evidence_kind text not null default 'other',
  add column if not exists evidence_hash text;

-- Backfill any null created_by rows with 'pre-p007' so NOT NULL is safe to
-- apply. Same pattern as P006 / migration 0018.
update ai_company.evidence_tokens
  set created_by = 'pre-p007'
  where created_by is null;

alter table ai_company.evidence_tokens
  alter column created_by set not null;

create index if not exists evidence_by_kind
  on ai_company.evidence_tokens (evidence_kind, created_at desc);

-- evidence_hash index is partial (only indexed when set) — saves space and
-- the column is reserved/optional at v1.
create index if not exists evidence_by_hash
  on ai_company.evidence_tokens (evidence_hash) where evidence_hash is not null;
