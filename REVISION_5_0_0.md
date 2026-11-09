# Revisión 5.0.0 · Difusión y Portal sólo texto

## Objetivo
Reducir al mínimo el almacenamiento en Neon y simplificar la comunicación por correo.

## Cambios
- Se elimina del Portal de Beneficios la carga y visualización de flyers/material visual.
- Se eliminan de Difusión imágenes embebidas, logos de empresa y archivos adjuntos almacenados en Neon.
- En el arranque de v5.0.0 se eliminan las tablas binarias históricas `flyers` y `diffusion_campaign_files`.
- Se eliminan físicamente de Neon los campos `external_image_url` y `external_image_alt`.
- Los archivos locales `.uicpub` pasan a contener sólo texto y configuración de diseño.
- El pequeño logo institucional UIC del encabezado del email sigue saliendo desde el servidor y no ocupa Neon.
- Se incorpora al pie del email una advertencia genérica ⚠️ para no responder directamente al correo de difusión de beneficios y contactar al prestador según los datos de la firma.
- Se incorpora una llamada 👉 **Hacete socio** con enlace a https://uic-campana.com.ar/hacete-socio/.

## Seguridad
No se alteran destinatarios, campañas, bajas, trazabilidad, SMTP, contraseñas ni reglas de validación.
