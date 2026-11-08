# Auditoría completa - Beneficios UIC v4.0.3

## Hallazgo principal
Los logs de Render demostraron que v4.0.2 fue desplegada correctamente (`beneficios-uic@4.0.2` / `BENEFICIOS_UIC_4020`). Sin embargo, los PDF de control aportados corresponden al portal público y a fichas de beneficios. En esa superficie no existía un acceso visible llamado **Monitor de envíos**: el Monitor estaba dentro del circuito de Difusión y del panel autenticado de beneficiario.

## Hallazgos técnicos
- Producción sirve `dist/` generado por Vite; `src/` no se sirve directamente.
- El parche v4.0.2 sí contenía `src/App.jsx` y `src/styles.css` con el Monitor.
- El endpoint de empresa ya estaba correctamente aislado: `/api/difusion/company/monitor` usa `req.companySession.companyKey` y no acepta elegir otra empresa.
- El deep link `modo=beneficiario` no era interpretado por la pantalla principal de Difusión.
- `boot-recovery.js` conservaba la generación histórica `396`.
- El portal público no tenía botón Monitor, que es la pantalla desde la cual se estaba verificando visualmente.

## Corrección v4.0.3
- Botón **Monitor de envíos** en portada pública.
- Botón Monitor en menú móvil.
- Deep link `/difusion?modo=beneficiario&vista=monitor` abre el flujo beneficiario.
- Botón **Ingresar al Monitor de envíos** después de seleccionar empresa y antes de login.
- Tras login, panel abre en Monitor por defecto.
- Monitor muestra sólo campañas de la empresa autenticada.
- Administración mantiene trazabilidad individual y acciones críticas.
- Anticaché actualizado a `403` y `boot-recovery.js?v=4030`.
- Manual v4.0.3 integrado.
- Sin migración Neon.

## Verificación
- 136/136 pruebas automáticas correctas.
- `node --check server/index.js` correcto.
- Manual Word/PDF renderizado y revisado en 22 páginas.
- La instalación local de dependencias Vite no pudo completarse dentro del tiempo del entorno, por lo que no se afirma un build local de `dist`; Render ejecutará el `buildCommand` definido en `render.yaml` (`npm ci --include=dev && npm run build`).
