# Instalación v3.9.2 en el repositorio y Render actuales

Esta entrega reemplaza el código de v3.9.1 y conserva el servicio Render, la URL y la base Neon. La migración es aditiva.

## GitHub / Render

1. Reemplazar el contenido del repositorio por el ZIP completo o aplicar el parche sobre v3.9.1.
2. Mantener `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET` y las variables actuales.
3. Los comandos siguen siendo `npm ci --include=dev && npm run build` y `npm start`.
4. El arranque debe informar `Beneficios UIC NUEVO v3.9.2 · BENEFICIOS_UIC_392`.

## Seguridad del correo

Mantener expresamente:

```text
DIFFUSION_MASS_SEND_ENABLED=false
DIFFUSION_SEND_ENABLED=false
DIFFUSION_APPROVAL_EMAIL=uic@uic-campana.com.ar
DIFFUSION_MAIL_SECRET=<secreto estable y largo>
```

`DIFFUSION_MAIL_SECRET` se usa para cifrar la contraseña SMTP guardada desde la pantalla **Difusión > Correo emisor**. No guardar ese secreto en GitHub.

La casilla provisoria a configurar desde el panel es `tesoreria@uic-campana.com.ar`. En el futuro puede sustituirse por `beneficios@uic-campana.com.ar` sin modificar código.

La configuración SMTP puede ingresarse desde **Correo emisor**: servidor, puerto, SSL/TLS, usuario, contraseña/clave de aplicación, remitente y correo de prueba. Guardar primero y luego ejecutar **Enviar prueba técnica**.

## Flujo piloto v3.9.2

- Sólo el administrador puede entrar al módulo durante esta etapa.
- Sólo TECNO LOGISTI-K SA tiene habilitado **Preparar difusión**.
- El asunto no es editable: `Nuevo beneficio exclusivo UIC · TECNO LOGISTI-K SA`.
- Guardar borrador → enviar prueba al originador → revisar → solicitar validación UIC.
- Sin prueba exitosa no se habilita la solicitud de validación.
- Al validar, el originador recibe la copia final como confirmación.
- Mientras `DIFFUSION_MASS_SEND_ENABLED=false`, no se envía nada al padrón y no corre el plazo mensual.

## Navegación

Las pestañas **Empresas y beneficios**, **Destinatarios**, **Validaciones** y **Correo emisor** permanecen montadas en segundo plano. Esto evita volver a consultar Neon al cambiar de una a otra y corrige la demora observada en v3.9.1.

## Mantenimiento

Si Neon no está disponible pero Render continúa ejecutándose, Difusión muestra una pantalla institucional de mantenimiento sin exponer errores técnicos. Se incluye además `/maintenance.html`.

Una caída completa de Render no puede ser resuelta por una página alojada en el mismo Render. Para cubrir ese caso al 100% se deberá configurar posteriormente un fallback externo (por ejemplo Cloudflare) apuntando a la página estática incluida en esta entrega.
