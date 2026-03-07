-- ============================================================
-- 004_projects.sql  –  Projekte
-- Run this in the Supabase SQL Editor after 003_invoices.sql
-- ============================================================

create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  object_id   uuid references public.objects(id) on delete set null,
  name        text not null,
  status      text not null default 'planung'
                check (status in ('planung','aktiv','abgeschlossen','pausiert','abgebrochen')),
  start_date  date,
  end_date    date,
  budget      numeric(12,2),
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- updated_at trigger
drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at
  before update on public.projects
  for each row execute procedure public.set_updated_at();

-- Link tasks → projects (adds project_id column to existing tasks table)
alter table public.tasks
  add column if not exists project_id uuid references public.projects(id) on delete set null;

-- RLS
alter table public.projects enable row level security;

create policy "company members can manage projects"
  on public.projects for all
  using (
    company_id = (
      select company_id from public.profiles where id = auth.uid()
    )
  );

-- Indexes
create index if not exists projects_company_status_idx on public.projects(company_id, status);
create index if not exists tasks_project_idx on public.tasks(project_id);
