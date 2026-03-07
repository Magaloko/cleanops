-- ============================================================
-- 002_tasks.sql  –  Tasks / Aufgaben
-- Run this in the Supabase SQL Editor after 001_core_schema.sql
-- ============================================================

create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  object_id    uuid references public.objects(id) on delete set null,
  assigned_to  uuid references public.profiles(id) on delete set null,
  title        text not null,
  description  text,
  status       text not null default 'offen'
                 check (status in ('offen','in_bearbeitung','erledigt','abgebrochen')),
  priority     text not null default 'mittel'
                 check (priority in ('niedrig','mittel','hoch','dringend')),
  due_date     date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.set_updated_at();

-- RLS
alter table public.tasks enable row level security;

create policy "company members can manage tasks"
  on public.tasks for all
  using (
    company_id = (
      select company_id from public.profiles where id = auth.uid()
    )
  );

-- Index for common queries
create index if not exists tasks_company_status_idx on public.tasks(company_id, status);
create index if not exists tasks_due_date_idx on public.tasks(due_date);
