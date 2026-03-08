-- ============================================================
-- 006_quotes.sql  –  Angebote & Angebotspositionen
-- ============================================================

create table if not exists public.quotes (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  customer_id    uuid references public.customers(id) on delete set null,
  quote_number   text not null,
  status         text not null default 'entwurf'
                   check (status in ('entwurf','gesendet','akzeptiert','abgelehnt','abgelaufen')),
  issue_date     date not null default current_date,
  valid_until    date,
  subtotal       numeric(12,2) not null default 0,
  tax_rate       numeric(5,2) not null default 20,
  tax_amount     numeric(12,2) not null default 0,
  total          numeric(12,2) not null default 0,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.quote_items (
  id           uuid primary key default gen_random_uuid(),
  quote_id     uuid not null references public.quotes(id) on delete cascade,
  description  text not null,
  quantity     numeric(10,2) not null default 1,
  unit_price   numeric(12,2) not null default 0,
  total        numeric(12,2) not null default 0,
  sort_order   int not null default 0
);

drop trigger if exists quotes_updated_at on public.quotes;
create trigger quotes_updated_at
  before update on public.quotes
  for each row execute procedure public.set_updated_at();

alter table public.quotes      enable row level security;
alter table public.quote_items enable row level security;

create policy "company members can manage quotes"
  on public.quotes for all
  using (company_id = (select company_id from public.profiles where id = auth.uid()));

create policy "company members can manage quote items"
  on public.quote_items for all
  using (quote_id in (
    select id from public.quotes
    where company_id = (select company_id from public.profiles where id = auth.uid())
  ));

create index if not exists quotes_company_status_idx on public.quotes(company_id, status);
create index if not exists quote_items_quote_idx on public.quote_items(quote_id, sort_order);
