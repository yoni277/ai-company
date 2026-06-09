-- L30 — Executive Meeting MVP (D070/D074, Architect D075).
-- Spec: docs/design/CEO_OPERABILITY_DATA_MODEL.md §2.
--
-- meetings (v1, additive evolution via jsonb) + meeting_type_configs, seeded
-- with 9 reusable meeting-type primitives (extends D070's 4). Adding a type is
-- a config row, NOT code. Meeting work items flow into ai_company.assigned_work
-- (source_type='meeting', approval_status='proposed') — the CEO approval gate.
--
-- The 9 seed types are business-agnostic primitives (cloneability): no vendor,
-- channel, or instance name appears here.
--
-- ADDITIVE ONLY. No ALTER/DROP on existing DOOS tables.

do $$ begin
  create type ai_company.meeting_status as enum
    ('scheduled', 'open', 'in_discussion', 'summarized', 'approved', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

-- Type catalog first (meetings.type FKs to it).
create table if not exists ai_company.meeting_type_configs (
  type                 text primary key,
  label                text not null,
  default_participants text[] not null,
  default_agenda       jsonb not null default '[]',
  required_outputs     jsonb not null default '{}',
  description          text
);

create table if not exists ai_company.meetings (
  id            uuid primary key default gen_random_uuid(),
  -- Instance scope (#2).
  project_slug  text not null references ai_company.project_definitions(slug),
  type          text not null references ai_company.meeting_type_configs(type),
  topic         text not null,

  -- Optional links to a broader objective / originating directive (Architect).
  objective_id  uuid,
  directive_id  uuid,

  initiator              text not null default 'ceo',
  moderator_executive_id text not null default 'chief-of-staff',
  participants           text[] not null,

  status        ai_company.meeting_status not null default 'scheduled',

  -- Structured, evolving parts (jsonb so they learn from real use).
  agenda         jsonb not null default '[]',
  evidence_pack  jsonb not null default '[]',
  -- [{round, executive_id, kind:'position|challenge|rebuttal', text, refs[]}]
  discussion     jsonb not null default '[]',
  summary        text,
  -- [{decision, rationale, dissenting_opinions[]}]
  decisions      jsonb not null default '[]',
  risks          jsonb not null default '[]',
  open_questions jsonb not null default '[]',

  -- CEO approval gate.
  approved_by   text,
  approved_at   timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index if not exists meetings_by_project_status
  on ai_company.meetings (project_slug, status);

create index if not exists meetings_by_type
  on ai_company.meetings (type, created_at desc);

drop trigger if exists meetings_set_updated_at on ai_company.meetings;
create trigger meetings_set_updated_at
  before update on ai_company.meetings
  for each row execute function ai_company.touch_doos_updated_at();

-- ---------------------------------------------------------------------------
-- Seed the 9 reusable meeting-type primitives. Idempotent (on conflict).
-- go_no_go carries a Verdict ∈ {GO,HOLD,NO-GO} + owner + rationale + MANDATORY
-- dissenting opinions (ties to D068 evidence-first).
-- ---------------------------------------------------------------------------
insert into ai_company.meeting_type_configs
  (type, label, default_participants, default_agenda, required_outputs, description)
values
  ('strategic', 'Strategic Review',
   array['chief-of-staff','cto','cfo','vp-marketing','vp-sales'],
   '["Context & objective","Options on the table","Trade-offs & risks","Recommendation"]'::jsonb,
   '{"decision":"required","rationale":"required","dissenting_opinions":"required","next_steps":"required"}'::jsonb,
   'Cross-functional strategic decision (e.g. hero selection, direction).'),

  ('weekly_business_review', 'Weekly Business Review',
   array['chief-of-staff','coo','vp-marketing','vp-sales','cfo'],
   '["Metrics review","Wins","Blockers","Focus for the week"]'::jsonb,
   '{"summary":"required","risks":"required","actions":"required"}'::jsonb,
   'Recurring operating cadence: where the business stands and what moves next.'),

  ('go_no_go', 'Go / No-Go',
   array['chief-of-staff','cto','cfo'],
   '["Readiness","Evidence review","Open risks","Verdict"]'::jsonb,
   '{"verdict":["GO","HOLD","NO-GO"],"owner":"required","rationale":"required","dissenting_opinions":"required"}'::jsonb,
   'Launch / release gate. Verdict GO|HOLD|NO-GO with mandatory dissent.'),

  ('product_review', 'Product Review',
   array['chief-of-staff','cto','vp-marketing'],
   '["Scope","Feasibility","User experience","Risks"]'::jsonb,
   '{"decisions":"required","risks":"required","actions":"required"}'::jsonb,
   'Review a product surface or feature before committing build.'),

  ('architecture_review', 'Architecture Review',
   array['cto','chief-of-staff'],
   '["Design","Trade-offs","Cloneability / boundary","Risks & tech debt"]'::jsonb,
   '{"decisions":"required","risks":"required","tech_debt":"optional"}'::jsonb,
   'Technical design + platform-boundary review.'),

  ('risk_review', 'Risk Review',
   array['chief-of-staff','coo','cfo','cto'],
   '["Open risks","Severity","Mitigations","Owners"]'::jsonb,
   '{"risks":"required","mitigations":"required","owners":"required"}'::jsonb,
   'Standing review of open risks and their mitigation owners.'),

  ('incident_response', 'Incident Response',
   array['chief-of-staff','cto','coo'],
   '["Impact","Root cause","Mitigation","Comms"]'::jsonb,
   '{"summary":"required","root_cause":"required","actions":"required","owners":"required"}'::jsonb,
   'Fast-turnaround response to a live incident.'),

  ('budget_review', 'Budget Review',
   array['chief-of-staff','cfo','coo'],
   '["Spend","ROI","Allocation","Runway"]'::jsonb,
   '{"decisions":"required","reallocations":"optional","rationale":"required"}'::jsonb,
   'Capital allocation and spend discipline.'),

  ('executive_hiring', 'Executive Hiring',
   array['chief-of-staff','cfo'],
   '["Role & mandate","Candidates","Trade-offs","Decision"]'::jsonb,
   '{"decision":"required","rationale":"required","dissenting_opinions":"required"}'::jsonb,
   'Add or change an AI executive role (charter + mandate).')
on conflict (type) do nothing;

-- ---------------------------------------------------------------------------
-- RLS + grants (match the DOOS convention).
-- ---------------------------------------------------------------------------
alter table ai_company.meeting_type_configs enable row level security;
drop policy if exists meeting_type_configs_read on ai_company.meeting_type_configs;
drop policy if exists meeting_type_configs_write on ai_company.meeting_type_configs;
create policy meeting_type_configs_read on ai_company.meeting_type_configs for select using (true);
create policy meeting_type_configs_write on ai_company.meeting_type_configs
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
grant all on ai_company.meeting_type_configs
  to postgres, anon, authenticated, service_role;

alter table ai_company.meetings enable row level security;
drop policy if exists meetings_read on ai_company.meetings;
drop policy if exists meetings_write on ai_company.meetings;
create policy meetings_read on ai_company.meetings for select using (true);
create policy meetings_write on ai_company.meetings
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
grant all on ai_company.meetings
  to postgres, anon, authenticated, service_role;
