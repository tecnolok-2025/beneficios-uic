# Revisión 3.9.6 — Navegación y recuperación de pantalla

Fecha: 25/10/2026  
Generación: `BENEFICIOS_UIC_396`

## Objetivo

Eliminar la situación observada en Chrome donde la URL cambiaba correctamente —por ejemplo a `/difusion`— pero el contenido quedaba en blanco hasta que el usuario actualizaba manualmente la página o presionaba Enter sobre la dirección.

## Cambios realizados

1. **Navegación principal con carga completa**
   - `go()` utiliza `location.assign()` para Portal, Difusión, Administración y detalle de beneficios.
   - Si se intenta abrir nuevamente la misma ruta, utiliza `location.reload()`.
   - Se elimina la dependencia del evento SPA personalizado para pintar la vista.

2. **Protección contra BFCache**
   - `main.jsx` escucha `pageshow`.
   - Si Chrome restaura una página desde Back/Forward Cache (`event.persisted`), se fuerza una única recarga.

3. **Watchdog de arranque anterior a React**
   - Nuevo archivo `public/boot-recovery.js`.
   - Si después de unos segundos `#root` continúa vacío, elimina cachés y Service Workers antiguos y reintenta la misma ruta con un parámetro de recuperación.
   - Sólo se realiza un reintento automático por ruta dentro de la ventana de seguridad para evitar bucles.
   - Si el segundo intento tampoco pinta la interfaz, muestra una pantalla institucional con botones **Reintentar** y **Volver al Portal de Beneficios**.

4. **Error Boundary global**
   - Si React produce un error de renderizado, se muestra una pantalla de recuperación y se intenta una recarga controlada.

5. **Caché y versiones**
   - El servidor conserva `Cache-Control: no-store, no-cache, must-revalidate` para el HTML de las rutas.
   - Los assets compilados mantienen nombres versionados/hash de Vite.
   - Se continúa eliminando cualquier Service Worker legado.

## Alcance

Esta revisión **no modifica**:
- datos de beneficios;
- padrón de destinatarios;
- cuentas de empresas;
- permisos;
- configuración SMTP;
- cola de envíos;
- monitor;
- calendario mensual;
- flags de envío masivo.

## Comportamiento esperado

Al navegar entre las distintas pantallas, el contenido debe aparecer sin F5 ni Enter. Si por una condición de navegador la interfaz no logra montarse, el usuario verá una recuperación automática o una pantalla explicativa, pero no una página completamente blanca.
