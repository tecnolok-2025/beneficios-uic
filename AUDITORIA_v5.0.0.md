# Auditoría v5.0.0 · Beneficios UIC

Fecha: 09/11/2026
Generación: `BENEFICIOS_UIC_5000`

## Resultado funcional

- Catálogo: 51 beneficios.
- Catálogo local sin `externalImageUrl`, `externalImageAlt` ni `flyers`.
- Se elimina del esquema Neon la posibilidad de guardar imágenes de beneficios: se quitan las columnas `external_image_url` y `external_image_alt`.
- Se eliminan las tablas binarias históricas `flyers` y `diffusion_campaign_files`.
- Administración conserva los endpoints históricos de flyers únicamente como respuesta 410 (función retirada), por compatibilidad y para impedir cargas antiguas.
- Difusión queda exclusivamente textual: cuerpo, firma y configuración de diseño.
- Los `.uicpub` nuevos guardan sólo texto/configuración y tienen límite reducido a 2 MB.
- Se eliminaron los archivos visuales históricos de `public/benefits/` porque ya no se referencian.
- Permanecen únicamente logos/recursos institucionales del portal; son archivos estáticos del servidor, no datos almacenados en Neon.

## Pie de correo

El correo incluye:

- `⚠️ Importante`: el correo se utiliza exclusivamente para difusión de beneficios UIC; no debe responderse directamente; las consultas deben dirigirse al prestador indicado en la firma.
- `👉 ¿Todavía no sos socio de la UIC?`: llamado comercial a asociarse.
- Enlace: `https://uic-campana.com.ar/hacete-socio/`.
- El texto no menciona Tesorería ni ninguna casilla emisora específica.

## Neon / consumo

- Se mantiene el criterio de Monitor manual de v4.0.7: sin polling periódico del frontend; las métricas se actualizan cuando se presiona `Actualizar`.
- La cola SMTP del servidor conserva su temporizador interno porque es necesaria para realizar los envíos y no es un refresco visual del Monitor.
- Se preservan destinatarios, bajas, campañas, trazabilidad, SMTP y controles de seguridad.
- Se preservan los 32 contactos incorporados en v4.0.8 y la regla de no reemplazar correos vigentes salvo corrección explícita por error real de envío.

## QA

- `npm test`: **143/143 PASS**.
- `node --check server/index.js`: PASS.
- Catálogo: **51/51** beneficios sin campos visuales.
- Build Vite local: no ejecutado porque este entorno no contiene `node_modules`/Vite. Render instalará dependencias con el flujo habitual antes del build.
