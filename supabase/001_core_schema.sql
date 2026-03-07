-- ============================================================
-- CleanOps Core Schema — in Supabase SQL Editor ausführen
-- supabase.com → Projekt → SQL Editor → New query → Paste → Run
-- ============================================================

-- Companies (Mandanten)
CREATE TABLE IF NOT EXISTS companies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id),
  role       text NOT NULL DEFAULT 'admin',
  full_name  text,
  email      text,
  created_at timestamptz DEFAULT now()
);

-- Customers (Kunden / CRM)
CREATE TABLE IF NOT EXISTS customers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) NOT NULL,
  name       text NOT NULL,
  email      text,
  phone      text,
  address    text,
  city       text,
  status     text NOT NULL DEFAULT 'lead' CHECK (status IN ('lead','aktiv','inaktiv')),
  notes      text,
  created_at timestamptz DEFAULT now()
);

-- Objects (Objekte / Einsatzorte)
CREATE TABLE IF NOT EXISTS objects (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid REFERENCES companies(id) NOT NULL,
  customer_id  uuid REFERENCES customers(id) ON DELETE SET NULL,
  name         text NOT NULL,
  address      text,
  city         text,
  area_m2      numeric,
  gps_lat      numeric,
  gps_lng      numeric,
  gps_radius_m int DEFAULT 100,
  notes        text,
  created_at   timestamptz DEFAULT now()
);

-- Services (Dienstleistungskatalog)
CREATE TABLE IF NOT EXISTS services (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid REFERENCES companies(id) NOT NULL,
  name           text NOT NULL,
  description    text,
  unit           text DEFAULT 'pauschal',
  price_per_unit numeric DEFAULT 0,
  created_at     timestamptz DEFAULT now()
);

-- ============================================================
-- RLS aktivieren
-- ============================================================
ALTER TABLE companies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE objects    ENABLE ROW LEVEL SECURITY;
ALTER TABLE services   ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (id = auth.uid());

CREATE POLICY "companies_own" ON companies
  FOR ALL USING (id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "customers_company" ON customers
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "objects_company" ON objects
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "services_company" ON services
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================================
-- Trigger: Auto-create profile + company bei erstem Login
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_company_id uuid;
BEGIN
  INSERT INTO companies (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'Meine Firma'))
  RETURNING id INTO new_company_id;

  INSERT INTO profiles (id, company_id, role, email, full_name)
  VALUES (
    NEW.id,
    new_company_id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Bestehenden User nachträglich mit Profil versehen (einmalig)
-- Führe dies aus NACHDEM obiges Schema erstellt wurde
-- ============================================================
DO $$
DECLARE
  u RECORD;
  cid uuid;
BEGIN
  FOR u IN SELECT * FROM auth.users LOOP
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = u.id) THEN
      INSERT INTO companies (name) VALUES ('Meine Firma') RETURNING id INTO cid;
      INSERT INTO profiles (id, company_id, role, email, full_name)
      VALUES (u.id, cid, 'admin', u.email, split_part(u.email, '@', 1));
    END IF;
  END LOOP;
END;
$$;
