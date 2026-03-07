-- ============================================================
-- 003_invoices.sql  –  Rechnungen & Positionen
-- Run this in the Supabase SQL Editor after 002_tasks.sql
-- ============================================================

create table if not exists public.invoices (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  customer_id    uuid references public.customers(id) on delete set null,
  invoice_number text not null,
  status         text not null default 'entwurf'
                   check (status in ('entwurf','gesendet','bezahlt','storniert')),
  issue_date     date not null default current_date,
  due_date       date,
  subtotal       numeric(12,2) not null default 0,
  tax_rate       numeric(5,2) not null default 20,
  tax_amount     numeric(12,2) not null default 0,
  total          numeric(12,2) not null default 0,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.invoice_items (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references public.invoices(id) on delete cascade,
  description  text not null,
  quantity     numeric(10,2) not null default 1,
  unit_price   numeric(12,2) not null default 0,
  total        numeric(12,2) not null default 0,
  sort_order   int not null default 0
);

-- updated_at trigger for invoices (reuses set_updated_at from 002_tasks.sql)
drop trigger if exists invoices_updated_at on public.invoices;
create trigger invoices_updated_at
  before update on public.invoices
  for each row execute procedure public.set_updated_at();

-- RLS
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

create policy "company members can manage invoices"
  on public.invoices for all
  using (
    company_id = (
      select company_id from public.profiles where id = auth.uid()
    )
  );

create policy "company members can manage invoice items"
  on public.invoice_items for all
  using (
    invoice_id in (
      select id from public.invoices
      where company_id = (
        select company_id from public.profiles where id = auth.uid()
      )
    )
  );

-- Indexes
create index if not exists invoices_company_status_idx on public.invoices(company_id, status);
create index if not exists invoices_due_date_idx on public.invoices(due_date);
create index if not exists invoice_items_invoice_idx on public.invoice_items(invoice_id, sort_order);
