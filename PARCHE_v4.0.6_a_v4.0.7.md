# PARCHE v4.0.6 → v4.0.7

Cambio acotado al Monitor y control de consumo Neon.

Archivos funcionales modificados:
- `src/App.jsx`
- `server/index.js`
- `index.html`
- `package.json`
- `package-lock.json`
- `tests/rebuild.test.js`

Comportamiento:
- Sin refresco automático ni polling.
- `Aperturas totales` se calcula sólo al presionar manualmente Actualizar.
- La consulta es agregada y no crea almacenamiento adicional en Neon.
