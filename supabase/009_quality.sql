-- ============================================================
-- 009_quality.sql  –  Qualitätskontrolle
-- ============================================================

create table if not exists public.quality_checks (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  object_id    uuid references public.objects(id) on delete set null,
  inspector_id uuid references public.employees(id) on delete set null,
  title        text not null,
  check_date   date not null default current_date,
  rating       int check (rating between 1 and 5),
  status       text not null default 'geplant'
                 check (status in ('geplant','bestanden','nacharbeit','nicht_bestanden')),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists quality_checks_updated_at on public.quality_checks;
create trigger quality_checks_updated_at
  before update on public.quality_checks
  for each row execute procedure public.set_updated_at();

alter table public.quality_checks enable row level security;

create policy "company members can manage quality checks"
  on public.quality_checks for all
  using (company_id = (select company_id from public.profiles where id = auth.uid()));

create index if not exists quality_checks_company_status_idx on public.quality_checks(company_id, status);
create index if not exists quality_checks_date_idx on public.quality_checks(check_date);
