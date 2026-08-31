# Beneficios UIC — nuevo proyecto 3.0.0

Reconstrucción completa del portal de beneficios. No reutiliza la portada, los componentes ni la hoja de estilos de las versiones anteriores.

## Qué conserva

- La base PostgreSQL existente de Neon.
- Los 24 beneficios, 10 rubros y 9 acuerdos nuevos.
- Los textos, contactos, flyers y ediciones administrativas guardados en Neon.
- Alta, edición, publicación, eliminación y carga de flyers.

## Qué reemplaza

- Toda la interfaz pública.
- Toda la navegación y arquitectura visual.
- El panel administrativo.
- El servidor de publicación y el control anticaché.

La generación se identifica como `BENEFICIOS_UIC_NUEVO_300`. El servidor no arranca si el frontend compilado no contiene esa marca.

El catálogo local es solamente un respaldo. Si `data/catalog.json` faltara, el servidor no se cae: continúa utilizando Neon.

La entrega `REPOSITORIO_ACTUAL` está preparada para sustituir todos los archivos del GitHub ya conectado al servicio `beneficios-uic` de Render, sin crear otro servicio ni cambiar la base.

## Desarrollo

```bash
npm install
npm run build
npm test
npm start
```
