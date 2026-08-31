# Recuperación de versión 3.0.1

1. Reemplazar el contenido del repositorio actual por esta entrega y confirmar en `main`.
2. Render debe ejecutar `npm ci --include=dev && npm run build` y luego `npm start`.
3. Verificar `/api/version`: debe responder versión `3.0.1` y generación `BENEFICIOS_UIC_NUEVO_301`.
4. Verificar `/api/health`: debe mostrar 24 publicados, 24 activos y 10 categorías cuando Neon contiene el catálogo esperado.
5. Abrir `/actualizar-version` una vez en navegadores que hayan usado versiones PWA anteriores.
6. La entrega publica kill-switches en `/sw.js`, `/service-worker.js`, `/serviceWorker.js` y `/serviceworker.js` para retirar workers heredados y borrar Cache Storage.

No borrar Neon. No cambiar `DATABASE_URL`. No crear otro servicio Render.
