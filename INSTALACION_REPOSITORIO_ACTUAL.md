# Instalación v3.9.4 en el repositorio y Render actuales

Esta entrega reemplaza v3.9.2 y conserva el servicio Render, la URL y la base PostgreSQL/Neon. La migración es **aditiva**: crea estructuras para cuentas de empresa, códigos temporales, baja de destinatarios, imágenes embebidas y control del modo masivo sin borrar el catálogo ni el padrón.

## GitHub / Render

1. Reemplazar el contenido del repositorio por el ZIP completo o aplicar el parche **sólo sobre v3.9.2**.
2. Mantener `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `IP_HASH_SALT` y las variables actuales.
3. Los comandos continúan siendo `npm ci --include=dev && npm run build` y `npm start`.
4. El arranque debe informar `Beneficios UIC NUEVO v3.9.4 · BENEFICIOS_UIC_394`.

## Variables de Difusión

Mantener durante el piloto:

```text
DIFFUSION_MASS_SEND_ENABLED=false
DIFFUSION_SEND_ENABLED=false
DIFFUSION_FROM_EMAIL=tesoreria@uic-campana.com.ar
DIFFUSION_FROM_NAME=Unión Industrial de Campana · Beneficios
DIFFUSION_APPROVAL_EMAIL=tesoreria@uic-campana.com.ar
DIFFUSION_MAIL_SECRET=<secreto estable, largo y privado>
```

`DIFFUSION_MAIL_SECRET` cifra la clave SMTP almacenada desde **Difusión > Correo emisor**. No debe guardarse en GitHub y no debe cambiarse después de guardar la clave SMTP, salvo que se vuelva a cargar esa configuración.

La dirección provisional de emisión y validación es `tesoreria@uic-campana.com.ar`. Cuando exista `beneficios@uic-campana.com.ar`, puede reemplazarse desde la configuración y la variable de aprobación. El correo institucional general UIC **no se usa para este circuito privado ni para identificar empresas**.

## Correo emisor

Desde **Difusión de Beneficios > Correo emisor** configurar SMTP, puerto, SSL/TLS, usuario, contraseña/clave de aplicación, remitente y dirección de prueba. Guardar y ejecutar primero **Enviar prueba técnica**.

## Registro de empresas

- El directorio de empresas es visible, pero no publica sus correos.
- Una empresa sólo puede registrarse con un correo ya asociado a ella en el padrón/convenio/contactos válidos.
- Si la empresa no tiene correo, el alta queda bloqueada y se indica contactar a Administración UIC.
- Si el correo no coincide, el sistema rechaza el alta sin revelar el correo correcto.
- Registro y recuperación usan códigos aleatorios de 6 dígitos con vencimiento.
- Las contraseñas se guardan únicamente como hash `scrypt`.

## Flujo de una difusión

1. Empresa ingresa con su propia cuenta.
2. Selecciona uno de sus beneficios.
3. Guarda el borrador.
4. Envía obligatoriamente una prueba a su propio correo registrado.
5. El correo de prueba contiene un código aleatorio de 6 dígitos.
6. La empresa copia el código en el portal. Sin código verificado no puede solicitar validación.
7. La solicitud llega al correo privado UIC de validación.
8. El administrador aprueba o rechaza en **Validaciones**.
9. Al aprobar, la empresa recibe primero la versión final como confirmación.
10. Si el modo masivo está deshabilitado, sólo TECNO LOGISTI-K SA actúa como destino piloto/control; no se distribuye al padrón general.
11. Si el administrador habilita masivos escribiendo `HABILITAR`, se distribuye al padrón activo, deduplicando correos.

La prueba y las validaciones piloto no consumen el cupo mensual. El plazo se registra únicamente después de una distribución real al padrón.

## Destinatarios y bajas

Cada empresa del padrón conserva su casilla **Recibe comunicaciones**. Los correos repetidos se deduplican en el momento del envío. Cada correo final incluye un enlace de baja; al utilizarlo queda registrado **Deshabilitado por el destinatario**. La baja no se revierte por una importación automática; sólo el administrador puede rehabilitarla explícitamente. TECNO LOGISTI-K SA permanece habilitada como destino de control.

## Imágenes y adjuntos

El cuerpo admite hasta 4 imágenes JPG/PNG embebidas, con recomendación de formato vertical. En forma separada se mantienen hasta 3 adjuntos JPG/PNG/PDF. El asunto es institucional y no puede ser modificado por la empresa.

## Navegación y mantenimiento

Las pestañas administrativas permanecen montadas para evitar la demora de recarga observada en v3.9.1. Si Neon no está disponible pero Render sigue ejecutándose, el módulo muestra mantenimiento institucional. Para una caída total de Render sigue siendo necesario configurar posteriormente el fallback externo en Cloudflare usando la página estática incluida.


### Prueba específica v3.9.4
1. Abrir `Difusión de Beneficios`.
2. Confirmar que aparezcan las opciones **Como administrador** y **Como beneficiario**.
3. Elegir beneficiario y verificar que se muestre la guía completa y el directorio sin solicitar `ADMIN_PASSWORD`.
4. Elegir TECNO LOGISTI-K SA y probar registro/ingreso con su correo autorizado.
5. Volver a **Cambiar tipo de acceso**, elegir administrador y comprobar que solicita la clave si la sesión administrativa fue cerrada.
6. Navegar Portal → Difusión → Portal varias veces y confirmar que ninguna pantalla requiera F5, Enter ni recarga manual.
