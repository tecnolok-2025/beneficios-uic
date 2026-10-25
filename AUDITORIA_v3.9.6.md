# Auditoría técnica — Beneficios UIC v3.9.6

Fecha: 25/10/2026  
Versión: `3.9.6`  
Generación: `BENEFICIOS_UIC_396`

## Motivo de la revisión

Se recibió evidencia de una pantalla completamente blanca al navegar a `/difusion` desde Chrome. La URL cambiaba correctamente, pero la vista podía no pintarse hasta una actualización manual. Una verificación independiente del despliegue v3.9.5 mostró que `/difusion` sí podía renderizar correctamente desde una sesión nueva, por lo que la revisión se enfoca en navegación, caché/BFCache y recuperación del frontend.

## Cambios auditados

- Navegación principal con `location.assign()` y `location.reload()` en lugar de depender de un evento SPA personalizado.
- Protección `pageshow`/BFCache.
- Error Boundary global alrededor de `App`.
- Watchdog de arranque externo `public/boot-recovery.js`, cargado antes del módulo React.
- Limpieza automática de Service Workers y Cache Storage legados sólo cuando la interfaz queda vacía.
- Reintento automático único por ruta; prevención de bucles mediante `sessionStorage`.
- Pantalla institucional de recuperación si el segundo intento tampoco logra montar la interfaz.
- HTML de rutas conservado con `Cache-Control: no-store, no-cache, must-revalidate` en el servidor.

## Pruebas realizadas

- `node --test`: **74/74 pruebas aprobadas**.
- `node --check server/index.js`: aprobado.
- `node --check public/boot-recovery.js`: aprobado.
- Versión de `package.json`: `3.9.6`.
- Generación de servidor e HTML: `BENEFICIOS_UIC_396`.
- Catálogo sin cambios funcionales respecto de v3.9.5.
- Padrón, permisos, SMTP, cola, monitor y calendario mensual no modificados en esta revisión.

## Compilación local

Se intentó `npm ci --offline --include=dev`, pero el entorno local no posee en caché el paquete `nodemailer-10.2.1.tgz`; por eso no fue posible ejecutar `npm run build` localmente. El repositorio conserva el flujo de Render `npm ci --include=dev && npm run build`.

## Riesgo residual

La corrección apunta al caso observado de navegación/caché. La validación definitiva del síntoma debe hacerse después del despliegue en el mismo Chrome donde se produjo la pantalla blanca, recorriendo Portal → Difusión → Beneficiario/Administrador → Volver → Atrás del navegador. La v3.9.6 incorpora recuperación automática para que, aun ante un fallo de montaje, el usuario no quede frente a una pantalla vacía.
