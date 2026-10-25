CREATE TABLE IF NOT EXISTS benefits (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  partner TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'activo',
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  summary TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  concrete_benefit TEXT NOT NULL DEFAULT '',
  costs_discounts TEXT NOT NULL DEFAULT '',
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  scope TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  company_contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_date DATE,
  end_date DATE,
  agreement_url TEXT NOT NULL DEFAULT '',
  agreement_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  external_image_url TEXT NOT NULL DEFAULT '',
  external_image_alt TEXT NOT NULL DEFAULT '',
  analysis_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flyers (
  id BIGSERIAL PRIMARY KEY,
  benefit_id BIGINT NOT NULL REFERENCES benefits(id) ON DELETE CASCADE,
  url TEXT NOT NULL DEFAULT '',
  alt_text TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  image_data BYTEA,
  mime_type TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS traces (
  id BIGSERIAL PRIMARY KEY,
  benefit_id BIGINT REFERENCES benefits(id) ON DELETE SET NULL,
  benefit_slug TEXT NOT NULL,
  benefit_title TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL DEFAULT 'vista',
  ip_masked TEXT NOT NULL DEFAULT '',
  ip_hash TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT 'No disponible',
  region TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  device TEXT NOT NULL DEFAULT '',
  browser TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE benefits ADD COLUMN IF NOT EXISTS costs_discounts TEXT NOT NULL DEFAULT '';
ALTER TABLE benefits ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE benefits ADD COLUMN IF NOT EXISTS company_contacts JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE benefits ADD COLUMN IF NOT EXISTS agreement_url TEXT NOT NULL DEFAULT '';
ALTER TABLE benefits ADD COLUMN IF NOT EXISTS agreement_links JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE benefits ADD COLUMN IF NOT EXISTS external_image_url TEXT NOT NULL DEFAULT '';
ALTER TABLE benefits ADD COLUMN IF NOT EXISTS external_image_alt TEXT NOT NULL DEFAULT '';
ALTER TABLE benefits ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE benefits ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE benefits ADD COLUMN IF NOT EXISTS analysis_warnings JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE flyers ADD COLUMN IF NOT EXISTS url TEXT;
UPDATE flyers SET url='' WHERE url IS NULL;
ALTER TABLE flyers ALTER COLUMN url SET DEFAULT '';
ALTER TABLE flyers ALTER COLUMN url SET NOT NULL;
ALTER TABLE flyers ADD COLUMN IF NOT EXISTS alt_text TEXT;
UPDATE flyers SET alt_text='' WHERE alt_text IS NULL;
ALTER TABLE flyers ALTER COLUMN alt_text SET DEFAULT '';
ALTER TABLE flyers ALTER COLUMN alt_text SET NOT NULL;
ALTER TABLE flyers ADD COLUMN IF NOT EXISTS position INTEGER;
UPDATE flyers SET position=0 WHERE position IS NULL;
ALTER TABLE flyers ALTER COLUMN position SET DEFAULT 0;
ALTER TABLE flyers ALTER COLUMN position SET NOT NULL;
ALTER TABLE flyers ADD COLUMN IF NOT EXISTS image_data BYTEA;
ALTER TABLE flyers ADD COLUMN IF NOT EXISTS mime_type TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS traces_created_idx ON traces(created_at DESC);

-- v3.9.1 · Difusión de Beneficios (piloto administrativo)
CREATE TABLE IF NOT EXISTS diffusion_recipients (
  id BIGSERIAL PRIMARY KEY,
  source_key TEXT UNIQUE NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('socio','convenio','manual')),
  member_number TEXT NOT NULL DEFAULT '',
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  cuit TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  active_code TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_valid BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diffusion_campaigns (
  id BIGSERIAL PRIMARY KEY,
  company_key TEXT NOT NULL,
  company_name TEXT NOT NULL,
  benefit_slug TEXT NOT NULL,
  benefit_title TEXT NOT NULL,
  originator_name TEXT NOT NULL DEFAULT '',
  originator_email TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body_markup TEXT NOT NULL DEFAULT '',
  font_family TEXT NOT NULL DEFAULT 'Arial',
  font_size TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'draft',
  safety_status TEXT NOT NULL DEFAULT 'pending',
  safety_notes TEXT NOT NULL DEFAULT '',
  test_sent_at TIMESTAMPTZ,
  approval_requested_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  next_allowed_at TIMESTAMPTZ,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  content_deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diffusion_campaign_files (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT NOT NULL REFERENCES diffusion_campaigns(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  file_data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS diffusion_recipients_type_idx ON diffusion_recipients(source_type, company_name);
CREATE INDEX IF NOT EXISTS diffusion_campaigns_status_idx ON diffusion_campaigns(status, created_at DESC);
CREATE INDEX IF NOT EXISTS diffusion_campaigns_benefit_idx ON diffusion_campaigns(company_key, benefit_slug, sent_at DESC);

-- v3.9.2 · configuración segura del correo emisor de Difusión de Beneficios
CREATE TABLE IF NOT EXISTS diffusion_mail_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  smtp_host TEXT NOT NULL DEFAULT 'smtp.gmail.com',
  smtp_port INTEGER NOT NULL DEFAULT 465,
  smtp_secure BOOLEAN NOT NULL DEFAULT TRUE,
  smtp_user TEXT NOT NULL DEFAULT '',
  smtp_password_encrypted TEXT NOT NULL DEFAULT '',
  from_email TEXT NOT NULL DEFAULT 'tesoreria@uic-campana.com.ar',
  from_name TEXT NOT NULL DEFAULT 'Unión Industrial de Campana · Beneficios',
  test_recipient TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO diffusion_mail_settings (id, from_email)
VALUES (1, 'tesoreria@uic-campana.com.ar')
ON CONFLICT (id) DO NOTHING;
