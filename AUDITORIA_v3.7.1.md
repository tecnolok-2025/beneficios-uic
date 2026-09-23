# Auditoría Beneficios UIC v3.7.1

- Base funcional: v3.7.0.
- Versión técnica corregida: `3.7.1`.
- Generación: `BENEFICIOS_UIC_371`.
- Catálogo: **48 beneficios**.
- Categorías: **15**.
- Corrección principal: estabilidad Render / Neon y migraciones aditivas faltantes.

## Hallazgo técnico
El modelo utiliza `start_date` y `end_date` en las consultas de inicialización, pero una base Neon creada por revisiones anteriores podía no incorporar esas columnas si la tabla `benefits` ya existía, porque `CREATE TABLE IF NOT EXISTS` no modifica tablas preexistentes. La v3.7.1 agrega migraciones explícitas con `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

También se agregó un manejador de errores del pool PostgreSQL y un respaldo de lectura con el catálogo local para que una desconexión temporal de Neon no finalice el proceso Node ni deje sin respuesta el health check.

## Seguridad de datos
No hay `DROP`, `TRUNCATE` ni reemplazo destructivo de tablas.
