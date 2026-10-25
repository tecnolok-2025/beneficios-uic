# Parche v3.9.6 → v3.9.7

Este parche reemplaza exclusivamente los archivos modificados para incorporar el **Constructor Visual UIC**.

## Archivos modificados / nuevos

- `AUDITORIA_v3.9.7.md`
- `INSTALACION_REPOSITORIO_ACTUAL.md`
- `PARCHE_v3.9.6_a_v3.9.7.md`
- `README.md`
- `REVISION_3_9_7.md`
- `index.html`
- `package-lock.json`
- `package.json`
- `server/index.js`
- `server/schema.sql`
- `src/App.jsx`
- `src/styles.css`
- `tests/rebuild.test.js`

## Alcance

- 8 plantillas visuales de email.
- Editor enriquecido por bloques.
- Pegado saneado con formato básico.
- Vista previa Escritorio / Celular.
- Máximo 4 imágenes, con reducción automática antes de subirlas.
- Render servidor con tablas HTML e inline styles.
- Persistencia `template_id` + `layout_json` en Neon.
- Compatibilidad de campañas históricas mediante fallback.
- Asistente de composición UIC.

## Seguridad

No habilita por sí mismo los envíos masivos y no modifica padrón, cuentas de empresa, claves, calendario mensual, cola ni monitor.

## Aplicación

Copiar el contenido del parche sobre la raíz del repositorio actual v3.9.6, conservando la estructura de carpetas, hacer commit/push y dejar que Render ejecute el build habitual.
