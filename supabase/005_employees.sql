-- ============================================================
-- 005_employees.sql  –  Mitarbeiter
-- Run this in the Supabase SQL Editor after 004_projects.sql
-- ============================================================
-- Note: employees is separate from auth profiles.
-- Workers often don't need app access — they just get scheduled.
-- A profile_id link can be added later for app-login workers.
-- ============================================================

create table if not exists public.employees (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  full_name    text not null,
  email        text,
  phone        text,
  position     text,                        -- job title, e.g. "Reinigungskraft"
  status       text not null default 'aktiv'
                 check (status in ('aktiv','urlaub','krank','inaktiv')),
  hourly_rate  numeric(8,2),
  start_date   date,
  address      text,
  city         text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- updated_at trigger
drop trigger if exists employees_updated_at on public.employees;
create trigger employees_updated_at
  before update on public.employees
  for each row execute procedure public.set_updated_at();

-- RLS
alter table public.employees enable row level security;

create policy "company members can manage employees"
  on public.employees for all
  using (
    company_id = (
      select company_id from public.profiles where id = auth.uid()
    )
  );

-- Index
create index if not exists employees_company_status_idx on public.employees(company_id, status);
