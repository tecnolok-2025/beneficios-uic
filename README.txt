PARCHE BENEFICIOS UIC v4.0.1 — MANUAL INTEGRADO

Aplicar sobre la v4.0.1 actualmente desplegada, conservando la estructura de carpetas.

Incluye:
- src/App.jsx: botón y menú móvil apuntan a Beneficios UIC v4.0.1.pdf.
- public/Beneficios UIC v4.0.1.pdf: manual actualizado con Monitor de envíos del usuario.
- tests/rebuild.test.js: validación automática actualizada.
- REVISION_4_0_1.md: registro del cambio.

Opcional: eliminar public/Beneficios UIC v4.0.0.pdf del repositorio para evitar conservar una copia obsoleta. El portal ya no enlaza a ese archivo.

Luego hacer deploy normal en Render. El build de Render recompila el frontend.
