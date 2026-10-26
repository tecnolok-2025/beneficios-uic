# Beneficios UIC v3.9.8.1

## Objetivo
Cerrar el circuito profesional de Difusión de Beneficios incorporando edición de datos autogenerados, trazabilidad de aperturas por campaña, baja visible para el destinatario, identidad gráfica de Beneficios UIC y un intervalo mínimo de 45 segundos entre correos.

## Cambios principales
- La franja institucional y el nombre visible de la empresa se autocompletan pero pueden editarse antes de guardar el borrador. La edición afecta sólo la presentación del correo; no altera el padrón ni la identidad administrativa.
- La franja azul incorpora a la derecha el logo de Beneficios UIC como imagen CID embebida en el correo.
- El correo de prueba muestra la opción `NO QUIERO RECIBIR MÁS ESTOS CORREOS` en modo visual no operativo. En el envío real el botón queda activo y deshabilita futuros envíos para ese destinatario.
- Cada correo real incorpora un píxel individual de trazabilidad. Se registran primera apertura detectada, última apertura detectada y cantidad de aperturas observadas.
- El monitor muestra enviados, pendientes, errores, aperturas detectadas, porcentaje de apertura y bajas.
- El modo administrador incorpora detalle por campaña con empresa, dirección de correo, estado, primera apertura, cantidad de aperturas y fecha de baja.
- Se utiliza expresamente la denominación `apertura detectada` y no `lectura confirmada`, porque los clientes de correo pueden bloquear, cachear o precargar imágenes.
- `DIFFUSION_SEND_INTERVAL_MS` tiene ahora un piso técnico de 45.000 ms. Aunque Render conserve por error un valor menor, el servidor no enviará a una frecuencia superior a un correo cada 45 segundos.

## Base de datos
Migración aditiva, sin borrado de información:
- `diffusion_campaign_queue_recipients.first_opened_at`
- `diffusion_campaign_queue_recipients.last_opened_at`
- `diffusion_campaign_queue_recipients.open_count`
- `diffusion_campaign_queue_recipients.unsubscribed_at`

## Privacidad
La empresa beneficiaria visualiza métricas agregadas de su campaña. El detalle de correos y empresas destinatarias queda reservado al administrador UIC.

## Compatibilidad
Se mantienen las ocho plantillas de la v3.9.7, registro de empresa, prueba, código de seis dígitos, validación UIC, cola durable, cancelación, calendario mensual y padrón existente.
