-- ================================================================
-- CLEANOPS – VOLLSTÄNDIGES DATENBANKSETUP
-- Einmaliger Befehl für alles. Sicher mehrfach ausführbar.
-- Supabase SQL Editor → New Query → Einfügen → Run
-- ================================================================

-- ── 1. HILFSFUNKTIONEN ──────────────────────────────────────────

-- updated_at automatisch setzen
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── 2. COMPANIES ────────────────────────────────────────────────

create table if not exists public.companies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

alter table public.companies enable row level security;
drop policy if exists "company members can read own company" on public.companies;
create policy "company members can read own company"
  on public.companies for select
  using (id = (select company_id from public.profiles where id = auth.uid()));

-- ── 3. PROFILES ─────────────────────────────────────────────────

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  full_name  text,
  role       text not null default 'admin',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
drop policy if exists "company members can read profiles" on public.profiles;
create policy "company members can read profiles"
  on public.profiles for select
  using (company_id = (select company_id from public.profiles p where p.id = auth.uid()));
drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- ── 4. AUTO-ERSTELLEN COMPANY + PROFILE BEI REGISTRIERUNG ──────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  new_company_id uuid;
begin
  -- Neue Firma erstellen
  insert into public.companies (name)
  values (coalesce(new.raw_user_meta_data->>'company_name', 'Meine Firma'))
  returning id into new_company_id;

  -- Profil erstellen
  insert into public.profiles (id, company_id, full_name, role)
  values (
    new.id,
    new_company_id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'admin')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Profil für bereits registrierte Nutzer ohne Profil erstellen
do $$
declare
  u record;
  cid uuid;
begin
  for u in select * from auth.users loop
    if not exists (select 1 from public.profiles where id = u.id) then
      insert into public.companies (name) values ('Meine Firma') returning id into cid;
      insert into public.profiles (id, company_id, full_name, role)
      values (u.id, cid, coalesce(u.raw_user_meta_data->>'full_name', u.email), 'admin');
    end if;
  end loop;
end $$;

-- ── 5. CUSTOMERS (Kunden) ────────────────────────────────────────

