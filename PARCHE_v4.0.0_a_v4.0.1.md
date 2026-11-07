# Parche Beneficios UIC v4.0.0 → v4.0.1

Este parche corrige integralmente la visibilidad y permisos del Monitor de envíos.

No requiere migración de Neon ni modifica el padrón, los beneficios, las campañas existentes o el manual PDF v4.0.0.

## Instalación
Copiar el contenido del parche sobre el repositorio v4.0.0, reemplazando los archivos indicados, y desplegar normalmente en Render.

## Archivos modificados
- `src/App.jsx`
- `src/styles.css`
- `server/index.js`
- `package.json`
- `package-lock.json`
- `index.html`
- `tests/rebuild.test.js`
- `README.md`

## Archivos nuevos
- `REVISION_4_0_1.md`
- `PARCHE_v4.0.0_a_v4.0.1.md`

### Validación ágil
- Acceso directo desde el correo de Tesorería a la ficha pública del beneficio.
- Acceso directo desde el mismo correo a **Difusión > Administrador > Validaciones**, focalizando la campaña pendiente.
- Botón **Ver beneficio publicado** dentro de cada validación.
