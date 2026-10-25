# Auditoría v3.9.2 · Difusión de Beneficios UIC

Fecha: 25/10/2026

## Base utilizada

- Fuente: `Beneficios_UIC_v3.9.1_COMPLETO_DIFUSION_PADRON.zip`.
- Catálogo preservado: 51 beneficios / 16 categorías.
- Padrón preservado: 94 socios activos + 23 contactos correspondientes a 19 empresas con convenio/no socias = 117 contactos.
- Empresas habilitadas según semilla actual: 109.

## Correcciones v3.9.2

1. **Navegación:** Destinatarios, Validaciones y Correo emisor permanecen montados en segundo plano. Cambiar de pestaña ya no desmonta el componente ni vuelve a consultar Neon desde cero.
2. **Permisos:** las pantallas Destinatarios, Validaciones y Correo emisor continúan detrás de la autenticación administrativa. El futuro acceso empresarial no deberá exponer esas herramientas.
3. **Empresa piloto:** TECNO LOGISTI-K SA continúa como única empresa habilitada para preparar difusión durante esta etapa.
4. **Correo emisor:** nueva pantalla administrativa SMTP con servidor, puerto, SSL/TLS, usuario, contraseña/clave de aplicación, remitente, nombre del remitente y destinatario de prueba.
5. **Seguridad de credencial SMTP:** la contraseña se almacena cifrada en Neon mediante AES-256-GCM. Se recomienda definir `DIFFUSION_MAIL_SECRET` en Render.
6. **Remitente provisional:** `tesoreria@uic-campana.com.ar`. El sistema admite reemplazo posterior por `beneficios@uic-campana.com.ar` sin cambios de código.
7. **Asunto inalterable:** se genera del lado servidor como `Nuevo beneficio exclusivo UIC · [empresa]`. El cliente no determina el asunto.
8. **Modo prueba obligatorio:** la solicitud de validación está bloqueada hasta que exista un `test_sent_at` exitoso.
9. **Piloto sin envíos masivos:** `DIFFUSION_MASS_SEND_ENABLED=false` mantiene cerrado el padrón general. La variable heredada `DIFFUSION_SEND_ENABLED` ya no puede habilitar por sí sola el envío masivo.
10. **Validación piloto:** al validar, el originador recibe la copia final como confirmación, pero el padrón general no recibe correos y no se inicia el cooldown mensual.
11. **Pantalla inicial:** “Elegí tu empresa” incorpora guía de siete pasos y explica expresamente que prueba previa es obligatoria.
12. **Mantenimiento:** se mejora el mensaje institucional y se incorpora `public/maintenance.html`.

## Base de datos

Migración aditiva. Se incorpora únicamente la tabla `diffusion_mail_settings`. No se elimina ni recrea ninguna tabla del catálogo, padrón, campañas, flyers o trazabilidad.

## QA ejecutado

- `node --check server/index.js`: APROBADO.
- `npm test`: **58/58 pruebas aprobadas**.
- Validación de catálogo: 51 beneficios / 16 categorías.
- Validación de padrón semilla: 117 contactos; 94 socios; 19 empresas convenio/no socias.
- Revisión de permisos: endpoints de Destinatarios, Validaciones y Correo emisor exigen `requireAdmin`.
- Revisión de asunto: generado en servidor y presentado `readOnly` en la interfaz.
- Revisión de envío masivo: requiere explícitamente `DIFFUSION_MASS_SEND_ENABLED=true`.

## Build local

Se intentó `npm ci --include=dev`, pero el entorno de trabajo no pudo completar la descarga de dependencias. `npm ci --offline` confirmó que `nodemailer-10.2.1.tgz` no estaba disponible en caché. Por esa razón **no se declara `npm run build` como aprobado localmente**.

Render conserva el flujo de build configurado: `npm ci --include=dev && npm run build`.

## Mantenimiento y caída total de Render

La v3.9.2 cubre la indisponibilidad de Neon mientras Render continúe ejecutándose y aporta una página estática de mantenimiento. Una caída total del servicio Render no puede mostrar una página alojada dentro del mismo Render; para cubrir ese escenario al 100% se requiere un fallback externo (por ejemplo Cloudflare) utilizando la página estática incluida.

## Estado de seguridad para instalación

- Prueba técnica de SMTP: habilitable después de configurar credenciales.
- Prueba de publicación: habilitable después de configurar credenciales.
- Solicitud de validación: habilitable sólo después de la prueba de publicación.
- Distribución masiva al padrón: **BLOQUEADA por defecto**.

## Empaquetado

- ZIP completo: estructura en raíz, sin carpeta exterior.
- Parche: probado sobre copia limpia de v3.9.1.
- Resultado del parche comparado contra la v3.9.2 completa: **idéntico**.
- Integridad ZIP (`unzip -tq`): aprobada en ambos archivos.
