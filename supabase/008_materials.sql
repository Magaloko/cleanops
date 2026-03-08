-- ============================================================
-- 008_materials.sql  –  Material / Lagerbestand
-- ============================================================

create table if not exists public.materials (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  name           text not null,
  category       text,
  unit           text not null default 'Stück',
  stock_quantity numeric(10,2) not null default 0,
  min_quantity   numeric(10,2) not null default 0,
  unit_price     numeric(10,2),
  supplier       text,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

drop trigger if exists materials_updated_at on public.materials;
create trigger materials_updated_at
  before update on public.materials
  for each row execute procedure public.set_updated_at();

alter table public.materials enable row level security;

create policy "company members can manage materials"
  on public.materials for all
  using (company_id = (select company_id from public.profiles where id = auth.uid()));

create index if not exists materials_company_idx on public.materials(company_id);
