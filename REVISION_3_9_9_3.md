# Revisión 3.9.9.3 — optimización de consumo Neon

## Diagnóstico
El límite alcanzado fue Network Transfer, no almacenamiento. Se identificaron dos fuentes principales de transferencia evitable:
1. Flyers públicos almacenados como BYTEA y servidos desde Neon en cada visita.
2. Archivos de campaña (imágenes, logo y adjuntos) releídos desde Neon para cada destinatario durante la cola de envío.

## Cambios
- Imágenes públicas desde `/public/benefits` cuando existe `external_image_url`.
- Caché de catálogo público 5 minutos.
- Caché en memoria por campaña para medios de difusión.
- Limpieza automática segura de binarios históricos.
- Pruebas operativas abandonadas >7 días se eliminan; el respaldo permanente es el archivo local `.uicpub`.
- Endpoint de auditoría de almacenamiento para administrador.

## Seguridad de datos
No se eliminan campañas `pending`, `queued` ni `sending`. No se altera el padrón ni la base de beneficios.
