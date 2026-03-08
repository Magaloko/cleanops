-- ============================================================
-- 007_contracts.sql  –  Verträge (Service Contracts)
-- ============================================================

create table if not exists public.contracts (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  customer_id     uuid references public.customers(id) on delete set null,
  object_id       uuid references public.objects(id) on delete set null,
  title           text not null,
  status          text not null default 'entwurf'
                    check (status in ('entwurf','aktiv','gekündigt','abgelaufen')),
  start_date      date,
  end_date        date,
  monthly_value   numeric(12,2),
  billing_cycle   text not null default 'monatlich'
                    check (billing_cycle in ('monatlich','quartal','jährlich')),
  description     text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists contracts_updated_at on public.contracts;
create trigger contracts_updated_at
  before update on public.contracts
  for each row execute procedure public.set_updated_at();

alter table public.contracts enable row level security;

create policy "company members can manage contracts"
  on public.contracts for all
  using (company_id = (select company_id from public.profiles where id = auth.uid()));

create index if not exists contracts_company_status_idx on public.contracts(company_id, status);
