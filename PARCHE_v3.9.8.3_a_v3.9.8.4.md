# Parche v3.9.8.3 → v3.9.8.4

Reemplazar los archivos incluidos en el parche conservando la misma estructura de carpetas.

Archivos modificados:
- `src/App.jsx`
- `src/styles.css`
- `server/index.js`
- `index.html`
- `package.json`
- `package-lock.json`
- `README.md`
- `INSTALACION_REPOSITORIO_ACTUAL.md`
- `tests/rebuild.test.js`

El parche no modifica `data/diffusion-config.json`: la empresa piloto y los destinatarios de control siguen configurados internamente. La v3.9.8.4 únicamente evita que las entidades `testMode` sean expuestas en el listado público y elimina sus nombres de los textos públicos.
