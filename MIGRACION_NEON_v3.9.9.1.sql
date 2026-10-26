-- Beneficios UIC v3.9.9.1
-- Amplía la clasificación interna de destinatarios sin borrar registros existentes.
ALTER TABLE diffusion_recipients
  DROP CONSTRAINT IF EXISTS diffusion_recipients_source_type_check;

ALTER TABLE diffusion_recipients
  ADD CONSTRAINT diffusion_recipients_source_type_check
  CHECK (source_type IN ('socio','socio_confirmar','convenio','manual'));

-- Controles posteriores sugeridos
SELECT COUNT(*) AS contactos_registrados FROM diffusion_recipients;
SELECT COUNT(DISTINCT LOWER(TRIM(email))) AS correos_unicos_habilitados
FROM diffusion_recipients
WHERE enabled=TRUE AND email_valid=TRUE AND COALESCE(TRIM(email),'')<>'' AND opted_out_at IS NULL;
SELECT source_type, COUNT(*) AS cantidad
FROM diffusion_recipients
GROUP BY source_type
ORDER BY source_type;
