# Parche v3.9.4 → v3.9.5

Aplicar únicamente sobre una instalación v3.9.4.

## Cambios incluidos

- versión/generación `3.9.5` / `BENEFICIOS_UIC_395`;
- cola durable por destinatario;
- monitor por empresa con refresco automático;
- cancelación de campañas en cola o en curso;
- estimación de inicio/finalización;
- calendario mensual fijo por beneficio;
- meses no acumulativos;
- recuperación de cola después de reinicios;
- nueva variable opcional `DIFFUSION_SEND_INTERVAL_MS`.

## Seguridad

Mantener `DIFFUSION_MASS_SEND_ENABLED=false` durante el piloto. Con ese valor, TECNO LOGISTI-K SA continúa siendo el único destino de control de la cola.

La actualización de Neon es aditiva y se ejecuta desde `server/schema.sql` al iniciar.