create table if not exists public.customers (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name       text not null,
  email      text,
  phone      text,
  address    text,
  city       text,
  status     text not null default 'lead'
               check (status in ('lead','aktiv','inaktiv')),
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists customers_updated_at on public.customers;
create trigger customers_updated_at
  before update on public.customers
  for each row execute procedure public.set_updated_at();

alter table public.customers enable row level security;
drop policy if exists "company members can manage customers" on public.customers;
create policy "company members can manage customers"
  on public.customers for all
  using (company_id = (select company_id from public.profiles where id = auth.uid()));

create index if not exists customers_company_idx on public.customers(company_id);

-- ── 6. OBJECTS (Objekte) ─────────────────────────────────────────

create table if not exists public.objects (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  name        text not null,
  address     text,
  city        text,
  area_m2     numeric(10,2),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists objects_updated_at on public.objects;
create trigger objects_updated_at
  before update on public.objects
  for each row execute procedure public.set_updated_at();

alter table public.objects enable row level security;
drop policy if exists "company members can manage objects" on public.objects;
create policy "company members can manage objects"
  on public.objects for all
  using (company_id = (select company_id from public.profiles where id = auth.uid()));

create index if not exists objects_company_idx on public.objects(company_id);

-- ── 7. PROJECTS (Projekte) ───────────────────────────────────────

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

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at
  before update on public.projects
  for each row execute procedure public.set_updated_at();

alter table public.projects enable row level security;
drop policy if exists "company members can manage projects" on public.projects;
create policy "company members can manage projects"
  on public.projects for all
  using (company_id = (select company_id from public.profiles where id = auth.uid()));

create index if not exists projects_company_status_idx on public.projects(company_id, status);

-- ── 8. TASKS (Aufgaben) ──────────────────────────────────────────

create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  object_id   uuid references public.objects(id) on delete set null,
  project_id  uuid references public.projects(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  title       text not null,
  description text,
  status      text not null default 'offen'
                check (status in ('offen','in_bearbeitung','erledigt','abgebrochen')),
  priority    text not null default 'mittel'
                check (priority in ('niedrig','mittel','hoch','dringend')),
  due_date    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.set_updated_at();

alter table public.tasks enable row level security;
drop policy if exists "company members can manage tasks" on public.tasks;
create policy "company members can manage tasks"
  on public.tasks for all
  using (company_id = (select company_id from public.profiles where id = auth.uid()));

create index if not exists tasks_company_status_idx on public.tasks(company_id, status);
create index if not exists tasks_project_idx on public.tasks(project_id);
create index if not exists tasks_due_date_idx on public.tasks(due_date);

-- ── 9. EMPLOYEES (Mitarbeiter) ───────────────────────────────────

create table if not exists public.employees (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  full_name    text not null,
  email        text,
  phone        text,
  position     text,
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

drop trigger if exists employees_updated_at on public.employees;
create trigger employees_updated_at
  before update on public.employees
  for each row execute procedure public.set_updated_at();

alter table public.employees enable row level security;
drop policy if exists "company members can manage employees" on public.employees;
create policy "company members can manage employees"
  on public.employees for all
  using (company_id = (select company_id from public.profiles where id = auth.uid()));

create index if not exists employees_company_status_idx on public.employees(company_id, status);

-- ── 10. INVOICES (Rechnungen) ────────────────────────────────────

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

drop trigger if exists invoices_updated_at on public.invoices;
create trigger invoices_updated_at
  before update on public.invoices
  for each row execute procedure public.set_updated_at();

alter table public.invoices      enable row level security;
alter table public.invoice_items enable row level security;

drop policy if exists "company members can manage invoices" on public.invoices;
create policy "company members can manage invoices"
  on public.invoices for all
  using (company_id = (select company_id from public.profiles where id = auth.uid()));

drop policy if exists "company members can manage invoice items" on public.invoice_items;
create policy "company members can manage invoice items"
  on public.invoice_items for all
  using (invoice_id in (
    select id from public.invoices
    where company_id = (select company_id from public.profiles where id = auth.uid())
  ));

create index if not exists invoices_company_status_idx on public.invoices(company_id, status);
create index if not exists invoice_items_invoice_idx on public.invoice_items(invoice_id, sort_order);

-- ── 11. QUOTES (Angebote) ────────────────────────────────────────

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

drop policy if exists "company members can manage quotes" on public.quotes;
create policy "company members can manage quotes"
  on public.quotes for all
  using (company_id = (select company_id from public.profiles where id = auth.uid()));

drop policy if exists "company members can manage quote items" on public.quote_items;
create policy "company members can manage quote items"
  on public.quote_items for all
  using (quote_id in (
    select id from public.quotes
    where company_id = (select company_id from public.profiles where id = auth.uid())
  ));

create index if not exists quotes_company_status_idx on public.quotes(company_id, status);
create index if not exists quote_items_quote_idx on public.quote_items(quote_id, sort_order);

-- ── 12. CONTRACTS (Verträge) ─────────────────────────────────────

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
drop policy if exists "company members can manage contracts" on public.contracts;
create policy "company members can manage contracts"
  on public.contracts for all
  using (company_id = (select company_id from public.profiles where id = auth.uid()));

create index if not exists contracts_company_status_idx on public.contracts(company_id, status);

-- ── 13. MATERIALS (Material / Lager) ────────────────────────────

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
drop policy if exists "company members can manage materials" on public.materials;
create policy "company members can manage materials"
  on public.materials for all
  using (company_id = (select company_id from public.profiles where id = auth.uid()));

create index if not exists materials_company_idx on public.materials(company_id);

-- ── 14. QUALITY CHECKS (Qualitätskontrolle) ─────────────────────

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
drop policy if exists "company members can manage quality checks" on public.quality_checks;
create policy "company members can manage quality checks"
  on public.quality_checks for all
  using (company_id = (select company_id from public.profiles where id = auth.uid()));

create index if not exists quality_checks_company_status_idx on public.quality_checks(company_id, status);
create index if not exists quality_checks_date_idx on public.quality_checks(check_date);

-- ── FERTIG ───────────────────────────────────────────────────────
-- Alle 14 Tabellen + RLS + Trigger wurden erfolgreich eingerichtet.
select
  schemaname,
  tablename,
  rowsecurity as rls_aktiv
from pg_tables
where schemaname = 'public'
  and tablename in (
    'companies','profiles','customers','objects','projects',
    'tasks','employees','invoices','invoice_items',
    'quotes','quote_items','contracts','materials','quality_checks'
  )
order by tablename;
