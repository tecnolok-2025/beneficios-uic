# Auditoría técnica v3.9.8.2

## Resultado

**APROBADA para despliegue de prueba controlada.**

## Controles realizados

- `npm test`: **93/93 pruebas aprobadas**.
- `node --check server/index.js`: aprobado.
- Parseo JSX mediante TypeScript (`allowJs`, `jsx=preserve`, `noEmit`): aprobado.
- Migración Neon aditiva: `test_mode_enabled BOOLEAN NOT NULL DEFAULT TRUE`.
- Lista blanca de prueba verificada con exactamente tres correos.
- Doble bloqueo administrativo verificado: `SALIR DE PRUEBA` + `HABILITAR`.
- Worker verificado para comprobar nuevamente Modo PRUEBA antes del SMTP.
- Campos de contraseña auditados: no quedan inputs visibles `type="password"` fuera del componente reutilizable con ojo.
- Botón de Difusión de Beneficios conserva ubicación y aumenta jerarquía visual.

## Seguridad de distribución

La lógica es *fail-closed*: si el servidor no puede determinar de forma confiable el estado de Modo PRUEBA, lo considera activo.

La lista blanca de distribución autorizada en modo prueba es:

- `uic@uic-campana.com.ar`
- `nestor.manucci@gmail.com`
- `nestor.manucci@tecnolok.com.ar`

El padrón general sólo puede utilizarse cuando `test_mode_enabled = FALSE` **y** `mass_send_enabled = TRUE`.

## Observación sobre campañas ya enviadas

La versión evita nuevos envíos externos mientras Modo PRUEBA está activo. Como cualquier sistema de correo, no puede retirar mensajes que hayan sido entregados antes de instalar esta revisión. La trazabilidad histórica debe utilizarse para auditar campañas anteriores si existieran.

## Verificación adicional de entrega

- Auditoría manual de las llamadas SMTP: la distribución del padrón pasa por la cola; las pruebas de empresa se envían únicamente al correo propio de la empresa y la solicitud de validación únicamente a la casilla administrativa configurada.
- Parche aplicado sobre una copia limpia de v3.9.8.1: resultado idéntico a la versión completa.
- QA de la copia parcheada: **93/93 pruebas aprobadas** y `node --check server/index.js` aprobado.
- Parseo JSX final: aprobado.
- `npm ci --include=dev --ignore-scripts`: no pudo finalizar en este entorno dentro del límite disponible, por lo que `npm run build` no se marca como ejecutado localmente. Render debe realizar la instalación y compilación normales durante el deploy.
