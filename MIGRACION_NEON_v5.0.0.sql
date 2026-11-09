-- Beneficios UIC v5.0.0 · migración automática de almacenamiento sólo texto
-- Esta misma lógica está incorporada en server/schema.sql y se ejecuta al iniciar la versión.
-- Se conserva aquí únicamente como respaldo/auditoría.

DROP TABLE IF EXISTS diffusion_campaign_files;
DROP TABLE IF EXISTS flyers;
ALTER TABLE benefits DROP COLUMN IF EXISTS external_image_url;
ALTER TABLE benefits DROP COLUMN IF EXISTS external_image_alt;
