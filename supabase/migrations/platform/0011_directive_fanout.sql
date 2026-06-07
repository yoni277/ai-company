-- Directive fan-out: tie executive_reports back to a triggering directive,
-- track which executives a directive is meant to provoke, and record edits.

alter table ai_company.executive_reports
  add column if not exists source_directive_id uuid null
  references ai_company.ceo_directives(id) on delete set null;

create index if not exists executive_reports_by_directive
  on ai_company.executive_reports (source_directive_id, created_at desc)
  where source_directive_id is not null;

alter table ai_company.ceo_directives
  add column if not exists responding_executives text[] not null default '{}';

alter table ai_company.ceo_directives
  add column if not exists updated_at timestamptz not null default now();

-- Touch updated_at on every update.
create or replace function ai_company.touch_ceo_directives_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ceo_directives_set_updated_at on ai_company.ceo_directives;
create trigger ceo_directives_set_updated_at
  before update on ai_company.ceo_directives
  for each row execute function ai_company.touch_ceo_directives_updated_at();
