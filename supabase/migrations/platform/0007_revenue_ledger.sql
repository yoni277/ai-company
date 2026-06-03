-- Phase 5A — Revenue ledger (ai_company schema)

create table if not exists ai_company.revenue_transactions (
  id            uuid primary key default gen_random_uuid(),
  project_slug  text not null,
  amount        numeric not null check (amount >= 0),
  currency      text not null default 'ILS',
  is_recurring  boolean not null default false,
  occurred_at   timestamptz not null default now(),
  source        text not null default 'ledger',
  created_at    timestamptz not null default now()
);

create index if not exists revenue_transactions_project_time
  on ai_company.revenue_transactions (project_slug, occurred_at desc);

alter table ai_company.revenue_transactions enable row level security;

drop policy if exists revenue_transactions_read on ai_company.revenue_transactions;
drop policy if exists revenue_transactions_write on ai_company.revenue_transactions;
create policy revenue_transactions_read on ai_company.revenue_transactions for select using (true);
create policy revenue_transactions_write on ai_company.revenue_transactions
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

grant all on ai_company.revenue_transactions to postgres, anon, authenticated, service_role;
