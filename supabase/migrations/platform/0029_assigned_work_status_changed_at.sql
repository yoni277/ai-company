-- EPIC-004A — Work Model Convergence (D079). Spec §4 Phase 2 / §7, AC13.
--
-- assigned_work.status_changed_at — powers AC13 "days in current state" (the
-- "what's stuck right now" management signal: Days Waiting / Days Blocked /
-- Days Waiting-for-CEO).
--
-- WHY a dedicated column (do not get this wrong): Created/Last-Updated/Age come
-- free from created_at/updated_at, but per-state duration needs WHEN the row
-- ENTERED its current state. updated_at is the *last* change of ANY field, not
-- the state-entry time — deriving "days blocked" from it is incorrect. Every
-- code path that changes approval_status OR execution_status stamps
-- status_changed_at = now() in the SAME write (app layer, deliberately NOT a
-- trigger — a trigger on updated_at can't tell a status change from any other
-- column change).
--
-- CUMULATIVE historical aging (total days ever blocked across the item's life)
-- needs a status-transition log — DEFERRED until volume justifies it; never
-- faked from updated_at. This column is the cheap additive now so we don't have
-- to backfill-guess later.
--
-- ADDITIVE ONLY. NOT NULL with a default; existing rows backfilled to their
-- created_at (their state has not changed since creation, so entry == birth).

alter table ai_company.assigned_work
  add column if not exists status_changed_at timestamptz not null default now();

-- Backfill existing rows: state-entry time is unknown but is at-or-after
-- creation; created_at is the only honest anchor (no transitions logged yet).
update ai_company.assigned_work
  set status_changed_at = created_at
  where status_changed_at > created_at;
