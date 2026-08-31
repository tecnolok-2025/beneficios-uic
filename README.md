# Beneficios UIC — nuevo proyecto 3.0.1

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
- El servidor de publicación y el control anticaché, incluyendo neutralización de service workers antiguos.

La generación se identifica como `BENEFICIOS_UIC_NUEVO_301`. El servidor no arranca si el frontend compilado no contiene esa marca.

El catálogo local es solamente un respaldo. Si `data/catalog.json` faltara, el servidor no se cae: continúa utilizando Neon.

La entrega `REPOSITORIO_ACTUAL` está preparada para sustituir todos los archivos del GitHub ya conectado al servicio `beneficios-uic` de Render, sin crear otro servicio ni cambiar la base.

## Desarrollo

```bash
npm install
npm run build
npm test
npm start
```

## Recuperación de caché heredada

La versión 3.0.1 incorpora un mecanismo de salida para instalaciones PWA antiguas. Las rutas `/sw.js`, `/service-worker.js`, `/serviceWorker.js` y `/serviceworker.js` entregan un worker de neutralización que borra cachés anteriores, toma control, se desregistra y fuerza una navegación de red.

Además, `/api/version` informa versión, generación y commit de Render sin depender de Neon. `/actualizar-version` mantiene la limpieza manual de registros y Cache Storage.
