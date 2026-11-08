# PARCHE v4.0.5 → v4.0.6

Fecha: 08/11/2026

## Objetivo
Actualizar el padrón de difusión con 50 contactos corporativos previamente validados, sin duplicar empresas ni sobrescribir contactos existentes.

## Archivos modificados
- `data/diffusion-recipients.json`
- `server/index.js`
- `src/App.jsx`
- `package.json`
- `package-lock.json`
- `tests/rebuild.test.js`

## Archivos nuevos
- `REVISION_4_0_6.md`
- `PARCHE_v4.0.5_a_v4.0.6.md`
- `AUDITORIA_v4.0.6.md`
- `VERIFICACION_POST_DEPLOY_v4.0.6.md`

## Criterio
No se agregan correos personales, automatismos, spam ni contactos corporativos antiguos no validados.


## Corrección de despliegue
- Se incluye explícitamente `index.html` con generación `BENEFICIOS_UIC_4060` para mantener sincronizada la validación de arranque del servidor con el frontend compilado.
