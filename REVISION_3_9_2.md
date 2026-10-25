# Revisión 3.9.2 · Difusión de Beneficios UIC

Fecha: 25/10/2026

## Alcance

Revisión funcional enfocada en navegación, permisos, configuración de correo y seguridad del piloto. No modifica el catálogo de 51 beneficios ni las 16 categorías.

## Cambios

1. Pestañas persistentes: Destinatarios, Validaciones y Correo emisor se cargan en segundo plano y no se desmontan al cambiar de sección.
2. Permisos: las herramientas administrativas quedan separadas del futuro acceso empresarial.
3. SMTP administrable: nueva tabla `diffusion_mail_settings` y pantalla para configurar/probar la casilla emisora. La clave queda cifrada con AES-256-GCM.
4. Remitente provisional: `tesoreria@uic-campana.com.ar`; futuro previsto: `beneficios@uic-campana.com.ar`.
5. Asunto fijo por servidor: `Nuevo beneficio exclusivo UIC · [empresa]`.
6. Prueba obligatoria antes de validación.
7. Modo piloto: validación devuelve la copia final al originador, pero no distribuye al padrón ni inicia cooldown mensual.
8. El envío masivo depende exclusivamente de `DIFFUSION_MASS_SEND_ENABLED=true`; por defecto queda `false`.
9. Nueva guía didáctica en la pantalla inicial “Elegí tu empresa”.
10. Mantenimiento institucional mejorado y página estática `public/maintenance.html`.

## Protección

La versión conserva la misma clave administrativa del Portal para acceder al piloto. Registro público de empresas y recuperación de contraseña continúan fuera de exposición.
