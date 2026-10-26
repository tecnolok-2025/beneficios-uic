# Beneficios UIC · Revisión v3.9.8.6

Fecha: 26/10/2026

## Objetivo

Completar la experiencia de Difusión de Beneficios con mejoras de identidad, seguridad, guardado local, validación administrativa, baja controlada, compatibilidad móvil de los correos y seguimiento integral de cada comunicación.

## Firma ampliada

La firma visible ahora permite editar:
- nombre;
- cargo / función;
- correo visible;
- teléfono visible;
- página web;
- logo de la empresa.

El logo se reduce y se muestra proporcionado, sin deformarse. Estos datos forman parte del archivo local `.uicpub`. El correo registrado de autenticación continúa separado y sigue siendo el destino de la prueba de identidad.

## Guardado local con selector

En navegadores compatibles de PC (Chrome/Edge), **Elegir dónde guardar .uicpub** abre el selector del sistema para elegir carpeta y nombre. Si el navegador no admite esa API, se utiliza la carpeta de descargas configurada. En ningún caso el archivo de trabajo se guarda en Neon.

## Validación más visible

Cuando la prueba y el código ya están verificados, el botón **Solicitar validación UIC** recibe un tratamiento visual amarillo con texto rojo para indicar claramente la próxima acción pendiente.

## Seguridad del padrón general

El envío general se presenta como una secuencia explícita de dos pasos:
1. salir deliberadamente de **Modo PRUEBA** escribiendo `SALIR DE PRUEBA`;
2. habilitar el padrón general escribiendo `HABILITAR`.

El padrón permanece bloqueado mientras Modo PRUEBA está activo. Reactivar Modo PRUEBA vuelve a bloquear automáticamente el padrón.

## Datos del firmante en Validaciones

La pantalla administrativa de validación muestra nombre, cargo, teléfono, correo y web del firmante. Cuando existen, ofrece accesos directos para llamada, WhatsApp, email y web.

## Baja con confirmación adicional

El correo real ya no muestra una baja de un solo toque. El enlace discreto **Preferencias de recepción / solicitar baja** abre una pantalla de confirmación donde el destinatario debe escribir `BAJA`. Esto reduce bajas accidentales y evita que robots de seguridad de correo ejecuten la baja al inspeccionar enlaces.

## Correos móviles

El HTML de correo incorpora reglas responsive específicas. En pantallas de hasta 600 px:
- las galerías de 2, 3 o 4 imágenes se convierten en una sola columna;
- las composiciones divididas también se apilan;
- las imágenes mantienen proporción y ancho máximo;
- se reducen márgenes laterales.

El objetivo es evitar imágenes superpuestas, recortadas o que requieran desplazamiento lateral en Gmail y otros clientes móviles.

## Monitor y trazabilidad de ciclo completo

El beneficiario puede seguir ahora una comunicación desde que envía la prueba, no sólo desde que UIC la autoriza. Los estados visibles incluyen:
- **PRUEBA ENVIADA**;
- **PRUEBA VERIFICADA**;
- **ESPERANDO VALIDACIÓN UIC**;
- **DEVUELTO POR UIC / REQUIERE CORRECCIÓN**;
- **AUTORIZADO · EN COLA**;
- **ENVIANDO**;
- **FINALIZADO**;
- **CANCELADO**.

Cada tarjeta muestra una línea de cinco etapas (Prueba → Código verificado → Validación UIC → Cola → Distribución) y los hitos con fecha/hora disponibles.

Una vez autorizado, conserva posición en cola, inicio/finalización estimados, enviados, pendientes, errores, aperturas detectadas, aperturas totales detectadas, tasa detectada, bajas confirmadas, última apertura detectada y próxima oportunidad mensual.

La trazabilidad individual por empresa/correo continúa reservada al administrador; el beneficiario recibe métricas agregadas.

## Consumo adaptativo de Neon

El monitor dejó de consultar cada 5 segundos de manera permanente:
- mientras hay una campaña `queued/sending`: actualización automática cada 15 segundos;
- mientras espera validación UIC (`pending`): cada 45 segundos;
- cuando sólo hay historial: no existe polling permanente y se ofrece **Actualizar estado**.

Además, el reinicio del servidor ya no elimina una instancia `draft` que tenga una prueba efectivamente enviada o verificada; sólo se purgan borradores operativos sin prueba.

## Acumulación

Esta revisión es acumulativa desde **v3.9.8.3** e incluye íntegramente v3.9.8.4 y v3.9.8.5.

## Validación

- `npm test`: **106/106 pruebas aprobadas**.
- `node --check server/index.js`: aprobado.
- Parseo de `src/App.jsx` con TypeScript 5.8.3 (`jsx: preserve`, `noEmit`, sin resolución externa): aprobado.
